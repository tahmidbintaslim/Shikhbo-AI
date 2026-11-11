// src/app/api/teach/route.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { HfInference } from "@huggingface/inference";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { CHAT_KEY_NAMES, createOptional, readServiceConfig } from "@/lib/config";
import { getModelConfig } from "@/lib/models";
import { createRateLimiter } from "@/lib/rate-limit";
import { buildCentrePrompt, parseCentreRequest, splitCoverage } from "@/lib/centre";
import { RETRIEVAL_TOP_K, formatContext, retrieveContext } from "@/lib/retrieval";
import { StoreError, createStore } from "@/lib/store";
import {
  buildSystemPrompt,
  errorSummary,
  getCacheKey,
  getClientIp,
  hashKey,
  parseTeachRequest,
  stripEmoji,
  stripThinkBlocks,
  type ChatTurn,
} from "@/lib/teach";
import { MAX_BODY_CHARS } from "@/lib/teach-limits";

// Answer cache: Supabase through the store when configured, else this
// process's memory (a development fallback; serverless instances don't share it).
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedResponse(key: string): Promise<string | null> {
    try {
        if (store) return await store.cacheGet(key);
        const cached = responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.response;
        if (cached) responseCache.delete(key); // Expired
        return null;
    } catch (error) {
        console.warn(`[teach] cache read failed: ${errorSummary(error)}`);
        return null;
    }
}

async function setCachedResponse(key: string, response: string): Promise<void> {
    try {
        if (store) {
            await store.cacheSet(key, response, CACHE_TTL / 1000);
        } else {
            responseCache.set(key, { response, timestamp: Date.now() });
        }
    } catch (error) {
        console.warn(`[teach] cache write failed: ${errorSummary(error)}`);
    }
}

// ---------------------------------------------------------
// 1. SETUP CLIENTS
// ---------------------------------------------------------
// Every client is optional: a missing or malformed setting disables that
// service (logged once, by name) instead of failing the module load.
const config = readServiceConfig();
for (const problem of config.problems) console.error(`[config] ${problem}`);
const models = getModelConfig();

// A. Store (supabase/functions/shikhbo-api): textbook pages, answer cache, shared rate limit
const store = config.store ? createStore(config.store) : null;
const rateLimiter = createRateLimiter(store);

// B. Hugging Face: the second chat provider
const hfKey = config.hfKey;
const hf = hfKey ? createOptional("Hugging Face", "HF_API_KEY", () => new HfInference(hfKey)) : null;

// C. Chat providers
const openrouterKey = config.openrouterKey;
const openrouter = openrouterKey
    ? createOptional("OpenRouter", "OPENROUTER_API_KEY", () => createOpenRouter({ apiKey: openrouterKey }))
    : null;

const groqKey = config.groqKey;
const groq = groqKey
    ? createOptional("Groq", "GROQ_API_KEY", () => createGroq({ apiKey: groqKey }))
    : null;

const CHAT_CONFIGURED = Boolean(openrouter || hf || groq);
if (!CHAT_CONFIGURED) {
    console.error(`[config] no chat provider is configured: set at least one of ${CHAT_KEY_NAMES.join(", ")}`);
}

/** Error bodies carry a stable `code` so the UI can show its own wording. */
function errorResponse(status: number, code: string, error: string, headers: HeadersInit = {}) {
    return NextResponse.json({ error, code }, { status, headers });
}

export const maxDuration = 45; // Allow time for fallbacks

// ---------------------------------------------------------
// 2. GENERATION (THE FALLBACK CASCADE)
// ---------------------------------------------------------
async function generateAnswer(system: string, messages: ChatTurn[]): Promise<string | null> {
    const providers: Array<{ name: string; run: () => Promise<string | null | undefined> }> = [];

    if (groq) {
        providers.push({
            name: "groq",
            run: async () => (await generateText({ model: groq(models.groq), system, messages })).text,
        });
    }

    if (openrouter) {
        providers.push({
            name: "openrouter",
            run: async () => (await generateText({ model: openrouter(models.openrouter), system, messages })).text,
        });
    }
    if (hf) {
        providers.push({
            name: "huggingface",
            run: async () => {
                const response = await hf.chatCompletion({
                    model: models.huggingface,
                    messages: [{ role: "system", content: system }, ...messages],
                    max_tokens: 512,
                });
                return response.choices[0]?.message?.content;
            },
        });
    }
    for (const provider of providers) {
        try {
            const text = stripEmoji(stripThinkBlocks((await provider.run()) ?? ""));
            if (text) return text;
            console.warn(`[teach] ${provider.name} returned an empty answer`);
        } catch (err) {
            console.warn(`[teach] ${provider.name} failed: ${errorSummary(err)}`);
        }
    }
    return null;
}

/** A random id the centre page makes once per browser (crypto.randomUUID). */
const STUDENT_ID = /^[A-Za-z0-9-]{8,64}$/;

const NOT_IN_NOTES_REPLY = {
    bengali: "এটি তোমার কোচিংয়ের নোটে এখনো নেই। তোমার শিক্ষককে জিজ্ঞেস করো।",
    english: "This is not in your centre's notes yet. Please ask your teacher.",
};

/**
 * A centre student's question: answered only from that centre's notes, then
 * logged for the owner's dashboard. Without the notes there is nothing to
 * answer from, so a store failure is an error here, not a degraded answer.
 */
async function centreAnswer(body: unknown, student: string) {
    const parsed = parseCentreRequest(body);
    if (!parsed.success) {
        return errorResponse(400, "invalid_input", "Invalid input");
    }
    if (!store) {
        return errorResponse(503, "not_configured", "Centre tutors are not set up on this server: the store is not configured.");
    }
    const { messages, language, centre } = parsed.data;
    const question = messages[messages.length - 1]?.content ?? "";

    let found: Awaited<ReturnType<typeof store.centreMatch>>;
    try {
        found = await store.centreMatch(centre.slug, centre.code, question, RETRIEVAL_TOP_K);
    } catch (err) {
        if (err instanceof StoreError && err.status === 401) {
            return errorResponse(401, "wrong_code", "Wrong join code");
        }
        console.warn(`[teach] centre notes search failed: ${errorSummary(err)}`);
        return errorResponse(503, "providers_unavailable", "The notes could not be searched. Please try again in a minute.", {
            "Retry-After": "60",
        });
    }

    const answer = await generateAnswer(buildCentrePrompt(found.name, language, formatContext(found.matches)), messages);
    if (!answer) {
        return errorResponse(
            503,
            "providers_unavailable",
            "None of the AI providers returned an answer. Please try again in a minute.",
            { "Retry-After": "60" },
        );
    }
    const { text, covered } = splitCoverage(answer);

    // The nearest note, when the notes covered the question: logged for the
    // owner and shown to the student beside the answer.
    const source = covered ? (found.matches[0]?.source ?? null) : null;

    // shortcut: a greeting counts as a covered question about the nearest
    // note; add a second marker for small talk if it clutters the dashboard.
    try {
        await store.centreLog(centre.slug, centre.code, student, question, source);
    } catch (err) {
        console.warn(`[teach] centre question not logged: ${errorSummary(err)}`);
    }
    return NextResponse.json({ result: text || NOT_IN_NOTES_REPLY[language], ...(source ? { source } : {}) });
}

export async function POST(req: Request) {
    try {
        // Centre students often share one address (a classroom, a mobile
        // carrier's NAT), so they are counted per browser as well. The header
        // only changes the key for centre requests (see below), so it cannot
        // be used to get around the per-address limit on the open tutor.
        // shortcut: a student with the join code can rotate this id to get a
        // fresh budget; add a per-centre daily cap when a centre is abused.
        const student = req.headers.get("x-centre-student");
        if (student !== null && !STUDENT_ID.test(student)) {
            return errorResponse(400, "invalid_input", "Invalid input");
        }
        const ip = getClientIp(req.headers);
        if (!(await rateLimiter.allow(hashKey(student ? `${ip}:${student}` : ip)))) {
            return errorResponse(429, "rate_limited", "Rate limit exceeded. Please try again later.", {
                "Retry-After": "60",
            });
        }

        // Checked after the rate limit so an unconfigured deployment still
        // throttles, and before any parsing work.
        if (!CHAT_CONFIGURED) {
            return errorResponse(
                503,
                "not_configured",
                `The tutor is not set up on this server: no AI provider key is configured (${CHAT_KEY_NAMES.join(", ")}).`,
            );
        }

        const raw = await req.text();
        if (raw.length > MAX_BODY_CHARS) {
            return errorResponse(413, "too_large", "Request too large");
        }
        let body: unknown;
        try {
            body = JSON.parse(raw);
        } catch {
            return errorResponse(400, "invalid_input", "Invalid input");
        }

        if (student !== null) {
            return await centreAnswer(body, hashKey(student));
        }

        const parsed = parseTeachRequest(body);
        if (!parsed.success) {
            return errorResponse(400, "invalid_input", "Invalid input");
        }
        const { messages, grade, language } = parsed.data;
        const question = messages[messages.length - 1]?.content ?? "";

        const cacheKey = getCacheKey(question, grade, language);
        const cachedResponse = await getCachedResponse(cacheKey);
        if (cachedResponse) {
            return NextResponse.json({ result: cachedResponse });
        }

        // ---------------------------------------------------------
        // RETRIEVAL (RAG). Failures and timeouts degrade to no context.
        // ---------------------------------------------------------
        const contextText = store
            ? await retrieveContext({ query: question, grade, language }, {
                search: (query, g, medium, topK, signal) => store.match(query, g, medium, topK, signal),
            })
            : "";

        const result = await generateAnswer(buildSystemPrompt(grade, language, contextText), messages);
        if (!result) {
            return errorResponse(
                503,
                "providers_unavailable",
                "None of the AI providers returned an answer. Please try again in a minute.",
                { "Retry-After": "60" },
            );
        }

        await setCachedResponse(cacheKey, result);
        return NextResponse.json({ result });
    } catch (error) {
        console.error(`[teach] request failed: ${errorSummary(error)}`);
        return errorResponse(500, "internal_error", "Failed to process request");
    }
}

// src/app/api/teach/route.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { HfInference } from "@huggingface/inference";
import { Index } from "@upstash/vector";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getModelConfig } from "@/lib/models";
import { createRateLimiter } from "@/lib/rate-limit";
import { retrieveContext } from "@/lib/retrieval";
import {
  errorSummary,
  getCacheKey,
  getClientIp,
  hashKey,
  parseTeachRequest,
  stripThinkBlocks,
  type ChatTurn,
  type Language,
} from "@/lib/teach";
import { MAX_BODY_CHARS } from "@/lib/teach-limits";

const KV_ENABLED = Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

// Simple response caching (fallback for development)
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedResponse(key: string): Promise<string | null> {
    try {
        if (KV_ENABLED) {
            const cached = await kv.get(`cache:${key}`);
            if (cached && typeof cached === "string") return cached;
        }
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
        if (KV_ENABLED) {
            await kv.set(`cache:${key}`, response, { ex: CACHE_TTL / 1000 });
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
const models = getModelConfig();
const rateLimiter = createRateLimiter();

// A. Vector DB (textbook passages)
const index = process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN
    ? new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    })
    : null;

// B. Hugging Face: embeddings for retrieval and the second chat provider
const hf = process.env.HF_API_KEY ? new HfInference(process.env.HF_API_KEY) : null;

// C. Chat providers
const openrouter = process.env.OPENROUTER_API_KEY
    ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
    : null;

const groq = process.env.GROQ_API_KEY
    ? createGroq({ apiKey: process.env.GROQ_API_KEY })
    : null;

export const maxDuration = 45; // Allow time for fallbacks

function buildSystemPrompt(grade: number, language: Language, contextText: string): string {
    const context = contextText
        || "(No textbook passages were found for this question. Answer from general knowledge and tell the student the answer is not taken from their textbook.)";
    return `
You are **Shikhbo AI**, an advanced academic tutor for Class ${grade} (Medium: ${language}).

### YOUR GOAL
Do not just give answers. **Teach the student how to think.**
Use the **Provided Context** as your knowledge base.

### RESPONSE PROTOCOL (Step-by-Step)
For every question (especially Math/Science), follow this structure:

1.  **🔍 Analyze the Problem:**
    * Identify what is given.
    * Identify what needs to be found.

2.  **📖 Reference the Concept:**
    * Quote the relevant rule/formula from the Textbook Context.
    * Example: "According to Newton's Second Law (Page 45)..."

3.  **🧠 Step-by-Step Solution:**
    * Show the logical steps clearly.
    * Use LaTeX for math (e.g., $F = ma$).
    * *Do not skip steps.* Explain *why* you are doing each step.

4.  **✅ Final Conclusion:**
    * State the answer clearly in Bengali (or English if requested).

### TEXTBOOK CONTEXT:
${context}
`;
}

// ---------------------------------------------------------
// 2. GENERATION (THE FALLBACK CASCADE)
// ---------------------------------------------------------
async function generateAnswer(system: string, messages: ChatTurn[]): Promise<string | null> {
    const providers: Array<{ name: string; run: () => Promise<string | null | undefined> }> = [];

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
    if (groq) {
        providers.push({
            name: "groq",
            run: async () => (await generateText({ model: groq(models.groq), system, messages })).text,
        });
    }

    for (const provider of providers) {
        try {
            const text = stripThinkBlocks((await provider.run()) ?? "");
            if (text) return text;
            console.warn(`[teach] ${provider.name} returned an empty answer`);
        } catch (err) {
            console.warn(`[teach] ${provider.name} failed: ${errorSummary(err)}`);
        }
    }
    return null;
}

export async function POST(req: Request) {
    try {
        if (!(await rateLimiter.allow(hashKey(getClientIp(req.headers))))) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        const raw = await req.text();
        if (raw.length > MAX_BODY_CHARS) {
            return NextResponse.json({ error: "Request too large" }, { status: 413 });
        }
        let body: unknown;
        try {
            body = JSON.parse(raw);
        } catch {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const parsed = parseTeachRequest(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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
        const contextText = index && hf
            ? await retrieveContext({ query: question, grade, language }, {
                embed: (text, signal) =>
                    hf.featureExtraction({ model: models.embedding, inputs: text }, { signal }),
                search: (vector, filter, topK) =>
                    index.query({ vector, topK, includeMetadata: true, filter }),
            })
            : "";

        const result = await generateAnswer(buildSystemPrompt(grade, language, contextText), messages);
        if (!result) {
            return NextResponse.json(
                { error: "Sorry, Shikhbo AI is currently overloaded. Please try again in 1 minute." },
                { status: 503 }
            );
        }

        await setCachedResponse(cacheKey, result);
        return NextResponse.json({ result });
    } catch (error) {
        console.error(`[teach] request failed: ${errorSummary(error)}`);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

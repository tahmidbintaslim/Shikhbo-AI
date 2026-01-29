// src/app/api/teach/route.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { HfInference } from "@huggingface/inference";
import { Index } from "@upstash/vector";
import { generateText } from 'ai';
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KV_ENABLED = Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

// Simple in-memory rate limiting (fallback for development)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RESET_TIME = 60 * 1000; // 1 minute

// Simple response caching (fallback for development)
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const userLimit = rateLimit.get(ip);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimit.set(ip, { count: 1, resetTime: now + RESET_TIME });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT) {
        return false;
    }

    userLimit.count++;
    return true;
}

function sanitizeInput(input: string): string {
    // Basic sanitization - remove potentially harmful content
    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .slice(0, 2000); // Limit length
}

function getCacheKey(input: string, grade: string): string {
    return `${grade}:${input.toLowerCase().trim()}`;
}

function getCachedResponse(key: string): Promise<string | null> {
    return new Promise(async (resolve) => {
        try {
            // Try Redis first (production)
            if (KV_ENABLED) {
                const cached = await kv.get(`cache:${key}`);
                if (cached && typeof cached === 'string') {
                    resolve(cached);
                    return;
                }
            }

            // Fallback to in-memory cache (development)
            const cached = responseCache.get(key);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                resolve(cached.response);
                return;
            }
            if (cached) {
                responseCache.delete(key); // Expired
            }
            resolve(null);
        } catch (error) {
            console.error('Cache read error:', error);
            resolve(null);
        }
    });
}

function setCachedResponse(key: string, response: string): Promise<void> {
    return new Promise(async (resolve) => {
        try {
            // Try Redis first (production)
            if (KV_ENABLED) {
                await kv.set(`cache:${key}`, response, { ex: CACHE_TTL / 1000 });
            } else {
                // Fallback to in-memory cache (development)
                responseCache.set(key, { response, timestamp: Date.now() });
            }
            resolve();
        } catch (error) {
            console.error('Cache write error:', error);
            resolve();
        }
    });
}

// Export for testing
export { sanitizeInput, getCacheKey, getCachedResponse, setCachedResponse };

// ---------------------------------------------------------
// 1. SETUP CLIENTS
// ---------------------------------------------------------
// A. Vector DB (Memory)
const index = process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN
    ? new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    })
    : null;

// B. Embeddings (Using HF for free vectorization)
const hf = new HfInference(process.env.HF_API_KEY);

// C. AI Providers (The "Brains")
const openrouter = process.env.OPENROUTER_API_KEY
    ? createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
    })
    : null;

const groq = process.env.GROQ_API_KEY
    ? createGroq({
        apiKey: process.env.GROQ_API_KEY,
    })
    : null;

export const maxDuration = 45; // Allow time for fallbacks

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        const { messages, grade, language } = await req.json();
        const lastMessage = messages[messages.length - 1].content;

        // Input validation
        if (!lastMessage || typeof lastMessage !== 'string') {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        // Check cache first (using last message as key)
        const cacheKey = getCacheKey(lastMessage, grade || "5");
        const cachedResponse = await getCachedResponse(cacheKey);
        if (cachedResponse) {
            return NextResponse.json({ result: cachedResponse });
        }

        // ---------------------------------------------------------
        // STEP 1: RETRIEVAL (RAG)
        // ---------------------------------------------------------
        let contextText = "";
        if (index) {
            // We stick to HF for embeddings as it's reliable for this specific task
            const embedding = await hf.featureExtraction({
                model: "sentence-transformers/all-MiniLM-L6-v2",
                inputs: lastMessage,
            });

            const searchResults = await index.query({
                vector: embedding as number[],
                topK: 5, // Increase from 3 to 5 for better reasoning context
                includeMetadata: true,
                // Filter by language and grade
                filter: `language = '${language || 'english'}' AND grade = ${grade || 1}`
            });

            // --- DEBUG LOGS ---
            console.log("🔎 User Query:", lastMessage);
            console.log(`📚 Found: ${searchResults.length} chunks | Filter: lang='${language || 'english'}', grade=${grade || 1}`);
            searchResults.forEach((r, i) => {
                console.log(`\n[Chunk ${i + 1}] Source: ${r.metadata?.source}`);
                console.log(`Text Preview: ${(r.metadata?.text as string)?.slice(0, 100)}...`);
            });
            // -----------------

            contextText = searchResults
                .map(r => `[Source: ${r.metadata?.source}]: ${r.metadata?.text}`)
                .join("\n\n");
        }

        const systemPrompt = `
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
${contextText}
`;

        // ---------------------------------------------------------
        // STEP 2: GENERATION (THE FALLBACK CASCADE)
        // ---------------------------------------------------------

        let result: string | null = null;

        // ATTEMPT 1: OPENROUTER (Priority #1)
        // Use a free model on OpenRouter (e.g., Gemini Flash or Llama Free)
        if (openrouter) {
            try {
                console.log("Attempting Provider 1: OpenRouter...");
                const response = await generateText({
                    model: openrouter('google/gemini-2.0-flash-exp:free'), // Completely free model
                    system: systemPrompt,
                    messages: messages,
                });
                result = response.text;
            } catch (err) {
                console.warn("OpenRouter failed, switching to fallback...", err);
            }
        }

        // ATTEMPT 2: HUGGING FACE INFERENCE (Priority #2)
        if (!result) {
            try {
                console.log("Attempting Provider 2: Hugging Face...");
                const response = await hf.chatCompletion({
                    model: "Qwen/Qwen2.5-7B-Instruct",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messages
                    ],
                    max_tokens: 512,
                });

                result = response.choices[0]?.message?.content || null;
            } catch (err) {
                console.warn("Hugging Face failed, switching to fallback...", err);
            }
        }

        // ATTEMPT 3: GROQ (Priority #3 - The "Fast" Safety Net)
        if (!result && groq) {
            try {
                console.log("Attempting Provider 3: Groq...");
                const response = await generateText({
                    model: groq('deepseek-r1-distill-llama-70b'), // Reasoning model for step-by-step teaching
                    system: systemPrompt,
                    messages: messages,
                });
                result = response.text;
            } catch (err) {
                console.error("All providers failed.", err);
                return NextResponse.json({ error: "Sorry, Shikhbo AI is currently overloaded. Please try again in 1 minute." }, { status: 503 });
            }
        }

        if (!result) {
            return NextResponse.json({ error: "No response from AI" }, { status: 500 });
        }

        // Cache the response
        await setCachedResponse(cacheKey, result);

        return NextResponse.json({ result });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
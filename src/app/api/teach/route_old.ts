// src/app/api/teach/route.ts
import { HfInference } from "@huggingface/inference";
import { Index } from "@upstash/vector";
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

// 1. Setup Clients
const index = process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN
    ? new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    })
    : null;

const hf = new HfInference(process.env.HF_API_KEY);

export async function POST(req: Request) {
    try {
        // Rate limiting (keep existing)
        const ip = req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        let { input, grade } = await req.json();

        // Input validation (keep existing)
        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        input = sanitizeInput(input);

        if (!grade || typeof grade !== 'string' || !/^\d+$/.test(grade)) {
            grade = "5";
        }

        const gradeNum = parseInt(grade);
        if (gradeNum < 1 || gradeNum > 12) {
            grade = "5";
        }

        // Check cache first
        const cacheKey = getCacheKey(input, grade);
        const cachedResponse = await getCachedResponse(cacheKey);
        if (cachedResponse) {
            return NextResponse.json({ result: cachedResponse });
        }

        // Retrieve Relevant Context from NCTB Books (RAG)
        let context = "";
        if (index) {
            // 1. Convert user question to vector
            const embedding = await hf.featureExtraction({
                model: "intfloat/multilingual-e5-large",
                inputs: input,
            });

            // 2. Search Upstash for relevant textbook sections
            const searchResults = await index.query({
                vector: embedding as number[],
                topK: 3,
                includeMetadata: true,
            });

            // 3. Build Context String
            context = searchResults
                .map(r => `[Source: ${r.metadata?.source}]: ${r.metadata?.text}`)
                .join("\n\n");
        }

        // Define the System Prompt
        const systemPrompt = `
    You are Shikhbo AI, a friendly academic tutor for Class ${grade} students in Bangladesh.
    
    ### INSTRUCTIONS:
    Answer the student's question using ONLY the provided Textbook Context below.
    If the answer is not in the context, say "This topic isn't in your current textbooks, but generally..." and give a brief answer.
    Output in Bengali (unless asked for English).
    
    ### TEXTBOOK CONTEXT:
    ${context}
    `;

        // Call Hugging Face
        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-7B-Instruct",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input }
            ],
            max_tokens: 1024,
            temperature: 0.3,
        });

        const result = response.choices[0]?.message?.content;

        if (!result) {
            return NextResponse.json({ error: "No response from AI" }, { status: 500 });
        }

        // Cache the response
        await setCachedResponse(cacheKey, result);

        return NextResponse.json({ result });

    } catch (error) {
        console.error("HF API Error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

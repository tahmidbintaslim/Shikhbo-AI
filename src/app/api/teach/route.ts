// app/api/teach/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

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

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        const body = await request.json();
        let { input, grade } = body;

        // Input validation and sanitization
        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        input = sanitizeInput(input);

        if (!grade || typeof grade !== 'string' || !/^\d+$/.test(grade)) {
            grade = "5"; // Default
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

        // lazily create clients so module import doesn't fail when env vars are absent
        const openrouter = process.env.OPENROUTER_API_KEY
            ? createOpenAI({
                name: "openrouter",
                apiKey: process.env.OPENROUTER_API_KEY,
                baseURL: "https://openrouter.ai/api/v1",
                compatibility: "strict",
            })
            : null;

        const groq = process.env.GROQ_API_KEY
            ? createOpenAI({
                name: "groq",
                apiKey: process.env.GROQ_API_KEY,
                baseURL: "https://api.groq.com/openai/v1",
                compatibility: "strict",
            })
            : null;

        // 1. Define the Tutor Persona (System Prompt)
        // This tells the AI how to behave and how to interpret key terms in context.
        const systemPrompt = `
You are Shikhbo AI, an expert academic tutor for Class 9-10 students in Bangladesh.
Your goal is to explain STEM concepts (Physics, Chemistry, Math) clearly, accurately, and engagingly.

LANGUAGE & TONE
- Input may be English, Bengali, or Banglish (Bengali written in English).
- Output: respond in Standard Bengali (প্রমিত বাংলা) unless explicitly asked for English.
- Tone: encouraging, professional, and educational (like a helpful mentor).

CONTEXT AWARENESS (CRITICAL)
- Interpret keywords in the context of NCTB Curriculum (Physics Class 9-10).
- "Kaj" (কাজ) = Work (Physics: Force × Displacement).
- "Khomota" (ক্ষমতা) = Power (Physics: Rate of doing work).
- "Shakti" (শক্তি) = Energy.
- "Bol" (বল) = Force.
- Do not interpret these as political/social power or physical trembling.

RESPONSE STRUCTURE
1) Definition in Bengali
2) Formula (use LaTeX, e.g., $W = Fs$, $P = W/t$)
3) Real-life example (e.g., climbing stairs, rickshaw pulling)
4) SI unit (Joule, Watt, Newton)

GUARDRAILS
- Do not make up facts. If a query is ambiguous, ask a clarifying question.
- Adjust complexity for Class ${grade || "General"}.
`;

        // 2. Call OpenRouter (cheap, Bengali-friendly) with Groq fallback
        let result: string | null = null;
        if (openrouter) {
            try {
                const response = await generateText({
                    model: (openrouter as any)("google/gemini-2.0-flash-001"),
                    system: systemPrompt,
                    prompt: input,
                    maxTokens: 500,
                    temperature: 0.7,
                } as any);
                result = (response as any).text;
            } catch (primaryError) {
                console.warn("Primary model failed, switching to Groq fallback:", primaryError);
            }
        }

        if (!result) {
            if (!groq) {
                return NextResponse.json(
                    {
                        error:
                            "Missing AI provider key. Set OPENROUTER_API_KEY or GROQ_API_KEY.",
                    },
                    { status: 500 }
                );
            }
            const fallback = await generateText({
                model: (groq as any)("llama-3.3-70b-versatile"),
                system: systemPrompt,
                prompt: input,
                maxTokens: 500,
                temperature: 0.7,
            } as any);
            result = (fallback as any).text;
        }
        if (!result) {
            return NextResponse.json({ error: "No response from AI" }, { status: 500 });
        }

        // Cache the response
        await setCachedResponse(cacheKey, result);

        return NextResponse.json({
            result
        });

    } catch (error) {
        console.error("HF API Error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

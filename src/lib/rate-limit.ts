import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createOptional } from "./config";
import { errorSummary } from "./teach";

export const RATE_LIMIT = 10;
export const RATE_WINDOW_MS = 60_000;

type Env = Record<string, string | undefined>;

/**
 * Upstash Redis REST credentials. UPSTASH_REDIS_REST_* is what an Upstash
 * database gives you; KV_REST_API_* is what the Vercel marketplace
 * integration (formerly Vercel KV) sets. Each pair is used only when whole.
 */
export function getRedisCredentials(env: Env = process.env): { url: string; token: string } | null {
  const pairs: Array<[string | undefined, string | undefined]> = [
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
  ];
  for (const [url, token] of pairs) {
    if (url?.trim() && token?.trim()) return { url: url.trim(), token: token.trim() };
  }
  return null;
}

/**
 * Fixed-window counter in process memory. On serverless hosts each instance
 * has its own copy, so this is a development fallback, not a real limit.
 */
export function createMemoryLimiter(
  limit: number = RATE_LIMIT,
  windowMs: number = RATE_WINDOW_MS,
  now: () => number = Date.now,
) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string): boolean => {
    const t = now();
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (t > v.resetAt) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || t > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: t + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  };
}

export interface RateLimiter {
  backend: "upstash" | "memory";
  allow: (key: string) => Promise<boolean>;
}

export function createRateLimiter(env: Env = process.env): RateLimiter {
  const memory = createMemoryLimiter();
  const credentials = getRedisCredentials(env);
  if (!credentials) {
    return { backend: "memory", allow: async (key) => memory(key) };
  }

  const shared = createOptional(
    "shared rate limit",
    "UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN (an https REST URL, not redis://)",
    () =>
      new Ratelimit({
        redis: new Redis(credentials),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT, `${RATE_WINDOW_MS / 1000} s`),
        prefix: "shikhbo:ratelimit",
        analytics: false,
      }),
  );
  if (!shared) {
    return { backend: "memory", allow: async (key) => memory(key) };
  }

  return {
    backend: "upstash",
    allow: async (key) => {
      try {
        const { success } = await shared.limit(key);
        return success;
      } catch (err) {
        console.warn(`[teach] shared rate limit unavailable, using in-memory limit: ${errorSummary(err)}`);
        return memory(key);
      }
    },
  };
}

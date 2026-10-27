import type { Store } from "./store";
import { errorSummary } from "./teach";

export const RATE_LIMIT = 10;
export const RATE_WINDOW_MS = 60_000;

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
  backend: "store" | "memory";
  allow: (key: string) => Promise<boolean>;
}

/**
 * The shared fixed-window limit in Supabase (through the store) when one is
 * configured, so every serverless instance counts together; the in-memory
 * limit otherwise, and whenever a store call fails.
 */
export function createRateLimiter(store: Store | null): RateLimiter {
  const memory = createMemoryLimiter();
  if (!store) {
    return { backend: "memory", allow: async (key) => memory(key) };
  }
  return {
    backend: "store",
    allow: async (key) => {
      try {
        return await store.rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS / 1000);
      } catch (err) {
        console.warn(`[teach] shared rate limit unavailable, using in-memory limit: ${errorSummary(err)}`);
        return memory(key);
      }
    },
  };
}

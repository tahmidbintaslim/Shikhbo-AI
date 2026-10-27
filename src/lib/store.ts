// Client for the shikhbo-api Supabase Edge Function
// (supabase/functions/shikhbo-api), the app's only access to its storage:
// the textbook index, the answer cache and the shared rate limit.
//
// Every call throws on failure; callers decide how to degrade (no textbook
// context, no cache, the in-memory rate limit).

import type { Language } from "./teach";

export interface StoreConfig {
  /** https://<project>.supabase.co/functions/v1/shikhbo-api */
  url: string;
  secret: string;
}

export interface TextbookMatch {
  source: string;
  text: string;
  similarity: number;
}

export interface PageInput {
  id: string;
  grade: number;
  medium: Language;
  source: string;
  text: string;
}

export const STORE_TIMEOUT_MS = 5000;

export class StoreError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export function createStore(config: StoreConfig, fetchImpl: typeof fetch = globalThis.fetch) {
  async function call<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(STORE_TIMEOUT_MS);
    const response = await fetchImpl(config.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-shikhbo-secret": config.secret },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      // The body is the function's own short error text, never the secret.
      const detail = await response.text().catch(() => "");
      throw new StoreError(response.status, `store ${String(body.op)} answered HTTP ${response.status} ${detail.slice(0, 200)}`);
    }
    return (await response.json()) as T;
  }

  return {
    match: async (query: string, grade: number, medium: Language, count: number, signal?: AbortSignal) =>
      (await call<{ matches: TextbookMatch[] }>({ op: "match", query, grade, medium, count }, signal)).matches,
    cacheGet: async (key: string) => (await call<{ response: string | null }>({ op: "cache_get", key })).response,
    cacheSet: async (key: string, response: string, ttlSeconds: number) => {
      await call({ op: "cache_set", key, response, ttlSeconds });
    },
    rateLimit: async (key: string, limit: number, windowSeconds: number) =>
      (await call<{ allowed: boolean }>({ op: "rate_limit", key, limit, windowSeconds })).allowed,
    upsertPage: async (page: PageInput) => {
      await call({ op: "upsert_page", ...page });
    },
  };
}

export type Store = ReturnType<typeof createStore>;

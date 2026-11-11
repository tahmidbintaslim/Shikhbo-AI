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

/** What an owner's dashboard shows for the last `days` days. */
export interface CentreStats {
  days: number;
  questions: number;
  students: number;
  notCovered: number;
  /** The notes students asked about most. */
  topSources: Array<{ source: string; questions: number }>;
  /** Recent questions the notes did not answer. */
  notCoveredQuestions: Array<{ question: string; askedAt: string }>;
  notes: Array<{ title: string; parts: number }>;
}

export const STORE_TIMEOUT_MS = 5000;
/** Uploading notes embeds every chunk inside the function, so it gets longer. */
export const NOTES_TIMEOUT_MS = 50_000;

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
  async function call<T>(body: Record<string, unknown>, signal?: AbortSignal, timeoutMs = STORE_TIMEOUT_MS): Promise<T> {
    const timeout = AbortSignal.timeout(timeoutMs);
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

    // Coaching-centre pilot. A wrong code or unknown centre throws a
    // StoreError with status 401.
    centreCreate: async (centre: string, name: string, joinCode: string, ownerCode: string) => {
      await call({ op: "centre_create", centre, name, joinCode, ownerCode });
    },
    /** The centre's display name, or null when there is no such centre. */
    centreInfo: async (centre: string) => (await call<{ name: string | null }>({ op: "centre_info", centre })).name,
    centreMatch: (centre: string, code: string, query: string, count: number, signal?: AbortSignal) =>
      call<{ name: string; matches: TextbookMatch[] }>({ op: "centre_match", centre, code, query, count }, signal),
    centreLog: async (centre: string, code: string, student: string, question: string, source: string | null) => {
      await call({ op: "centre_log", centre, code, student, question, source });
    },
    centreStats: (centre: string, code: string, days: number) =>
      call<CentreStats>({ op: "centre_stats", centre, code, days }),
    /** Replaces every part of `title`; an empty list removes it. */
    centreSetNotes: async (centre: string, code: string, title: string, chunks: string[]) => {
      await call({ op: "centre_set_notes", centre, code, title, chunks }, undefined, NOTES_TIMEOUT_MS);
    },
  };
}

export type Store = ReturnType<typeof createStore>;

import { buildVectorFilter, errorSummary, type Language } from "./teach";

export const RETRIEVAL_TIMEOUT_MS = 5000;
export const RETRIEVAL_TOP_K = 5;

export interface RetrievalMatch {
  metadata?: Record<string, unknown> | undefined;
}

export interface RetrievalDeps {
  /** Turns the question into a vector. Should honor the abort signal. */
  embed: (text: string, signal: AbortSignal) => Promise<unknown>;
  /** Nearest-neighbour search in the textbook index. */
  search: (vector: number[], filter: string, topK: number) => Promise<RetrievalMatch[]>;
}

export interface RetrievalQuery {
  query: string;
  grade: number;
  language: Language;
}

class RetrievalTimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`);
    this.name = "RetrievalTimeoutError";
  }
}

/** Feature extraction may return a flat vector or a batch of one. */
export function toVector(output: unknown): number[] {
  if (Array.isArray(output) && output.length > 0) {
    if (output.every((v) => typeof v === "number")) return output as number[];
    const first: unknown = output[0];
    if (Array.isArray(first) && first.length > 0 && first.every((v) => typeof v === "number")) {
      return first as number[];
    }
  }
  throw new TypeError("embedding response has an unexpected shape");
}

export function formatContext(matches: RetrievalMatch[]): string {
  return matches
    .filter((m) => typeof m.metadata?.text === "string" && m.metadata.text.trim() !== "")
    .map((m) => {
      const source = typeof m.metadata?.source === "string" ? m.metadata.source : "textbook";
      return `[Source: ${source}]: ${m.metadata?.text as string}`;
    })
    .join("\n\n");
}

/**
 * Textbook passages for the question, or "" when retrieval fails or is slow.
 * Never throws: a broken embedding provider or vector index must not turn
 * into a failed answer, the tutor just answers without textbook context.
 */
export async function retrieveContext(
  { query, grade, language }: RetrievalQuery,
  deps: RetrievalDeps,
  timeoutMs: number = RETRIEVAL_TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RetrievalTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  const run = async () => {
    const filter = buildVectorFilter(grade, language);
    const vector = toVector(await deps.embed(query, controller.signal));
    const matches = await deps.search(vector, filter, RETRIEVAL_TOP_K);
    return formatContext(matches);
  };

  try {
    return await Promise.race([run(), timeout]);
  } catch (err) {
    console.warn(`[teach] retrieval skipped, answering without textbook context: ${errorSummary(err)}`);
    return "";
  } finally {
    clearTimeout(timer);
  }
}

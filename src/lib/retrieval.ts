import type { TextbookMatch } from "./store";
import { errorSummary, type Language } from "./teach";

export const RETRIEVAL_TIMEOUT_MS = 5000;
export const RETRIEVAL_TOP_K = 5;

export interface RetrievalDeps {
  /** Textbook pages nearest the question for this class and medium. Should honor the abort signal. */
  search: (query: string, grade: number, language: Language, topK: number, signal: AbortSignal) => Promise<TextbookMatch[]>;
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

/** "Class 1 Math_compressed.pdf, page 12" -> "Class 1 Math, page 12" */
export function sourceLabel(source: string): string {
  return source.replace(/(_compressed)?( \(\d+\))?\.pdf/i, "").trim();
}

export function formatContext(matches: Array<Partial<TextbookMatch>>): string {
  return matches
    .filter((m) => typeof m.text === "string" && m.text.trim() !== "")
    .map((m) => `[Source: ${typeof m.source === "string" && m.source ? sourceLabel(m.source) : "textbook"}]: ${m.text as string}`)
    .join("\n\n");
}

/**
 * Textbook passages for the question, or "" when retrieval fails or is slow.
 * Never throws: a broken or unreachable store must not turn
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
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
      throw new RangeError("grade must be an integer from 1 to 12");
    }
    return formatContext(await deps.search(query, grade, language, RETRIEVAL_TOP_K, controller.signal));
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

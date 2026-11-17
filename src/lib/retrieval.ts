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

const BANGLA_SUBJECTS: Record<string, string> = { math: "গণিত", bangla: "বাংলা", english: "ইংরেজি" };

/** "Class 1 Math, page 12" -> "শ্রেণি ১ গণিত, পৃষ্ঠা ১২". Unknown shapes are returned as they are. */
function banglaLabel(label: string): string {
  const m = /^class\s*(\d+)\s+(\w+).*?,\s*page\s*(\d+)$/i.exec(label);
  const subject = m && BANGLA_SUBJECTS[m[2]!.toLowerCase()];
  if (!m || !subject) return label;
  const bn = (n: string) => n.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!);
  return `শ্রেণি ${bn(m[1]!)} ${subject}, পৃষ্ঠা ${bn(m[3]!)}`;
}

/**
 * The retrieved page the answer itself cites ("page 12", "পৃষ্ঠা ১২"), as a
 * label for the student, or null. Only a page the model named and the
 * search really returned is shown as the source: the top match alone proves
 * nothing about what the answer used.
 */
export function citedSource(
  answer: string,
  matches: Array<Partial<TextbookMatch>>,
  language: Language = "english",
): string | null {
  const latin = answer.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  const cited = new Set(Array.from(latin.matchAll(/(?:page|পৃষ্ঠা(?:র|য়)?)\s*(\d{1,4})/gi), (m) => m[1]));
  for (const match of matches) {
    const page = typeof match.source === "string" ? /page (\d+)/i.exec(match.source)?.[1] : undefined;
    if (page && cited.has(page)) {
      const label = sourceLabel(match.source as string);
      return language === "bengali" ? banglaLabel(label) : label;
    }
  }
  return null;
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

// Shared by the browser (useChat) and the /api/teach route, so it must stay
// free of server-only imports.

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Classes whose textbooks are in the index (books/sources.json). The UI
 * offers only these; add a class here once its books are ingested.
 */
export const INDEXED_GRADES: readonly number[] = [1];

export const LANGUAGES = ["english", "bengali"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Most recent messages forwarded to the model. Older turns are dropped. */
export const MAX_HISTORY = 10;

/**
 * The last MAX_HISTORY turns, starting at a user turn. Chat templates that
 * enforce user/assistant alternation reject a history that opens with the
 * assistant, which a plain slice of an alternating chat produces.
 */
export function recentTurns<T extends { role: string }>(turns: T[]): T[] {
  const recent = turns.slice(-MAX_HISTORY);
  const firstUser = recent.findIndex((turn) => turn.role === "user");
  return firstUser > 0 ? recent.slice(firstUser) : recent;
}
/** Hard cap on the messages array the API accepts before trimming. */
export const MAX_MESSAGES = 40;
/** A student's question, after sanitizing. */
export const MAX_USER_CHARS = 2000;
/** Earlier tutor answers are trimmed to this length before reuse as context. */
export const MAX_ASSISTANT_CHARS = 4000;
/** Assistant turns longer than this are rejected outright. */
export const MAX_ASSISTANT_CHARS_HARD = 20000;
/** Raw request body cap, checked before JSON parsing. */
export const MAX_BODY_CHARS = 200_000;

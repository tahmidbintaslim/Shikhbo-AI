// Shared by the browser (useChat) and the /api/teach route, so it must stay
// free of server-only imports.

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export const LANGUAGES = ["english", "bengali"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Most recent messages forwarded to the model. Older turns are dropped. */
export const MAX_HISTORY = 10;
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

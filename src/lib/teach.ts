import { createHash } from "node:crypto";
import { z } from "zod";
import {
  LANGUAGES,
  MAX_ASSISTANT_CHARS,
  MAX_ASSISTANT_CHARS_HARD,
  MAX_HISTORY,
  MAX_MESSAGES,
  MAX_USER_CHARS,
  type Language,
} from "./teach-limits";

export type { Language } from "./teach-limits";

export function sanitizeInput(input: string): string {
  return (
    input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Only tag-shaped markup (`<b>`, `</div>`, `<img src=x>`). A bare `<` or
      // `>` stays, so questions like "is 3 < 5?" keep their meaning.
      .replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?\/?>/g, "")
      .trim()
      .slice(0, MAX_USER_CHARS)
  );
}

// Empty-after-sanitizing turns are allowed here and dropped below, so one
// markup-only message earlier in a chat does not fail every later request.
const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().max(MAX_USER_CHARS * 4).transform(sanitizeInput),
});

const AssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z
    .string()
    .max(MAX_ASSISTANT_CHARS_HARD)
    .transform((s) => s.slice(0, MAX_ASSISTANT_CHARS)),
});

// Only "user" and "assistant" turns are accepted: a client-supplied "system"
// turn would let anyone rewrite the tutor's instructions.
const MessageSchema = z.discriminatedUnion("role", [
  UserMessageSchema,
  AssistantMessageSchema,
]);

// The UI sends grade as a string ("1"); accept a plain integer too.
const GradeSchema = z
  .union([z.number(), z.string().regex(/^\d{1,2}$/).transform(Number)])
  .pipe(z.number().int().min(1).max(12));

export const TeachRequestSchema = z
  .object({
    messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
    grade: GradeSchema,
    language: z.enum(LANGUAGES),
  })
  .refine(
    (body) => {
      const last = body.messages[body.messages.length - 1];
      return last?.role === "user" && last.content.length > 0;
    },
    { message: "The last message must be a non-empty question from the user", path: ["messages"] },
  )
  .transform((body) => ({
    ...body,
    messages: body.messages.filter((m) => m.content.length > 0).slice(-MAX_HISTORY),
  }));

export type TeachRequest = z.output<typeof TeachRequestSchema>;
export type ChatTurn = TeachRequest["messages"][number];

export function parseTeachRequest(body: unknown) {
  return TeachRequestSchema.safeParse(body);
}

const LANGUAGE_FILTERS: Record<Language, string> = {
  english: "language = 'english'",
  bengali: "language = 'bengali'",
};

/**
 * Upstash Vector only takes filters as strings. Build it from a fixed lookup
 * and a validated integer so no request text ever reaches the filter.
 */
export function buildVectorFilter(grade: number, language: Language): string {
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
    throw new RangeError("grade must be an integer from 1 to 12");
  }
  return `${LANGUAGE_FILTERS[language]} AND grade = ${grade}`;
}

/** Cache key over class, medium and the normalized question (hashed). */
export function getCacheKey(input: string, grade: number | string, language: Language): string {
  const normalized = input.toLowerCase().trim().replace(/\s+/g, " ");
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `${grade}:${language}:${digest}`;
}

/** Rate-limit key: the client IP, hashed so raw addresses are not stored. */
export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * The first X-Forwarded-For hop is the client as seen by the edge (Vercel
 * overwrites this header); anything after it was appended by proxies.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  const real = headers.get("x-real-ip")?.trim();
  return real || "unknown";
}

/** Remove reasoning blocks some models emit before the answer. */
export function stripThinkBlocks(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // A reply cut off mid-thought leaves an unclosed tag: drop the rest.
  const open = out.search(/<think>/i);
  if (open !== -1) out = out.slice(0, open);
  // Some models omit the opening tag and emit only the closing one.
  const close = out.toLowerCase().lastIndexOf("</think>");
  if (close !== -1) out = out.slice(close + "</think>".length);
  return out.trim();
}

/**
 * One short line for logs. Provider errors can carry the full request body
 * (the student's question), so never log the error object itself.
 */
export function errorSummary(err: unknown): string {
  if (err instanceof Error) {
    const status = (err as { statusCode?: unknown }).statusCode;
    const code = typeof status === "number" ? ` (${status})` : "";
    return `${err.name}${code}: ${err.message}`.replace(/\s+/g, " ").slice(0, 160);
  }
  return "unknown error";
}

// Coaching-centre pilot (Bongo AI): a centre's students ask questions that
// are answered only from that centre's own notes, and the owner sees what
// was asked. Pure helpers shared by /api/teach, /api/centre and the tests.

import { z } from "zod";
import { LAST_MUST_BE_QUESTION, MessageSchema, endsWithQuestion, trimHistory } from "./teach";
import { LANGUAGES, MAX_MESSAGES, type Language } from "./teach-limits";

const SlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/);
const CodeSchema = z.string().min(8).max(64);

/** A student's question to a centre's tutor. There is no class: the notes set the level. */
export const CentreRequestSchema = z
  .object({
    messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
    language: z.enum(LANGUAGES),
    centre: z.object({ slug: SlugSchema, code: CodeSchema }),
  })
  .refine(endsWithQuestion, LAST_MUST_BE_QUESTION)
  .transform(trimHistory);

export function parseCentreRequest(body: unknown) {
  return CentreRequestSchema.safeParse(body);
}

/** The largest note upload: MAX_NOTE_CHUNKS (shikhbo-api) chunks of NOTE_CHUNK_CHARS. */
export const NOTE_CHUNK_CHARS = 1200;
export const MAX_NOTE_CHUNKS = 40;
export const MAX_NOTE_CHARS = NOTE_CHUNK_CHARS * MAX_NOTE_CHUNKS;

/** What the owner's dashboard may ask /api/centre to do. */
export const CentreActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("stats"),
    centre: SlugSchema,
    code: CodeSchema,
    days: z.number().int().min(1).max(90).default(7),
  }),
  z.object({
    action: z.literal("notes"),
    centre: SlugSchema,
    code: CodeSchema,
    title: z.string().trim().min(1).max(120),
    /** Empty text removes the title. */
    text: z.string().max(MAX_NOTE_CHARS),
  }),
]);

export function parseCentreAction(body: unknown) {
  return CentreActionSchema.safeParse(body);
}

/**
 * The model starts its reply with this when the notes do not answer the
 * question. The route removes it and logs the question as not covered, which
 * is how the owner learns what the notes are missing.
 */
export const NOT_IN_NOTES = "[NOT_IN_NOTES]";

export function splitCoverage(answer: string): { text: string; covered: boolean } {
  if (!answer.includes(NOT_IN_NOTES)) return { text: answer, covered: true };
  return { text: answer.split(NOT_IN_NOTES).join("").trim(), covered: false };
}

export function buildCentrePrompt(centreName: string, language: Language, contextText: string): string {
  const answerLanguage = language === "bengali" ? "Bengali (বাংলা)" : "English";
  const context = contextText.trim() || "(none found)";

  return `You are the study assistant of ${centreName}, a coaching centre in Bangladesh. You answer its students' questions from the centre's own notes and model tests.

How to answer:
- Write in ${answerLanguage} unless the student asks for another language.${language === "bengali"
    ? "\n- Write natural, simple Bangla as a Bangladeshi teacher speaks. Address the student as তুমি."
    : ""}
- Sound like a calm, patient teacher: plain words, short sentences. Never use emoji.
- If the student only greets you or chats, reply warmly in one or two short sentences and ask what they want to study. This is not a question about the notes.
- Teach, do not only tell: show the steps, then give the answer clearly at the end. Use LaTeX for formulas (for example $F = ma$) when it helps.

The centre's notes:
- The passages below were found in ${centreName}'s notes by a search, so some may be unrelated. Use a passage only when it really answers the question, and name it (for example "Biology 1, part 2").
- Answer only from these passages. Never present anything else as coming from the centre's notes.
- If there are no passages, or none of them answers the question, start your reply with ${NOT_IN_NOTES} on its own line. Then say in one or two sentences that this is not in the centre's notes yet and that the student should ask their teacher. Do not answer the question from general knowledge.

NOTES:
${context}
`;
}

/**
 * Splits pasted notes into chunks of at most `max` characters, on blank
 * lines where it can. Each chunk is embedded and searched on its own.
 */
export function chunkNotes(text: string, max: number = NOTE_CHUNK_CHARS): string[] {
  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current) chunks.push(current);
    current = "";
  };
  for (const paragraph of text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (paragraph.length > max) {
      flush();
      for (let i = 0; i < paragraph.length; i += max) chunks.push(paragraph.slice(i, i + max));
    } else if (current && current.length + 2 + paragraph.length > max) {
      flush();
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  flush();
  return chunks;
}

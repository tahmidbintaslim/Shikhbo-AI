// bangla-ai-engine: the free model layer shared by Shikhbo, Bongo and Peace.
// Runs on Cloudflare Workers AI through the AI binding, so no API token is
// stored anywhere. Callers send `Authorization: Bearer <ENGINE_SECRET>`.
//   POST /embed { texts: string[] }                       -> { model, vectors: number[][] }  (bge-m3, 1024 dims, multilingual)
//   POST /chat  { system, messages, max_tokens? }          -> { model, text }
const EMBED_MODEL = "@cf/baai/bge-m3";
const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_TEXTS = 100;
const MAX_CHARS = 8000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Constant-time compare, so the secret cannot be guessed byte by byte.
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const isText = (s) => typeof s === "string" && s.length > 0 && s.length <= MAX_CHARS;

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return json({ error: "POST only" }, 405);
    const auth = request.headers.get("authorization") ?? "";
    if (!env.ENGINE_SECRET || !same(auth, `Bearer ${env.ENGINE_SECRET}`)) return json({ error: "not allowed" }, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    const path = new URL(request.url).pathname;
    try {
      if (path === "/embed") {
        const texts = body.texts;
        if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS || !texts.every(isText)) {
          return json({ error: `texts must be 1-${MAX_TEXTS} strings of 1-${MAX_CHARS} characters` }, 400);
        }
        const r = await env.AI.run(EMBED_MODEL, { text: texts });
        return json({ model: EMBED_MODEL, vectors: r.data });
      }
      if (path === "/chat") {
        const msgs = body.messages;
        if (!isText(body.system) || !Array.isArray(msgs) || msgs.length === 0 || msgs.length > 20 ||
            !msgs.every((m) => (m?.role === "user" || m?.role === "assistant") && isText(m.content))) {
          return json({ error: "system and 1-20 user/assistant messages are required" }, 400);
        }
        const maxTokens = Number.isInteger(body.max_tokens) ? Math.min(Math.max(body.max_tokens, 16), 1024) : 600;
        const r = await env.AI.run(CHAT_MODEL, {
          messages: [{ role: "system", content: body.system }, ...msgs],
          max_tokens: maxTokens,
        });
        return json({ model: CHAT_MODEL, text: String(r.response ?? "") });
      }
      return json({ error: "unknown path" }, 404);
    } catch (err) {
      // Out of free daily quota shows up here too; callers fall back to another provider.
      console.error("[engine]", err instanceof Error ? err.message : err);
      return json({ error: "model unavailable" }, 503);
    }
  },
};

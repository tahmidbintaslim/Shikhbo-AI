// The bangla-ai-engine Cloudflare Worker: free chat on Workers AI.
import type { ChatTurn } from "./teach";

const TIMEOUT_MS = 25_000;

/** One answer from the engine's /chat, or throws so the cascade tries the next provider. */
export async function engineChat(
  engine: { url: string; secret: string },
  system: string,
  messages: ChatTurn[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${engine.url}/chat`, {
    method: "POST",
    headers: { authorization: `Bearer ${engine.secret}`, "content-type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens: 700 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`engine HTTP ${res.status}`);
  const { text } = (await res.json()) as { text?: unknown };
  if (typeof text !== "string") throw new Error("engine returned no text");
  return text;
}

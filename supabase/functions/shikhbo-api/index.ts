// Shikhbo AI's only way into its Supabase storage (schema `shikhbo`).
//
// Every request needs the server secret in `x-shikhbo-secret`; Postgres
// checks it against the stored SHA-256 (shikhbo.check_secret), so this
// function holds no copy of it. Embeddings are made here with Supabase's
// built-in gte-small model (384 dimensions, mean-pooled and normalized), the
// same model for ingested pages and for questions.
//
// POST JSON, one of:
//   { "op": "match", "query": string, "grade": 1-12, "medium": "english"|"bengali", "count"?: 1-20 }
//     -> { "matches": [{ "source", "text", "similarity" }] }
//   { "op": "cache_get", "key": string }                         -> { "response": string | null }
//   { "op": "cache_set", "key": string, "response": string, "ttlSeconds": number } -> { "ok": true }
//   { "op": "rate_limit", "key": string, "limit": number, "windowSeconds": number } -> { "allowed": boolean }
//   { "op": "upsert_page", "id", "grade", "medium", "source", "text" }          -> { "ok": true }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const model = new Supabase.ai.Session("gte-small");

const MAX_TEXT = 8_000;
const MEDIA = new Set(["english", "bengali"]);

class BadRequest extends Error {}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function str(v: unknown, name: string, max = MAX_TEXT): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new BadRequest(`${name} must be a string of 1-${max} characters`);
  return v;
}

function int(v: unknown, name: string, min: number, max: number): number {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) throw new BadRequest(`${name} must be an integer ${min}-${max}`);
  return v as number;
}

function medium(v: unknown): string {
  if (typeof v !== "string" || !MEDIA.has(v)) throw new BadRequest("medium must be english or bengali");
  return v;
}

async function embed(text: string): Promise<string> {
  const vector = (await model.run(text, { mean_pool: true, normalize: true })) as number[];
  return `[${vector.join(",")}]`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = req.headers.get("x-shikhbo-secret") ?? "";
  try {
    await sql`select shikhbo.check_secret(${secret})`;
  } catch (error) {
    // check_secret raises 42501 for a wrong secret; anything else is the
    // database being unreachable or broken, not the caller's fault.
    if ((error as { code?: string }).code === "42501") return json({ error: "not allowed" }, 401);
    console.error("[shikhbo-api] secret check failed:", error instanceof Error ? error.message : error);
    return json({ error: "store unavailable" }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  try {
    switch (body.op) {
      case "match": {
        const vector = await embed(str(body.query, "query", 2_000));
        const rows = await sql`
          select source, text, similarity
          from shikhbo.match_pages(${vector}::extensions.vector, ${int(body.grade, "grade", 1, 12)},
            ${medium(body.medium)}, ${body.count === undefined ? 5 : int(body.count, "count", 1, 20)})`;
        return json({ matches: rows });
      }
      case "cache_get": {
        const [row] = await sql`select shikhbo.cache_get(${secret}, ${str(body.key, "key", 200)}) as response`;
        return json({ response: row?.response ?? null });
      }
      case "cache_set": {
        await sql`select shikhbo.cache_set(${secret}, ${str(body.key, "key", 200)},
          ${str(body.response, "response", 50_000)}, ${int(body.ttlSeconds, "ttlSeconds", 1, 86_400)})`;
        // Expired answers are not kept.
        await sql`delete from shikhbo.answer_cache where expires_at < now()`;
        return json({ ok: true });
      }
      case "rate_limit": {
        const windowSeconds = int(body.windowSeconds, "windowSeconds", 1, 86_400);
        const [row] = await sql`select shikhbo.rate_limit_hit(${secret}, ${str(body.key, "key", 200)},
          ${int(body.limit, "limit", 1, 10_000)}, ${windowSeconds}) as allowed`;
        // A counter is dropped once its window has been over for one more window.
        await sql`delete from shikhbo.rate_limit where window_start < now() - make_interval(secs => ${2 * windowSeconds})`;
        return json({ allowed: row?.allowed === true });
      }
      case "upsert_page": {
        const text = str(body.text, "text");
        const vector = await embed(text);
        await sql`select shikhbo.upsert_page(${secret}, ${str(body.id, "id", 300)},
          ${int(body.grade, "grade", 1, 12)}, ${medium(body.medium)}, ${str(body.source, "source", 300)},
          ${text}, ${vector}::extensions.vector)`;
        return json({ ok: true });
      }
      default:
        return json({ error: "unknown op" }, 400);
    }
  } catch (error) {
    if (error instanceof BadRequest) return json({ error: error.message }, 400);
    console.error("[shikhbo-api]", error instanceof Error ? error.message : error);
    return json({ error: "internal error" }, 500);
  }
});

// Shikhbo AI's only way into its Supabase storage (schema `shikhbo`).
//
// Every request needs the server secret in `x-shikhbo-secret`; Postgres
// checks it against the stored SHA-256 (shikhbo.check_secret), so this
// function holds no copy of it. Searches use bge-m3 (1024 dimensions,
// multilingual, so Bangla questions match) from the bangla-ai-engine Worker,
// fused with shared-word ranking (migrations 20261117000000, 20261120000000).
// gte-small (384 dimensions) is still written to the old NOT NULL column for
// rollback; nothing reads it any more.
//
// POST JSON, one of:
//   { "op": "match", "query": string, "grade": 1-12, "medium": "english"|"bengali", "count"?: 1-20 }
//     -> { "matches": [{ "source", "text", "similarity" }] }
//   { "op": "cache_get", "key": string }                         -> { "response": string | null }
//   { "op": "cache_set", "key": string, "response": string, "ttlSeconds": number } -> { "ok": true }
//   { "op": "rate_limit", "key": string, "limit": number, "windowSeconds": number } -> { "allowed": boolean }
//   { "op": "upsert_page", "id", "grade", "medium", "source", "text" }          -> { "ok": true }
//
// Coaching-centre pilot. Every op but centre_create and centre_info also
// needs the centre's code ("code"): the join code for students, the owner
// code for the dashboard. A wrong code or unknown centre answers 401.
//   { "op": "centre_create", "centre", "name", "joinCode", "ownerCode" }        -> { "ok": true } (409 if taken)
//   { "op": "centre_info", "centre" }                                          -> { "name": string | null }
//   { "op": "centre_match", "centre", "code", "query", "count"?: 1-20 }        -> { "name", "matches": [...] }
//   { "op": "centre_log", "centre", "code", "student", "question", "source": string | null } -> { "ok": true }
//   { "op": "centre_stats", "centre", "code", "days"?: 1-90 }                  -> see CentreStats in src/lib/store.ts
//   { "op": "centre_set_notes", "centre", "code", "title", "chunks": string[] } -> { "ok": true } (replaces the title; [] removes it)
//
// Bongo landing page:
//   { "op": "pilot_request", "name", "centre", "phone", "city"?, "students"? } -> { "ok": true }
//
// Maintenance:
//   { "op": "reindex_m3", "limit"?: 1-300 } -> { "embedded": n, "remaining": n }  (fills missing bge-m3 vectors)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const model = new Supabase.ai.Session("gte-small");

const MAX_TEXT = 8_000;
const MEDIA = new Set(["english", "bengali"]);
const MAX_NOTE_CHUNKS = 40;
const QUESTION_RETENTION_DAYS = 180;

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

function slug(v: unknown): string {
  if (typeof v !== "string" || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(v)) throw new BadRequest("centre must be 2-40 characters of a-z, 0-9 and -");
  return v;
}

function code(v: unknown, name = "code"): string {
  if (typeof v !== "string" || v.length < 8 || v.length > 64) throw new BadRequest(`${name} must be a string of 8-64 characters`);
  return v;
}

async function embed(text: string): Promise<string> {
  const vector = (await model.run(text, { mean_pool: true, normalize: true })) as number[];
  return `[${vector.join(",")}]`;
}

let engine: { url: string; secret: string } | null = null;
/** bge-m3 vectors from the bangla-ai-engine Worker, as pgvector literals. */
async function embedM3(texts: string[]): Promise<string[]> {
  if (!engine) [engine] = await sql`select url, secret from shikhbo.engine_config`;
  const res = await fetch(`${engine!.url}/embed`, {
    method: "POST",
    headers: { authorization: `Bearer ${engine!.secret}`, "content-type": "application/json" },
    body: JSON.stringify({ texts: texts.map((t) => t.slice(0, 8000)) }),
  });
  if (!res.ok) throw new Error(`engine ${res.status}`);
  return ((await res.json()).vectors as number[][]).map((v) => `[${v.join(",")}]`);
}

/** The free model quota can run out for the day; searches then use shared words only. */
function wordsOnly(err: unknown): null {
  console.warn("[shikhbo-api] embedding unavailable, word search only:", err instanceof Error ? err.message : err);
  return null;
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
        const query = str(body.query, "query", 2_000);
        const grade = int(body.grade, "grade", 1, 12);
        const med = medium(body.medium);
        const count = body.count === undefined ? 5 : int(body.count, "count", 1, 20);
        const vector = await embedM3([query]).then(([v]) => v, wordsOnly);
        // Meaning (bge-m3) and shared words fused; shared words alone when the engine is out.
        const rows = vector
          ? await sql`select source, text, similarity
              from shikhbo.match_pages_m3(${vector}::extensions.vector, ${query}, ${grade}, ${med}, ${count})`
          : await sql`select p.source, p.text, 0::float as similarity
              from shikhbo.textbook_pages p, shikhbo.any_words(${query}) q
              where p.grade = ${grade} and p.medium = ${med} and to_tsvector('simple', p.text) @@ q
              order by ts_rank_cd(to_tsvector('simple', p.text), q, 2) desc limit ${count}`;
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
        const id = str(body.id, "id", 300);
        const vector = await embed(text);
        const [m3] = await embedM3([text]);
        await sql`select shikhbo.upsert_page(${secret}, ${id},
          ${int(body.grade, "grade", 1, 12)}, ${medium(body.medium)}, ${str(body.source, "source", 300)},
          ${text}, ${vector}::extensions.vector)`;
        await sql`update shikhbo.textbook_pages set embedding_m3 = ${m3}::extensions.vector where id = ${id}`;
        return json({ ok: true });
      }
      case "centre_create": {
        await sql`insert into shikhbo.centres (slug, name, join_sha256, owner_sha256)
          values (${slug(body.centre)}, ${str(body.name, "name", 80)},
            encode(extensions.digest(${code(body.joinCode, "joinCode")}, 'sha256'), 'hex'),
            encode(extensions.digest(${code(body.ownerCode, "ownerCode")}, 'sha256'), 'hex'))`;
        return json({ ok: true });
      }
      case "centre_info": {
        const [row] = await sql`select name from shikhbo.centres where slug = ${slug(body.centre)}`;
        return json({ name: row?.name ?? null });
      }
      case "centre_match": {
        const centre = slug(body.centre);
        await sql`select shikhbo.check_centre_code(${centre}, ${code(body.code)}, false)`;
        const query = str(body.query, "query", 2_000);
        const count = body.count === undefined ? 5 : int(body.count, "count", 1, 20);
        const vector = await embedM3([query]).then(([v]) => v, wordsOnly);
        const [info] = await sql`select name from shikhbo.centres where slug = ${centre}`;
        const rows = vector
          ? await sql`select source, text, similarity
              from shikhbo.match_centre_notes_m3(${centre}, ${vector}::extensions.vector, ${query}, ${count})`
          : await sql`select n.title || ', part ' || n.part as source, n.text, 0::float as similarity
              from shikhbo.centre_notes n, shikhbo.any_words(${query}) q
              where n.centre = ${centre} and to_tsvector('simple', n.text) @@ q
              order by ts_rank_cd(to_tsvector('simple', n.text), q, 2) desc limit ${count}`;
        return json({ name: info?.name ?? centre, matches: rows });
      }
      case "centre_log": {
        const centre = slug(body.centre);
        await sql`select shikhbo.check_centre_code(${centre}, ${code(body.code)}, false)`;
        await sql`insert into shikhbo.centre_questions (centre, student, question, source)
          values (${centre}, ${str(body.student, "student", 64)}, ${str(body.question, "question", 2_000)},
            ${body.source === null ? null : str(body.source, "source", 300)})`;
        await sql`delete from shikhbo.centre_questions where asked_at < now() - make_interval(days => ${QUESTION_RETENTION_DAYS})`;
        return json({ ok: true });
      }
      case "centre_stats": {
        const centre = slug(body.centre);
        await sql`select shikhbo.check_centre_code(${centre}, ${code(body.code)}, true)`;
        const days = body.days === undefined ? 7 : int(body.days, "days", 1, 90);
        const recent = sql`centre = ${centre} and asked_at > now() - make_interval(days => ${days})`;
        const [totals] = await sql`
          select count(*)::int as questions, count(distinct student)::int as students,
            (count(*) filter (where source is null))::int as "notCovered"
          from shikhbo.centre_questions where ${recent}`;
        const topSources = await sql`
          select source, count(*)::int as questions from shikhbo.centre_questions
          where ${recent} and source is not null group by source order by questions desc, source limit 10`;
        const notCovered = await sql`
          select question, asked_at as "askedAt" from shikhbo.centre_questions
          where ${recent} and source is null order by asked_at desc limit 20`;
        const notes = await sql`
          select title, count(*)::int as parts from shikhbo.centre_notes
          where centre = ${centre} group by title order by title`;
        return json({ days, ...totals, topSources, notCoveredQuestions: notCovered, notes });
      }
      case "centre_set_notes": {
        const centre = slug(body.centre);
        await sql`select shikhbo.check_centre_code(${centre}, ${code(body.code)}, true)`;
        const title = str(body.title, "title", 120);
        if (!Array.isArray(body.chunks) || body.chunks.length > MAX_NOTE_CHUNKS) {
          throw new BadRequest(`chunks must be an array of at most ${MAX_NOTE_CHUNKS} strings`);
        }
        const chunks = body.chunks.map((c, i) => str(c, `chunks[${i}]`, 2_000));
        // Embed before the transaction, so a slow model call holds no locks.
        const vectors: string[] = [];
        for (const chunk of chunks) vectors.push(await embed(chunk));
        const m3 = chunks.length ? await embedM3(chunks) : [];
        await sql.begin(async (tx) => {
          await tx`delete from shikhbo.centre_notes where centre = ${centre} and title = ${title}`;
          for (let i = 0; i < chunks.length; i++) {
            await tx`insert into shikhbo.centre_notes (centre, title, part, text, embedding, embedding_m3)
              values (${centre}, ${title}, ${i + 1}, ${chunks[i]}, ${vectors[i]}::extensions.vector,
                ${m3[i]}::extensions.vector)`;
          }
        });
        return json({ ok: true });
      }
      case "pilot_request": {
        const phone = str(body.phone, "phone", 20);
        if (!/^\+?[0-9 -]{7,20}$/.test(phone)) throw new BadRequest("phone must be 7-20 digits");
        const opt = (v: unknown, name: string, max: number) => (v === undefined || v === "" ? null : str(v, name, max));
        await sql`insert into shikhbo.pilot_requests (name, centre, phone, city, students)
          values (${str(body.name, "name", 80)}, ${str(body.centre, "centre", 120)}, ${phone},
            ${opt(body.city, "city", 80)}, ${opt(body.students, "students", 20)})`;
        return json({ ok: true });
      }
      case "reindex_m3": {
        const limit = body.limit === undefined ? 100 : int(body.limit, "limit", 1, 300);
        const pages = await sql`select id, text from shikhbo.textbook_pages where embedding_m3 is null order by id limit ${limit}`;
        for (let i = 0; i < pages.length; i += 50) {
          const batch = pages.slice(i, i + 50);
          const vectors = await embedM3(batch.map((r: { text: string }) => r.text));
          await sql`update shikhbo.textbook_pages p set embedding_m3 = v.e::extensions.vector
            from (select unnest(${batch.map((r: { id: string }) => r.id)}::text[]) as id, unnest(${vectors}::text[]) as e) v
            where p.id = v.id`;
        }
        const notes = await sql`select centre, title, part, text from shikhbo.centre_notes where embedding_m3 is null limit ${limit}`;
        for (const n of notes) {
          const [v] = await embedM3([n.text]);
          await sql`update shikhbo.centre_notes set embedding_m3 = ${v}::extensions.vector
            where centre = ${n.centre} and title = ${n.title} and part = ${n.part}`;
        }
        const [left] = await sql`select (select count(*) from shikhbo.textbook_pages where embedding_m3 is null)
          + (select count(*) from shikhbo.centre_notes where embedding_m3 is null) as n`;
        return json({ embedded: pages.length + notes.length, remaining: Number(left.n) });
      }
      default:
        return json({ error: "unknown op" }, 400);
    }
  } catch (error) {
    if (error instanceof BadRequest) return json({ error: error.message }, 400);
    // check_centre_code raises 42501; a taken slug raises 23505.
    const pg = (error as { code?: string }).code;
    if (pg === "42501") return json({ error: "wrong code" }, 401);
    if (pg === "23505") return json({ error: "already exists" }, 409);
    console.error("[shikhbo-api]", error instanceof Error ? error.message : error);
    return json({ error: "internal error" }, 500);
  }
});

// Peace AI search: Quran ayat and hadith by meaning, Bangla or English.
// Public and read-only. It returns stored texts with their references and
// never writes an answer or a ruling.
//
//   POST { "query": string, "kinds"?: ("quran"|"hadith")[], "limit"?: 1-10 }
//     -> { matches: Match[], notice: string }
//   POST { "op": "reindex", "limit"?: 1-500 } with header x-engine-secret
//     -> { embedded: n, remaining: n }   (fills missing embeddings)
//
// Texts come from Ramadan Planner's tables (public.quran_ayahs, public.hadith);
// the search index is peace.passages (migration 20261120000000).
// Embeddings come from the bangla-ai-engine Cloudflare Worker (bge-m3).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });

const PER_MINUTE = 20; // per address
const PER_DAY = 5000; // whole site, keeps the free model quota for everyone
const MAX_QUERY = 500;

const COLLECTIONS: Record<string, string> = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abi Dawud",
  tirmidhi: "Jami at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
  nawawi: "An-Nawawi's Forty Hadith",
  qudsi: "Forty Hadith Qudsi",
  dehlawi: "Forty Hadith of Shah Waliullah Dehlawi",
};

const NOTICE =
  "These are stored texts found by meaning, not a ruling. Hadith grades are shown only when the source gives one. For a ruling, ask a scholar.";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });

let engine: { url: string; secret: string } | null = null;
async function embed(texts: string[]): Promise<number[][]> {
  if (!engine) [engine] = await sql`select url, secret from shikhbo.engine_config`;
  const res = await fetch(`${engine!.url}/embed`, {
    method: "POST",
    headers: { authorization: `Bearer ${engine!.secret}`, "content-type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`engine ${res.status}`);
  return (await res.json()).vectors;
}
const vec = (v: number[]) => `[${v.join(",")}]`;

// Fixed-window counter in the shared shikhbo.rate_limit table.
async function allowed(key: string, limit: number, seconds: number): Promise<boolean> {
  const [row] = await sql`
    insert into shikhbo.rate_limit (key, window_start, hits)
    values (${key}, to_timestamp(floor(extract(epoch from now()) / ${seconds}) * ${seconds}), 1)
    on conflict (key, window_start) do update set hits = shikhbo.rate_limit.hits + 1
    returning hits`;
  return row.hits <= limit;
}

async function hashed(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function details(ids: { id: string; kind: string; similarity: number }[]) {
  const out = [];
  for (const m of ids) {
    const score = Math.round(m.similarity * 1000) / 1000;
    if (m.kind === "quran") {
      const [, s, a] = m.id.split(":").map(Number);
      const [r] = await sql`
        select a.text_arabic, a.text_english, a.text_bengali, s.name_english, s.name_bengali
        from public.quran_ayahs a join public.quran_surahs s on s.surah_no = a.surah_no
        where a.surah_no = ${s} and a.ayah_no = ${a}`;
      if (!r) continue;
      out.push({
        id: m.id, kind: "quran", score,
        reference: `${r.name_english} ${s}:${a}`,
        referenceBengali: `${r.name_bengali ?? r.name_english} ${s}:${a}`,
        url: `https://quran.com/${s}/${a}`,
        arabic: r.text_arabic, english: r.text_english, bengali: r.text_bengali,
        grade: null,
      });
    } else {
      const [, coll, no] = m.id.split(":");
      const rows = await sql`
        select edition_name, text, grade, reference from public.hadith
        where edition_name in (${"eng-" + coll}, ${"ben-" + coll}, ${"ara-" + coll}) and hadith_no = ${Number(no)}`;
      const by = Object.fromEntries(rows.map((r: { edition_name: string }) => [r.edition_name.slice(0, 3), r]));
      const eng = by.eng;
      if (!eng) continue;
      const ref = eng.reference ?? {};
      const name = COLLECTIONS[coll] ?? coll;
      out.push({
        id: m.id, kind: "hadith", score,
        reference: ref.book !== undefined ? `${name}, book ${ref.book}, hadith ${ref.hadith}` : `${name} ${no}`,
        collection: name,
        url: null, // the stored numbering is per book, so no deep link is guessed
        arabic: by.ara?.text ?? null, english: eng.text, bengali: by.ben?.text ?? null,
        grade: eng.grade ?? null,
      });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  try {
    if (body.op === "reindex") {
      if (!engine) [engine] = await sql`select url, secret from shikhbo.engine_config`;
      if (req.headers.get("x-engine-secret") !== engine!.secret) return json({ error: "not allowed" }, 401);
      const limit = Number.isInteger(body.limit) ? Math.min(Math.max(body.limit as number, 1), 500) : 200;
      const rows = await sql`select id, search_text from peace.passages where embedding is null order by id limit ${limit}`;
      // Small batches of the opening 2000 characters: a few hadith run past
      // 10,000 characters, and a whole batch of those exceeds the model's limit.
      for (let i = 0; i < rows.length; i += 25) {
        const batch = rows.slice(i, i + 25);
        const vectors = await embed(batch.map((r: { search_text: string }) => r.search_text.slice(0, 2000)));
        await sql`
          update peace.passages p set embedding = v.e::extensions.vector
          from (select unnest(${batch.map((r: { id: string }) => r.id)}::text[]) as id,
                       unnest(${vectors.map(vec)}::text[]) as e) v
          where p.id = v.id`;
      }
      const [{ n }] = await sql`select count(*)::int as n from peace.passages where embedding is null`;
      return json({ embedded: rows.length, remaining: n });
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query || query.length > MAX_QUERY) return json({ error: `query must be 1-${MAX_QUERY} characters` }, 400);
    const kinds = Array.isArray(body.kinds) && body.kinds.length
      ? body.kinds.filter((k) => k === "quran" || k === "hadith") as string[]
      : ["quran", "hadith"];
    if (!kinds.length) return json({ error: "kinds must be quran and/or hadith" }, 400);
    const limit = Number.isInteger(body.limit) ? Math.min(Math.max(body.limit as number, 1), 10) : 5;

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (!(await allowed(`peace:ip:${await hashed(ip)}`, PER_MINUTE, 60))) return json({ error: "rate_limited" }, 429);
    if (!(await allowed("peace:daily", PER_DAY, 86_400))) return json({ error: "daily_limit" }, 429);

    const [q] = await embed([query]);
    const ids = await sql`select id, kind, similarity from peace.search(${vec(q)}::extensions.vector, ${query}, ${kinds}::text[], ${limit})`;
    return json({ matches: await details(ids), notice: NOTICE });
  } catch (error) {
    console.error("[peace-api]", error instanceof Error ? error.message : error);
    return json({ error: "search unavailable" }, 503);
  }
});

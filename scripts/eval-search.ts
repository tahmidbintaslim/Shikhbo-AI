// Scores textbook and Peace search against scripts/eval/questions.json.
//   SHIKHBO_STORE_URL=... SHIKHBO_STORE_SECRET=... bun scripts/eval-search.ts
// Peace AI's search API is public, so it runs without settings.
import questions from "./eval/questions.json";

const PEACE_URL = process.env.PEACE_API_URL ?? "https://nbsbfhtsnitkchclxlwx.supabase.co/functions/v1/peace-api";
const store = process.env.SHIKHBO_STORE_URL && process.env.SHIKHBO_STORE_SECRET
  ? { url: process.env.SHIKHBO_STORE_URL, secret: process.env.SHIKHBO_STORE_SECRET }
  : null;

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

let pass = 0;
let total = 0;
function report(ok: boolean, q: string, got: string) {
  total++;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${q}\n      ${got}`);
}

if (store) {
  console.log("# Textbook (expected book in top 3)");
  for (const t of questions.textbook) {
    const { matches } = await post(store.url, { op: "match", query: t.q, grade: t.grade, medium: t.medium, count: 3 },
      { "x-shikhbo-secret": store.secret });
    const sources: string[] = matches.map((m: { source: string }) => m.source);
    report(sources.some((s) => s.includes(t.book)), t.q, sources.join(" | "));
  }
} else {
  console.log("# Textbook skipped: set SHIKHBO_STORE_URL and SHIKHBO_STORE_SECRET");
}

console.log("# Peace (expected reference in top 5)");
for (const p of questions.peace) {
  const { matches } = await post(PEACE_URL, { query: p.q, kinds: p.kinds, limit: 5 });
  const refs: string[] = matches.map((m: { reference: string }) => m.reference);
  const ok = "any" in p && p.any
    ? refs.some((r) => p.any!.some((a) => r.endsWith(` ${a}`)))
    : matches.some((m: { english: string | null }) =>
        (p.anyText ?? []).some((w) => (m.english ?? "").toLowerCase().includes(w)));
  report(ok, p.q, refs.join(" | "));
  await new Promise((r) => setTimeout(r, 3100)); // stay under the 20-a-minute limit
}

console.log(`\n${pass}/${total} passed`);

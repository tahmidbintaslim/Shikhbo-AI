"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MAX_NOTE_CHARS } from "@/lib/centre";
import type { CentreStats } from "@/lib/store";

// Owners read the dashboard in Bangla, addressed as আপনি.
const bn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);

const ERRORS: Record<string, string> = {
  wrong_code: "কোডটি সঠিক নয়।",
  rate_limited: "অল্প সময়ে অনেক অনুরোধ হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।",
  too_large: "নোটটি এক শিরোনামের জন্য বেশি বড়। দুই ভাগে ভাগ করে আলাদা শিরোনামে দিন।",
  not_configured: "এই সাইটে ড্যাশবোর্ড এখনো চালু করা হয়নি।",
};
const GENERIC_ERROR = "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।";

export default function CentreDashboard({ slug, name }: { slug: string; name: string }) {
  const codeKey = `centre:${slug}:owner`;
  const [code, setCode] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState<CentreStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  /** One call to /api/centre; false (with the error shown) when it fails. */
  const call = useCallback(
    async (ownerCode: string, body: Record<string, unknown>): Promise<unknown | false> => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/centre", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, centre: slug, code: ownerCode }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) return data;
        if (data.code === "wrong_code") {
          sessionStorage.removeItem(codeKey);
          setCode(null);
          setStats(null);
        }
        setError(ERRORS[data.code as string] ?? GENERIC_ERROR);
        return false;
      } catch {
        setError(GENERIC_ERROR);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [slug, codeKey],
  );

  const load = useCallback(
    async (ownerCode: string) => {
      const data = await call(ownerCode, { action: "stats", days: 7 });
      if (data === false) return;
      // The owner code is kept only for this browser tab.
      sessionStorage.setItem(codeKey, ownerCode);
      setCode(ownerCode);
      setStats(data as CentreStats);
    },
    [call, codeKey],
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(codeKey);
    if (saved) void load(saved);
  }, [codeKey, load]);

  const saveNotes = async (noteTitle: string, noteText: string) => {
    if (!code) return;
    const saved = await call(code, { action: "notes", title: noteTitle, text: noteText });
    if (saved === false) return;
    setTitle("");
    setText("");
    await load(code);
  };

  if (!code || !stats) {
    const open = (e: FormEvent) => {
      e.preventDefault();
      if (draft.trim().length < 8) return setError(ERRORS.wrong_code ?? GENERIC_ERROR);
      void load(draft.trim());
    };
    return (
      <main className="khata-page max-w-xl pt-16">
        <h1>{name}</h1>
        <form onSubmit={open} noValidate className="mt-8 max-w-sm">
          <label htmlFor="owner-code" className="khata-label">
            মালিকের কোড
          </label>
          <input
            id="owner-code"
            type="password"
            className="khata-field"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby="owner-help"
          />
          <p id="owner-help" className={error ? "khata-error" : "khata-small"} role={error ? "alert" : undefined}>
            {error || "কোচিং সেন্টার খোলার সময় আপনাকে এই কোডটি দেওয়া হয়েছে।"}
          </p>
          <button type="submit" className="khata-btn khata-btn-fill khata-btn-tall mt-8" disabled={busy}>
            {busy ? "খোলা হচ্ছে..." : "ড্যাশবোর্ড দেখুন"}
          </button>
        </form>
      </main>
    );
  }

  const studentLink = `${window.location.origin}/c/${slug}`;

  return (
    <main className="khata-page max-w-3xl pb-16">
      <header className="pt-8">
        <h1 className="text-2xl leading-8">{name}</h1>
        <p className="khata-small">
          শিক্ষার্থীদের লিংক: <span className="break-all font-semibold text-ink">{studentLink}</span>
        </p>
      </header>

      {error && (
        <p role="alert" className="khata-error mt-8">
          {error}
        </p>
      )}

      <section className="mt-8" aria-labelledby="week-title">
        <h2 id="week-title">গত {bn(stats.days)} দিন</h2>
        <table className="khata-table">
          <thead>
            <tr>
              <th scope="col">সক্রিয় শিক্ষার্থী</th>
              <th scope="col">মোট প্রশ্ন</th>
              <th scope="col">নোটে উত্তর নেই</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-2xl font-semibold leading-16 text-ink-deep">
              <td>{bn(stats.students)}</td>
              <td>{bn(stats.questions)}</td>
              <td className={stats.notCovered > 0 ? "text-red-ink" : undefined}>{bn(stats.notCovered)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-16" aria-labelledby="top-title">
        <h2 id="top-title">যে নোট নিয়ে সবচেয়ে বেশি প্রশ্ন</h2>
        {stats.topSources.length === 0 ? (
          <p className="text-pencil">এখনো কোনো প্রশ্ন আসেনি। শিক্ষার্থীদের লিংকটি পাঠান।</p>
        ) : (
          <ol>
            {stats.topSources.map((s) => (
              <li key={s.source} className="khata-leader">
                <span>{s.source}</span>
                <span className="font-semibold text-ink-deep">{bn(s.questions)}টি প্রশ্ন</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-16" aria-labelledby="gaps-title">
        <h2 id="gaps-title">যে প্রশ্নের উত্তর নোটে নেই</h2>
        {stats.notCoveredQuestions.length === 0 ? (
          <p className="text-pencil">এমন কোনো প্রশ্ন নেই।</p>
        ) : (
          <>
            <p className="khata-small">এই বিষয়গুলো নোটে যোগ করলে পরের বার উত্তর পাওয়া যাবে।</p>
            <ul>
              {stats.notCoveredQuestions.map((q) => (
                <li key={q.askedAt + q.question} className="text-ink">
                  {q.question}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-16" aria-labelledby="notes-title">
        <h2 id="notes-title">আপনার নোট</h2>
        {stats.notes.length === 0 ? (
          <p className="text-pencil">এখনো কোনো নোট যোগ করা হয়নি। নিচে প্রথম নোটটি যোগ করুন।</p>
        ) : (
          <ul>
            {stats.notes.map((n) => (
              <li key={n.title} className="khata-leader">
                <span>
                  {n.title} <span className="khata-small">({bn(n.parts)} অংশ)</span>
                </span>
                <button
                  type="button"
                  className="khata-link text-red-ink hover:text-red-ink"
                  disabled={busy}
                  aria-label={`${n.title} মুছুন`}
                  onClick={() => {
                    if (window.confirm(`"${n.title}" মুছে ফেলবেন?`)) void saveNotes(n.title, "");
                  }}
                >
                  মুছুন
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && text.trim()) void saveNotes(title.trim(), text);
          }}
        >
          <label htmlFor="note-title" className="khata-label">
            শিরোনাম
          </label>
          <input
            id="note-title"
            className="khata-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            aria-describedby="note-title-help"
          />
          <p id="note-title-help" className="khata-small">
            একই শিরোনামে আবার সেভ করলে আগের লেখা বদলে যাবে।
          </p>
          <label htmlFor="note-text" className="khata-label mt-8">
            নোটের লেখা এখানে পেস্ট করুন
          </label>
          <textarea
            id="note-text"
            className="khata-field max-h-128 min-h-32"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_NOTE_CHARS}
            required
          />
          <label className="khata-small block">
            অথবা একটি .txt ফাইল বেছে নিন:{" "}
            <input
              type="file"
              accept=".txt,.md,text/plain"
              className="text-ink"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setText((await file.text()).slice(0, MAX_NOTE_CHARS));
                if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 120));
              }}
            />
          </label>
          <button type="submit" className="khata-btn khata-btn-fill khata-btn-tall mt-8" disabled={busy}>
            {busy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </button>
        </form>
      </section>
    </main>
  );
}

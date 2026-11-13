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
const Arrow = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
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
      <>
        <header className="border-b border-line">
          <div className="shell flex min-h-19 items-center justify-between gap-4 py-3">
            <span className="text-xl font-bold tracking-tight">{name}</span>
            <span className="small">Powered by Bongo AI</span>
          </div>
        </header>
        <main className="shell py-12 lg:py-16">
          <h1>
            <span className="muted">মালিকের</span> ড্যাশবোর্ড
          </h1>
          <form onSubmit={open} noValidate className="mt-8 max-w-sm">
            <label htmlFor="owner-code" className="label">
              মালিকের কোড
            </label>
            <input
              id="owner-code"
              type="password"
              className="field"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError("");
              }}
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby="owner-help"
            />
            <p id="owner-help" className={`mt-2 ${error ? "error" : "small"}`} role={error ? "alert" : undefined}>
              {error || "কোচিং সেন্টার খোলার সময় আপনাকে এই কোডটি দেওয়া হয়েছে।"}
            </p>
            <button type="submit" className="btn btn-primary btn-lg mt-6" disabled={busy}>
              {busy ? "খোলা হচ্ছে..." : "ড্যাশবোর্ড দেখুন"}
              <Arrow />
            </button>
          </form>
        </main>
      </>
    );
  }

  const studentLink = `${window.location.origin}/c/${slug}`;

  // Title on the left, content on the right, a hairline between sections.
  const section = "grid gap-x-12 gap-y-4 border-t border-line py-10 lg:grid-cols-[18rem_1fr]";

  return (
    <>
      <header className="border-b border-line">
        <div className="shell flex min-h-19 items-center justify-between gap-4 py-3">
          <span className="text-xl font-bold tracking-tight">{name}</span>
          <span className="small">Powered by Bongo AI</span>
        </div>
      </header>
      <main className="shell pb-16">
        <div className="py-10 lg:py-14">
          <h1>
            <span className="muted">ড্যাশবোর্ড</span>
            <br />
            {name}
          </h1>
          <p className="pill mt-6 flex-wrap">
            <span className="muted">শিক্ষার্থীদের লিংক:</span>
            <span className="break-all font-semibold">{studentLink}</span>
          </p>
        </div>

        {error && (
          <p role="alert" className="error mb-8">
            {error}
          </p>
        )}

        <section aria-labelledby="week-title" className="pb-12">
          <h2 id="week-title" className="eyebrow">
            গত {bn(stats.days)} দিন
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {(
              [
                ["সক্রিয় শিক্ষার্থী", stats.students, "var(--pastel-blue)"],
                ["মোট প্রশ্ন", stats.questions, "var(--pastel-yellow)"],
                ["নোটে উত্তর নেই", stats.notCovered, stats.notCovered > 0 ? "var(--pastel-peach)" : "#fff"],
              ] as const
            ).map(([label, value, fill]) => (
              <div key={label} className="flex flex-col-reverse rounded-3xl p-6 text-[#171717]" style={{ background: fill }}>
                <dt className="font-medium">{label}</dt>
                <dd className="text-5xl font-bold leading-tight tracking-tight">{bn(value)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={section} aria-labelledby="top-title">
          <h2 id="top-title" className="text-2xl">
            যে নোট নিয়ে সবচেয়ে বেশি প্রশ্ন
          </h2>
          {stats.topSources.length === 0 ? (
            <p className="muted">এখনো কোনো প্রশ্ন আসেনি। শিক্ষার্থীদের লিংকটি পাঠান।</p>
          ) : (
            <ol className="rows">
              {stats.topSources.map((s) => (
                <li key={s.source}>
                  <span>{s.source}</span>
                  <span className="whitespace-nowrap font-semibold">{bn(s.questions)}টি প্রশ্ন</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={section} aria-labelledby="gaps-title">
          <div>
            <h2 id="gaps-title" className="text-2xl">
              যে প্রশ্নের উত্তর নোটে নেই
            </h2>
            {stats.notCoveredQuestions.length > 0 && (
              <p className="small mt-2">এই বিষয়গুলো নোটে যোগ করলে পরের বার উত্তর পাওয়া যাবে।</p>
            )}
          </div>
          {stats.notCoveredQuestions.length === 0 ? (
            <p className="muted">এমন কোনো প্রশ্ন নেই।</p>
          ) : (
            <ul className="rows">
              {stats.notCoveredQuestions.map((q) => (
                <li key={q.askedAt + q.question}>{q.question}</li>
              ))}
            </ul>
          )}
        </section>

        <section className={section} aria-labelledby="notes-title">
          <h2 id="notes-title" className="text-2xl">
            আপনার নোট
          </h2>
          <div>
            {stats.notes.length === 0 ? (
              <p className="muted">এখনো কোনো নোট যোগ করা হয়নি। নিচে প্রথম নোটটি যোগ করুন।</p>
            ) : (
              <ul className="rows">
                {stats.notes.map((n) => (
                  <li key={n.title}>
                    <span>
                      {n.title} <span className="small">({bn(n.parts)} অংশ)</span>
                    </span>
                    <button
                      type="button"
                      className="link"
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
              className="card mt-8 rounded-3xl p-5 md:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim() && text.trim()) void saveNotes(title.trim(), text);
              }}
            >
              <label htmlFor="note-title" className="label">
                শিরোনাম
              </label>
              <input
                id="note-title"
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                aria-describedby="note-title-help"
              />
              <p id="note-title-help" className="small mt-2">
                একই শিরোনামে আবার সেভ করলে আগের লেখা বদলে যাবে।
              </p>
              <label htmlFor="note-text" className="label mt-6">
                নোটের লেখা এখানে পেস্ট করুন
              </label>
              <textarea
                id="note-text"
                className="field max-h-128 min-h-32"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_NOTE_CHARS}
                required
              />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "সেভ হচ্ছে..." : "সেভ করুন"}
                  <Arrow />
                </button>
                <label className="btn btn-outline file relative">
                  অথবা একটি .txt ফাইল বেছে নিন
                  <input
                    type="file"
                    accept=".txt,.md,text/plain"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setText((await file.text()).slice(0, MAX_NOTE_CHARS));
                      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 120));
                    }}
                  />
                </label>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

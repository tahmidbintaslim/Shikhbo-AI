"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
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
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-4">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <form onSubmit={open} className="flex flex-col gap-3">
          <Input
            type="password"
            label="মালিকের কোড"
            value={draft}
            // An invalid field blocks the form, so typing clears the error.
            onValueChange={(v) => {
              setDraft(v);
              setError("");
            }}
            autoComplete="off"
            isInvalid={Boolean(error)}
            errorMessage={error || undefined}
          />
          <Button type="submit" color="primary" isDisabled={busy}>
            ড্যাশবোর্ড দেখুন
          </Button>
        </form>
      </main>
    );
  }

  const studentLink = `${window.location.origin}/c/${slug}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-sm text-foreground/70">
          গত {bn(stats.days)} দিন। শিক্ষার্থীদের লিংক: <span className="break-all font-mono">{studentLink}</span>
        </p>
      </header>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <dl className="grid grid-cols-3 gap-3 text-center">
        {(
          [
            ["সক্রিয় শিক্ষার্থী", stats.students],
            ["মোট প্রশ্ন", stats.questions],
            ["নোটে উত্তর নেই", stats.notCovered],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="glass-card rounded-xl p-3">
            <dd className="text-2xl font-semibold">{bn(value)}</dd>
            <dt className="text-xs text-foreground/70">{label}</dt>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 text-lg font-semibold">যে নোট নিয়ে সবচেয়ে বেশি প্রশ্ন</h2>
        {stats.topSources.length === 0 ? (
          <p className="text-sm text-foreground/70">এখনো কোনো প্রশ্ন আসেনি।</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {stats.topSources.map((s) => (
              <li key={s.source}>
                {s.source}: {bn(s.questions)}টি প্রশ্ন
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">যে প্রশ্নের উত্তর নোটে নেই</h2>
        {stats.notCoveredQuestions.length === 0 ? (
          <p className="text-sm text-foreground/70">এমন কোনো প্রশ্ন নেই।</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {stats.notCoveredQuestions.map((q) => (
              <li key={q.askedAt + q.question}>{q.question}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">আপনার নোট</h2>
        {stats.notes.length === 0 ? (
          <p className="text-sm text-foreground/70">এখনো কোনো নোট যোগ করা হয়নি।</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {stats.notes.map((n) => (
              <li key={n.title} className="flex items-center justify-between gap-2">
                <span>
                  {n.title} ({bn(n.parts)} অংশ)
                </span>
                <Button
                  size="sm"
                  variant="light"
                  color="danger"
                  isDisabled={busy}
                  aria-label={`${n.title} মুছুন`}
                  onPress={() => {
                    if (window.confirm(`"${n.title}" মুছে ফেলবেন?`)) void saveNotes(n.title, "");
                  }}
                >
                  মুছুন
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && text.trim()) void saveNotes(title.trim(), text);
          }}
        >
          <Input
            label="শিরোনাম"
            description="একই শিরোনামে আবার সেভ করলে আগের লেখা বদলে যাবে।"
            value={title}
            onValueChange={setTitle}
            maxLength={120}
            isRequired
          />
          <Textarea
            label="নোটের লেখা এখানে পেস্ট করুন"
            value={text}
            onValueChange={setText}
            maxLength={MAX_NOTE_CHARS}
            minRows={6}
            maxRows={16}
            isRequired
          />
          <label className="text-sm">
            অথবা একটি .txt ফাইল বেছে নিন:{" "}
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
          <Button type="submit" color="primary" isDisabled={busy}>
            {busy ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </Button>
        </form>
      </section>
    </main>
  );
}

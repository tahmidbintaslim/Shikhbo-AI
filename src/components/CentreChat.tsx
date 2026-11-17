"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import ChatInterface from "@/components/ChatInterface";
import { ChatProvider, useChatContext } from "@/components/ChatProvider";

const T = {
  bn: {
    joinLabel: "জয়েন কোড",
    joinHelp: "তোমার কোচিং থেকে পাওয়া জয়েন কোডটি লেখো।",
    join: "শুরু করো",
    rejected: "জয়েন কোডটি কাজ করেনি। আবার লেখো।",
    switchTo: "English",
    switchLabel: "Switch to English",
  },
  en: {
    joinLabel: "Join code",
    joinHelp: "Enter the join code your coaching centre gave you.",
    join: "Start",
    rejected: "That join code did not work. Please enter it again.",
    switchTo: "বাংলা",
    switchLabel: "বাংলায় দেখো",
  },
} as const;

const Arrow = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// What a student should know before joining; all three are how the centre
// tutor behaves today.
const STEPS = [
  ["var(--pastel-yellow)", "জয়েন কোড একবার লেখো", "Enter the join code once"],
  ["var(--pastel-blue)", "সেন্টারের নোট থেকে প্রশ্ন করো", "Ask about your centre's notes"],
  ["var(--pastel-peach)", "নোটে না থাকলে টিউটর সেটাই বলে", "If the notes do not cover it, the tutor says so"],
] as const;

function Header({ name }: { name: string }) {
  const { locale, setLocale, setLanguage } = useChatContext();
  const next = locale === "bn" ? "en" : "bn";
  return (
    <header className="border-b border-line">
      <div className="shell flex min-h-19 items-center justify-between gap-4 py-3">
        <h1 className="text-xl leading-7">{name}</h1>
        <button
          type="button"
          className="btn btn-outline"
          aria-label={T[locale].switchLabel}
          onClick={() => {
            // One switch for the page and the answers, as on the home page.
            setLocale(next);
            setLanguage(next === "bn" ? "bengali" : "english");
          }}
        >
          {T[locale].switchTo}
        </button>
      </div>
    </header>
  );
}

const subscribeNever = () => () => {};

/**
 * The join code and the student id live only in this browser, so nothing
 * is rendered on the server or during hydration.
 */
export default function CentreChat(props: { slug: string; name: string }) {
  const inBrowser = useSyncExternalStore(subscribeNever, () => true, () => false);
  return inBrowser ? <CentreChatInBrowser {...props} /> : null;
}

function CentreChatInBrowser({ slug, name }: { slug: string; name: string }) {
  const codeKey = `centre:${slug}:code`;
  const [saved, setSaved] = useState(() => {
    let student = localStorage.getItem("centre:student");
    if (!student) {
      student = crypto.randomUUID();
      localStorage.setItem("centre:student", student);
    }
    return { code: localStorage.getItem(codeKey), student };
  });
  const [draft, setDraft] = useState("");
  const [rejected, setRejected] = useState(false);

  if (!saved.code) {
    const join = (e: FormEvent) => {
      e.preventDefault();
      const code = draft.trim();
      if (code.length < 8) return setRejected(true);
      localStorage.setItem(codeKey, code);
      setRejected(false);
      setSaved({ ...saved, code });
    };
    return (
      <>
        <header className="border-b border-line">
          <div className="shell flex min-h-19 items-center justify-between gap-4 py-3">
            <span className="text-xl font-bold tracking-tight">{name}</span>
            <span className="small">Powered by Bongo AI</span>
          </div>
        </header>
        <main className="shell grid items-center gap-x-16 gap-y-12 py-12 lg:grid-cols-[1fr_auto] lg:py-16">
          <div>
            <p className="pill">
              <span className="font-semibold">নিজের সেন্টারের নোট</span>
              <span className="muted">Your own centre's notes</span>
            </p>
            <h1 className="mt-8">
              <span className="muted">নোট থেকে প্রশ্ন করো,</span>
              <br />
              {name}
            </h1>
            <form onSubmit={join} noValidate className="mt-8 max-w-sm">
              <label htmlFor="join-code" className="label">
                {T.bn.joinLabel} / {T.en.joinLabel}
              </label>
              <input
                id="join-code"
                className="field"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setRejected(false);
                }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={rejected}
                aria-describedby="join-help"
              />
              <p id="join-help" className={`mt-2 ${rejected ? "error" : "small"}`} role={rejected ? "alert" : undefined}>
                {rejected ? `${T.bn.rejected} ${T.en.rejected}` : `${T.bn.joinHelp} ${T.en.joinHelp}`}
              </p>
              <button type="submit" className="btn btn-primary btn-lg mt-6">
                {T.bn.join} / {T.en.join}
                <Arrow />
              </button>
            </form>
          </div>
          <div className="phone mx-auto">
            <div className="p-4">
              <p className="mx-auto h-5 w-20 rounded-full bg-[#171717]" aria-hidden="true" />
              <p className="mt-5 font-bold">{name}</p>
              <ol className="mt-3 space-y-3">
                {STEPS.map(([fill, bnText, enText]) => (
                  <li key={enText} className="rounded-2xl p-4 text-[#171717]" style={{ background: fill }}>
                    <span className="block font-semibold">{bnText}</span>
                    <span className="block text-sm">{enText}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </main>
      </>
    );
  }

  const forget = () => {
    localStorage.removeItem(codeKey);
    setRejected(true);
    setSaved({ ...saved, code: null });
  };

  return (
    <ChatProvider centre={{ slug, name, code: saved.code, student: saved.student, onWrongCode: forget }}>
      <div className="flex min-h-dvh flex-col">
        <Header name={name} />
        <main className="shell shell-narrow flex-1 py-8 md:py-12">
          <div className="card rounded-3xl p-4 md:p-6">
            <ChatInterface />
          </div>
        </main>
        <p className="small shell shell-narrow pb-8">Powered by Bongo AI</p>
      </div>
    </ChatProvider>
  );
}

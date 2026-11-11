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

function Header({ name }: { name: string }) {
  const { locale, setLocale, setLanguage } = useChatContext();
  const next = locale === "bn" ? "en" : "bn";
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 pt-8">
      <h1 className="text-2xl leading-8">{name}</h1>
      <button
        type="button"
        className="khata-btn"
        aria-label={T[locale].switchLabel}
        onClick={() => {
          // One switch for the page and the answers, as on the home page.
          setLocale(next);
          setLanguage(next === "bn" ? "bengali" : "english");
        }}
      >
        {T[locale].switchTo}
      </button>
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
      <main className="khata-page max-w-xl pt-16">
        <h1>{name}</h1>
        <form onSubmit={join} noValidate className="mt-8 max-w-sm">
          <label htmlFor="join-code" className="khata-label">
            {T.bn.joinLabel} / {T.en.joinLabel}
          </label>
          <input
            id="join-code"
            className="khata-field"
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
          <p id="join-help" className={rejected ? "khata-error" : "khata-small"} role={rejected ? "alert" : undefined}>
            {rejected ? `${T.bn.rejected} ${T.en.rejected}` : `${T.bn.joinHelp} ${T.en.joinHelp}`}
          </p>
          <button type="submit" className="khata-btn khata-btn-fill khata-btn-tall mt-8">
            {T.bn.join} / {T.en.join}
          </button>
        </form>
      </main>
    );
  }

  const forget = () => {
    localStorage.removeItem(codeKey);
    setRejected(true);
    setSaved({ ...saved, code: null });
  };

  return (
    <ChatProvider centre={{ slug, name, code: saved.code, student: saved.student, onWrongCode: forget }}>
      <div className="khata-page flex min-h-dvh max-w-3xl flex-col">
        <Header name={name} />
        <main className="mt-8 flex-1">
          <ChatInterface />
        </main>
        <p className="khata-small pb-8">Powered by Bongo AI</p>
      </div>
    </ChatProvider>
  );
}

"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
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
    <header className="flex items-center justify-between gap-3 px-1 py-2">
      <h1 className="text-lg font-semibold">{name}</h1>
      <Button
        size="sm"
        variant="bordered"
        aria-label={T[locale].switchLabel}
        onPress={() => {
          // One switch for the page and the answers, as on the home page.
          setLocale(next);
          setLanguage(next === "bn" ? "bengali" : "english");
        }}
      >
        {T[locale].switchTo}
      </Button>
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
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-4">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <form onSubmit={join} className="flex flex-col gap-3">
          <Input
            label={`${T.bn.joinLabel} / ${T.en.joinLabel}`}
            description={`${T.bn.joinHelp} ${T.en.joinHelp}`}
            value={draft}
            // An invalid field blocks the form, so typing clears the error.
            onValueChange={(v) => {
              setDraft(v);
              setRejected(false);
            }}
            autoComplete="off"
            isInvalid={rejected}
            errorMessage={rejected ? `${T.bn.rejected} ${T.en.rejected}` : undefined}
          />
          <Button type="submit" color="primary">
            {T.bn.join} / {T.en.join}
          </Button>
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
      <main className="mx-auto flex h-dvh max-w-3xl flex-col p-3">
        <Header name={name} />
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10">
          <ChatInterface />
        </div>
        <p className="pt-2 text-center text-xs text-foreground/60">Powered by Bongo AI</p>
      </main>
    </ChatProvider>
  );
}

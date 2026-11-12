"use client";
import { ChatProvider, useChatContext } from "@/components/ChatProvider";
import { GRADES, INDEXED_GRADES } from "@/lib/teach-limits";
import CONTENT, { SUBJECTS } from "@/data/landing-content";
import { Select, SelectItem } from "@heroui/select";
import ChatAutoMount from "@/components/ChatAutoMount";
import "./globals.css";

export default function Page() {
  return (
    <ChatProvider>
      <Landing />
    </ChatProvider>
  );
}

// The home page is one page of an exercise copy: the cover-label fields
// (class, language) run along the top, the question is written on the lines,
// and the subjects are the copy's contents list.
function Landing() {
  const {
    locale,
    setLocale,
    grade: selectedClass,
    setGrade,
    setLanguage,
    setInput,
  } = useChatContext();
  const chatInputId = "chat-input"; // convention: ChatInterface input should use this id

  const L = CONTENT[locale];
  const num = (n: number | string) =>
    locale === "bn" ? String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d) : String(n);
  const classOptions = GRADES.map((g) => ({
    id: `${g}`,
    label: `${L.classLabel} ${num(g)}`,
    ready: INDEXED_GRADES.includes(g),
  }));
  const disabledClasses = classOptions.filter((c) => !c.ready).map((c) => c.id);
  const classSupport = locale === "bn" ? `শ্রেণি ${num(selectedClass)} সহায়তা` : `Class ${selectedClass} support`;

  const handleSubjectSelect = (subject: (typeof SUBJECTS)[number]) => {
    setInput(locale === "bn" ? `আমি ${subject.name.bn} এর সাহায্য চাই।` : `I need help with ${subject.name.en}.`);
    document.getElementById(chatInputId)?.focus();
  };

  return (
    <div className="khata-page">
      <header className="flex flex-wrap items-end justify-between gap-x-6 pt-8">
        <div className="font-heading text-2xl leading-8 text-ink-deep">{L.brand}</div>
        <div className="flex items-end gap-4">
          <Select
            aria-label={L.classLabel}
            size="sm"
            variant="underlined"
            selectedKeys={new Set([selectedClass])}
            disabledKeys={disabledClasses}
            onSelectionChange={(keys) => {
              const next = Array.from(keys as Set<string>)[0];
              if (next) setGrade(next);
            }}
            className="w-32"
            classNames={{
              // before: a 44px touch area around the one-line trigger.
              trigger: "relative h-8 min-h-8 border-b-[1.5px] border-ink px-0 shadow-none after:hidden before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
              value: "text-base font-semibold !text-ink",
              selectorIcon: "text-ink",
              popoverContent: "rounded-xs border-[1.5px] border-ink bg-paper p-0",
              listbox: "p-1",
            }}
          >
            {classOptions.map((c) => (
              <SelectItem key={c.id} textValue={c.label}>
                {c.ready ? c.label : `${c.label} · ${L.soon}`}
              </SelectItem>
            ))}
          </Select>
          <button
            type="button"
            className="khata-btn"
            aria-label={locale === "bn" ? "Switch to English and the English version books" : "বাংলা ও বাংলা ভার্সন বইয়ে যাও"}
            onClick={() => {
              // One switch: the site language is also the textbook medium.
              const next = locale === "bn" ? "en" : "bn";
              setLocale(next);
              setLanguage(next === "bn" ? "bengali" : "english");
            }}
          >
            {locale === "bn" ? "English" : "বাংলা"}
          </button>
        </div>
      </header>

      <main role="main" aria-label={L.main} className="mt-8 grid grid-cols-1 gap-x-16 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h1>
            {L.title.split("\n").map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="max-w-[60ch] text-pencil">{L.subtitle}</p>
          <div id="chat-interface" className="mt-8 min-h-64">
            <ChatAutoMount />
          </div>
        </section>

        <aside id="subjects" className="mt-8 lg:col-span-5 lg:mt-0" aria-labelledby="contents-title">
          <h2 id="contents-title" className="lg:mt-8">
            {L.contents}
          </h2>
          <p className="khata-small">{L.contentsHelp}</p>
          <ul>
            {SUBJECTS.map((s) => {
              const name = locale === "bn" ? s.name.bn : s.name.en;
              const status = s.indexed ? classSupport : L.soon;
              return (
                <li key={s.id} className="khata-leader">
                  <button
                    type="button"
                    className="khata-link"
                    disabled={!s.indexed}
                    aria-label={`${name} - ${status}`}
                    onClick={() => handleSubjectSelect(s)}
                  >
                    {name}
                  </button>
                  <span className="khata-small">{status}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </main>

      <footer className="khata-small mt-16 flex flex-wrap justify-between gap-x-6 pb-8">
        <span>{L.footer}</span>
        <span>© {num(new Date().getFullYear())} {L.brand}</span>
      </footer>
    </div>
  );
}

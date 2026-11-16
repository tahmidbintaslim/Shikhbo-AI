"use client";
import { ChatProvider, useChatContext } from "@/components/ChatProvider";
import { GRADES, INDEXED_GRADES } from "@/lib/teach-limits";
import CONTENT, { REPO_URL, SUBJECTS } from "@/data/landing-content";
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

const Arrow = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Pencil = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M3 17l1-4L14 3l3 3L7 16l-4 1z" stroke="#5eead4" strokeWidth="1.75" strokeLinejoin="round" />
  </svg>
);
const Mark = ({ ok }: { ok: boolean }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" className="mt-1 flex-none">
    <circle cx="10" cy="10" r="10" fill={ok ? "#c9f3e6" : "#e2e8f0"} />
    <path d={ok ? "M6 10.5l2.5 2.5L14 7.5" : "M6.5 10h7"} stroke={ok ? "#064e43" : "#475569"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Hero with the working chat in a laptop frame, then: how it works, subjects
// and classes, what it can and cannot do, questions, footer.
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
  const focusChat = () => document.getElementById(chatInputId)?.focus();

  const handleSubjectSelect = (subject: (typeof SUBJECTS)[number]) => {
    setInput(locale === "bn" ? `আমি ${subject.name.bn} এর সাহায্য চাই।` : `I need help with ${subject.name.en}.`);
    focusChat();
  };
  const sections = [
    ["#how", L.nav.how],
    ["#subjects", L.nav.subjects],
    ["#limits", L.nav.limits],
    ["#faq", L.nav.faq],
  ] as const;

  return (
    <div className="mint">
      <div className="shell sticky top-3 z-40 pt-3 md:top-5">
        <header className="flex items-center justify-between gap-3 rounded-2xl bg-white/85 px-4 py-2.5 shadow-[0_8px_30px_-12px_rgb(15_23_42/0.18)] backdrop-blur md:px-6">
          <div className="text-xl font-bold tracking-tight">{L.brand}</div>
          <nav aria-label={L.navLabel} className="hidden items-center gap-6 lg:flex">
            {sections.map(([href, label]) => (
              <a key={href} href={href} className="link font-medium">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-outline"
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
            <button type="button" className="btn btn-black max-sm:hidden" onClick={focusChat}>
              {L.ask}
            </button>
          </div>
        </header>
      </div>

      <main role="main" aria-label={L.main}>
        <section className="shell grid grid-cols-1 items-center gap-x-10 gap-y-12 pb-20 pt-10 lg:grid-cols-12 lg:pb-28 lg:pt-16">
          <div className="lg:col-span-5">
            <p className="pill">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
              {L.badge}
            </p>
            <h1 className="mt-4">
              <span className="gradient-text">{L.titleAccent}</span> {L.titleRest}
            </h1>
            <p className="muted mt-5 max-w-[46ch] text-lg">{L.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={focusChat}>
                <Pencil />
                {L.cta}
              </button>
              <a href="#how" className="link">
                {L.ctaLink}
                <Arrow />
              </a>
            </div>
          </div>

          <div className="relative lg:col-span-7 lg:px-10 lg:py-8">
            <ul className="mb-4 flex flex-wrap gap-2 lg:contents">
              {L.chips.map((chip, i) => (
                <li
                  key={chip}
                  className={`chip ${["chip-yellow lg:left-2 lg:top-3", "chip-navy lg:right-0 lg:top-4", "chip-lilac lg:bottom-1 lg:left-0", "chip-mint lg:bottom-3 lg:right-4"][i]} lg:absolute lg:z-10`}
                >
                  {chip}
                </li>
              ))}
            </ul>
            <div className="laptop-screen">
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
                    {L.brand} {L.tutor}
                  </span>
                  <Select
                    aria-label={L.classLabel}
                    size="sm"
                    variant="bordered"
                    selectedKeys={new Set([selectedClass])}
                    disabledKeys={disabledClasses}
                    onSelectionChange={(keys) => {
                      const next = Array.from(keys as Set<string>)[0];
                      if (next) setGrade(next);
                    }}
                    className="w-36"
                    classNames={{
                      trigger: "h-11 min-h-11 border border-line shadow-none data-[hover=true]:border-accent-strong",
                      value: "text-base font-semibold !text-text",
                      popoverContent: "border border-line bg-surface",
                    }}
                  >
                    {classOptions.map((c) => (
                      <SelectItem key={c.id} textValue={c.label}>
                        {c.ready ? c.label : `${c.label} · ${L.soon}`}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div id="chat-interface" className="min-h-80 p-4 md:p-5">
                  <ChatAutoMount />
                </div>
              </div>
            </div>
            <div className="laptop-base" aria-hidden="true" />
          </div>
        </section>

        <section id="how" className="shell py-16" aria-labelledby="how-title">
          <h2 id="how-title">{L.howTitle}</h2>
          <p className="muted mt-2 text-lg">{L.howLead}</p>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {L.steps.map((step, i) => (
              <li key={step.title} className="card p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-strong" aria-hidden="true">
                  {num(i + 1)}
                </span>
                <h3 className="mt-4">{step.title}</h3>
                <p className="muted mt-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="subjects" className="shell py-16" aria-labelledby="subjects-title">
          <h2 id="subjects-title">{L.subjectsTitle}</h2>
          <p className="muted mt-2 text-lg">{L.contentsHelp}</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            {SUBJECTS.map((s) => {
              const name = locale === "bn" ? s.name.bn : s.name.en;
              const status = s.indexed ? classSupport : L.soon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="card flex min-h-24 w-full cursor-pointer flex-col items-start justify-between gap-2 p-4 text-start transition-colors hover:border-accent-strong disabled:cursor-not-allowed disabled:bg-transparent disabled:shadow-none disabled:hover:border-line md:p-5"
                    disabled={!s.indexed}
                    aria-label={`${name} - ${status}`}
                    onClick={() => handleSubjectSelect(s)}
                  >
                    <span className={`text-lg font-bold ${s.indexed ? "" : "text-muted"}`}>{name}</span>
                    <span className={`text-sm font-medium ${s.indexed ? "text-accent-strong" : "text-muted"}`}>{status}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <h3 className="mt-10">{L.classesTitle}</h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-6">
            {classOptions.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-2 border-b border-line py-2.5">
                <span className={c.ready ? "font-semibold" : "text-muted"}>{c.label}</span>
                <span className={`text-sm ${c.ready ? "font-semibold text-accent-strong" : "text-muted"}`}>
                  {c.ready ? L.available : L.soon}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section id="limits" className="shell py-16" aria-labelledby="limits-title">
          <h2 id="limits-title">{L.limitsTitle}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {(
              [
                [L.canTitle, L.can, true],
                [L.cannotTitle, L.cannot, false],
              ] as const
            ).map(([title, items, ok]) => (
              <div key={title} className={`card p-6 ${ok ? "" : "bg-transparent shadow-none"}`}>
                <h3>{title}</h3>
                <ul className="mt-4 space-y-3">
                  {items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Mark ok={ok} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="shell py-16" aria-labelledby="faq-title">
          <h2 id="faq-title">{L.faqTitle}</h2>
          <div className="mt-8 grid items-start gap-3 md:grid-cols-2">
            {L.faq.map((item) => (
              <details key={item.q} className="faq card">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 bg-[#06201f] text-[#d6ebe8]">
        <div className="shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xl font-bold text-white">{L.brand}</div>
            <p className="mt-3 text-sm">{L.footerAbout}</p>
            <p className="mt-2 text-sm">{L.footer}</p>
          </div>
          <div>
            <h3 className="text-base text-white">{L.footerPages}</h3>
            <ul className="mt-2 text-sm">
              {sections.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="inline-flex min-h-11 items-center hover:text-white hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base text-white">{L.footerCentres}</h3>
            <p className="mt-3 text-sm">{L.footerCentresText}</p>
          </div>
          <div>
            <h3 className="text-base text-white">{L.footerProject}</h3>
            <a href={REPO_URL} className="inline-flex min-h-11 items-center text-sm underline hover:text-white">
              {L.footerCode}
            </a>
            <p className="text-sm">{L.footerBooks}</p>
          </div>
        </div>
        <div className="shell overflow-hidden pb-6">
          <div className="select-none text-[clamp(3.5rem,15vw,12rem)] font-bold leading-none tracking-tighter text-white" aria-hidden="true">
            {L.brand}
          </div>
          <p className="mt-6 border-t border-white/15 pt-4 text-sm">
            © {num(new Date().getFullYear())} {L.brand}
          </p>
        </div>
      </footer>
    </div>
  );
}

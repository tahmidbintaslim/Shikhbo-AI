"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { useChatContext } from "@/components/ChatProvider";
import { MAX_USER_CHARS } from "@/lib/teach-limits";

// The chat is the page of the exercise copy: the student's question is
// written in pen, the worked answer follows, and the teacher's red tick
// closes it. Labels follow the UI language picked in the header.
const LABELS = {
  en: {
    clear: "New page",
    clearLabel: "Clear conversation",
    export: "Save",
    exportLabel: "Export conversation",
    empty: "Ask anything from your Class 1 books, or start with one of these:",
    emptyCentre: (name: string) => `Ask anything from ${name}'s notes.`,
    question: "Question",
    answer: "Answer",
    writing: "Writing",
    inputLabel: "Chat input",
    placeholder: "Ask a question...",
    send: "Send",
    sendLabel: "Send message",
    sending: "Sending...",
  },
  bn: {
    clear: "নতুন পাতা",
    clearLabel: "কথোপকথন মুছে ফেলো",
    export: "সেভ করো",
    exportLabel: "কথোপকথন এক্সপোর্ট করো",
    empty: "প্রথম শ্রেণির বই থেকে যেকোনো প্রশ্ন করো, অথবা এগুলো দিয়ে শুরু করো:",
    emptyCentre: (name: string) => `${name}-এর নোট থেকে যেকোনো প্রশ্ন করো।`,
    question: "প্রশ্ন",
    answer: "উত্তর",
    writing: "লিখছি",
    inputLabel: "প্রশ্ন লেখার ঘর",
    placeholder: "একটি প্রশ্ন লেখো...",
    send: "পাঠাও",
    sendLabel: "প্রশ্ন পাঠাও",
    sending: "পাঠানো হচ্ছে...",
  },
} as const;

// Starter questions per textbook medium; each one is answerable from the
// indexed Class 1 books.
const STARTERS = {
  bengali: ["৩ আর ৪ যোগ করলে কত হয়?", "স্বরবর্ণ কয়টি?", "১০ থেকে ৪ বিয়োগ করলে কত থাকে?"],
  english: ["What is 3 + 4?", "How do I say hello in English?", "Count from 1 to 10 with me"],
} as const;

/** The teacher's tick, drawn after a new answer is written. */
function Tick() {
  return (
    <svg className="khata-tick" viewBox="0 0 28 22" fill="none" aria-hidden="true">
      <path d="M3 12.5 10 19 25 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ChatInterface() {
  const {
    locale,
    language,
    centreName,
    messages,
    input,
    setInput,
    loading,
    scrollRef,
    sendMessage,
    clearMessages,
    exportConversation,
  } = useChatContext();
  const t = LABELS[locale];

  // Answers already on the page when it opens are not written out again.
  const [seen] = useState(() => new Set(messages.map((m) => m.id)));
  const formRef = useRef<HTMLFormElement>(null);
  const count = useRef(messages.length);
  useEffect(() => {
    if (messages.length > count.current || loading) {
      // Keep the line you write on in view as the page fills up.
      formRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    count.current = messages.length;
  }, [messages.length, loading]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    await sendMessage();
  };

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} id="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <div>
            <p className="text-pencil">{centreName ? t.emptyCentre(centreName) : t.empty}</p>
            <ul>
              {/* The starters are about the Class 1 textbooks, not a centre's notes. */}
              {(centreName ? [] : STARTERS[language]).map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    className="khata-link"
                    onClick={() => {
                      setInput(q);
                      document.getElementById("chat-input")?.focus();
                    }}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="flex justify-end gap-5">
              <button type="button" className="khata-link khata-small" onClick={clearMessages} aria-label={t.clearLabel}>
                {t.clear}
              </button>
              <button type="button" className="khata-link khata-small" onClick={exportConversation} aria-label={t.exportLabel}>
                {t.export}
              </button>
            </div>
            <ol>
              {messages.map((m) =>
                m.role === "user" ? (
                  <li key={m.id} className="mt-8 text-ink first:mt-0">
                    <span className="font-bold">{t.question}: </span>
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </li>
                ) : (
                  <li key={m.id} className="relative">
                    <span className="sr-only">{t.answer}:</span>
                    <div className={`khata-prose ${seen.has(m.id) ? "" : "khata-write"}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight]}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {m.source && <p className="khata-source">{m.source}</p>}
                    <Tick />
                  </li>
                ),
              )}
              {loading && (
                <li className="text-pencil">
                  <span className="khata-writing">{t.writing}</span>
                </li>
              )}
            </ol>
          </>
        )}
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-8 flex scroll-mb-8 items-end gap-3">
        <textarea
          id="chat-input"
          aria-label={t.inputLabel}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          maxLength={MAX_USER_CHARS}
          rows={1}
          className="khata-field max-h-40 flex-1"
        />
        <button type="submit" className="khata-btn khata-btn-fill khata-btn-tall" disabled={loading} aria-label={t.sendLabel}>
          {loading ? t.sending : t.send}
        </button>
      </form>
    </div>
  );
}

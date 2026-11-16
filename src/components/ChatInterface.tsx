"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { useChatContext } from "@/components/ChatProvider";
import { MAX_USER_CHARS } from "@/lib/teach-limits";

// The student's question is a bubble on the right; the worked answer follows
// on the left with the source it came from. Labels follow the UI language
// picked in the header.
const LABELS = {
  en: {
    clear: "Start over",
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
    clear: "নতুন করে শুরু",
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

/** Marks the source line under an answer. */
function Tick() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      // Keep the question box in view as the answers grow.
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
            <p className="muted">{centreName ? t.emptyCentre(centreName) : t.empty}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {/* The starters are about the Class 1 textbooks, not a centre's notes. */}
              {(centreName ? [] : STARTERS[language]).map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    className="starter"
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
              <button type="button" className="link small" onClick={clearMessages} aria-label={t.clearLabel}>
                {t.clear}
              </button>
              <button type="button" className="link small" onClick={exportConversation} aria-label={t.exportLabel}>
                {t.export}
              </button>
            </div>
            <ol className="space-y-4">
              {messages.map((m) =>
                m.role === "user" ? (
                  <li key={m.id} className="bubble w-fit">
                    <span className="sr-only">{t.question}: </span>
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </li>
                ) : (
                  <li key={m.id} className={seen.has(m.id) ? "" : "rise"}>
                    <span className="sr-only">{t.answer}:</span>
                    <div className="prose-answer">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight]}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {m.source && (
                      <p className="source">
                        <Tick />
                        {m.source}
                      </p>
                    )}
                  </li>
                ),
              )}
              {loading && (
                <li className="muted">
                  <span className="dots">{t.writing}</span>
                </li>
              )}
            </ol>
          </>
        )}
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-5 flex scroll-mb-8 items-end gap-2">
        <textarea
          id="chat-input"
          aria-label={t.inputLabel}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          maxLength={MAX_USER_CHARS}
          rows={1}
          className="field max-h-40 flex-1"
        />
        <button type="submit" className="btn btn-primary" disabled={loading} aria-label={t.sendLabel}>
          {loading ? t.sending : t.send}
        </button>
      </form>
    </div>
  );
}

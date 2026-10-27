"use client";
import { FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { useChatContext } from "@/components/ChatProvider";
import { MAX_USER_CHARS } from "@/lib/teach-limits";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Avatar } from "@heroui/avatar";
import { User, Cpu } from "lucide-react";

// HeroUI's `dark:` variant matches only an element that itself has the
// `.dark` class, so dark styles inside the chat use `[.dark_&]:`, which
// matches under the `.dark` class next-themes puts on <html>.

// Labels follow the UI language picked in the header (Bangla by default).
const LABELS = {
  en: {
    clear: "New chat",
    clearLabel: "Clear conversation",
    export: "Save",
    exportLabel: "Export conversation",
    empty: "Ask anything from your Class 1 books, or try one of these:",
    inputLabel: "Chat input",
    placeholder: "Ask a question...",
    send: "Send",
    sendLabel: "Send message",
    sending: "Sending...",
  },
  bn: {
    clear: "নতুন চ্যাট",
    clearLabel: "কথোপকথন মুছে ফেলো",
    export: "সেভ করো",
    exportLabel: "কথোপকথন এক্সপোর্ট করো",
    empty: "প্রথম শ্রেণির বই থেকে যেকোনো প্রশ্ন করো, অথবা এগুলো চেষ্টা করো:",
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

export default function ChatInterface() {
  const {
    locale,
    language,
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

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    await sendMessage();
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground rounded-2xl">
      <div className="flex justify-end p-2 border-b border-white/10">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="light"
            size="sm"
            onPress={clearMessages}
            isDisabled={messages.length === 0}
            aria-label={t.clearLabel}
            className="text-xs"
          >
            {t.clear}
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onPress={exportConversation}
            isDisabled={messages.length === 0}
            aria-label={t.exportLabel}
            className="text-xs"
          >
            {t.export}
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="px-4 py-3 overflow-auto h-full space-y-4"
        id="chat-messages"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-foreground/70 max-w-xs">{t.empty}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS[language].map((q) => (
                <Button
                  key={q}
                  size="sm"
                  radius="full"
                  variant="bordered"
                  className="border-white/25 text-foreground"
                  onPress={() => {
                    setInput(q);
                    document.getElementById("chat-input")?.focus();
                  }}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar
                icon={m.role === "user" ? <User /> : <Cpu />}
                className={`flex-shrink-0 ${
                  m.role === "user"
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary/20 text-secondary"
                }`}
              />
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "glass-card bg-black/5 [.dark_&]:bg-white/5"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="text-sm prose prose-sm max-w-none prose-code:before:content-none prose-code:after:content-none [.dark_&]:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                      components={{
                        code({ className, children, ...props }) {
                          const isInline = !className;
                          return isInline ? (
                            <code
                              className="rounded bg-black/10 px-1 py-0.5 text-xs [.dark_&]:bg-white/10"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <pre className="overflow-x-auto rounded-lg bg-black/10 p-3 text-xs [.dark_&]:bg-white/10">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                )}
                <div className="text-[10px] opacity-60 mt-1 text-right">
                  {m.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-white/10 bg-background/80 backdrop-blur-md"
      >
        <div className="flex gap-2 items-center">
          <Textarea
            id="chat-input"
            aria-label={t.inputLabel}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            maxLength={MAX_USER_CHARS}
            className="glass-input flex-1 resize-none rounded-lg text-sm focus:outline-none"
            minRows={1}
            maxRows={5}
          />
          <div className="flex">
            <Button
              type="submit"
              color="primary"
              isDisabled={loading}
              aria-label={t.sendLabel}
              className="text-sm hover:shadow-md"
            >
              {loading ? t.sending : t.send}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

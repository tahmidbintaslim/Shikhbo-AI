"use client";
import { FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { useChat } from "@/hooks/useChat";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/react";
import { Accordion, AccordionItem } from "@heroui/react";
import { Avatar } from "@heroui/avatar";
import { User, Cpu } from "lucide-react";

export default function ChatInterface() {
  const {
    messages,
    input,
    setInput,
    loading,
    scrollRef,
    sendMessage,
    clearMessages,
    exportConversation,
  } = useChat("en");

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    await sendMessage();
  };

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground rounded-lg">
      <div className="flex justify-end p-2 border-b border-white/10">
        <Accordion isCompact className="w-fit">
          <AccordionItem
            key="1"
            aria-label="More actions"
            title="Actions"
            className="text-xs"
          >
            <div className="flex flex-col">
              <Button
                type="button"
                variant="light"
                size="sm"
                onClick={clearMessages}
                aria-label="Clear conversation"
                className="text-xs hover:underline"
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="light"
                size="sm"
                onClick={exportConversation}
                aria-label="Export conversation"
                className="text-xs hover:underline"
              >
                Export
              </Button>
            </div>
          </AccordionItem>
        </Accordion>
      </div>
      <div
        ref={scrollRef}
        className="px-4 py-3 overflow-auto h-full space-y-4"
        id="chat-messages"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-foreground/60">
            Start a conversation
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
                    : "glass-card bg-black/5 dark:bg-white/5" // Use glass-card for AI response
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                      components={{
                        code({ className, children, ...props }) {
                          const isInline = !className;
                          return isInline ? (
                            <code
                              className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <pre className="overflow-x-auto rounded-lg bg-black/10 p-3 text-xs dark:bg-white/10">
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
            aria-label="Chat input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="glass-input flex-1 resize-none rounded-lg text-sm focus:outline-none"
            minRows={1}
            maxRows={5}
          />
          <div className="flex">
            <Button
              type="submit"
              color="primary"
              isDisabled={loading}
              aria-label="Send message"
              className="text-sm hover:shadow-md"
            >
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useChat, type Locale } from "@/hooks/useChat";

type ChatContextValue = ReturnType<typeof useChat> & {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * The one chat state for the page. The header selectors (class, medium,
 * UI language), the subject cards and the chat box all read and write it,
 * so what the student picks is what /api/teach receives.
 */
export function ChatProvider({
  children,
  initialLocale = "bn",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const chat = useChat(locale);
  return (
    <ChatContext.Provider value={{ ...chat, locale, setLocale }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) {
    throw new Error("useChatContext must be used inside <ChatProvider>");
  }
  return value;
}

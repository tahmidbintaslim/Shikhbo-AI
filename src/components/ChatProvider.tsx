"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useChat, type CentreChat, type Locale } from "@/hooks/useChat";

type ChatContextValue = ReturnType<typeof useChat> & {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Set on a coaching centre's page; the chat box then speaks for that centre. */
  centreName: string | undefined;
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
  centre,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  centre?: CentreChat;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const chat = useChat(locale, centre);
  return (
    <ChatContext.Provider value={{ ...chat, locale, setLocale, centreName: centre?.name }}>
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

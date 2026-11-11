"use client";
import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";
import { generateId } from "@/lib/utils";
import { errorText } from "@/lib/chat-errors";
import { MAX_ASSISTANT_CHARS, recentTurns, type Language } from "@/lib/teach-limits";

export type Locale = "en" | "bn";

/** A coaching centre's tutor (/c/[slug]): answers come from that centre's notes. */
export interface CentreChat {
    slug: string;
    name: string;
    /** The join code the student typed. */
    code: string;
    /** A random id kept in this browser, so the owner can count students without names. */
    student: string;
    /** The server refused the join code. */
    onWrongCode: () => void;
}

const translations = {
    en: {
        fetchError: "Error connecting to the teacher bot.",
        apiError: "Sorry, I couldn't find an answer.",
        rateLimited: "Too many questions in a short time. Please wait a minute and try again.",
        notConfigured: "The tutor is not set up on this site yet, so it cannot answer questions right now.",
        providersUnavailable: "The AI service did not answer. Please try again in a minute.",
        wrongCode: "That join code did not work. Please enter it again.",
    },
    bn: {
        fetchError: "শিক্ষক বট সংযোগ করতে ত্রুটি হয়েছে।",
        apiError: "দুঃখিত, আমি উত্তরটি খুঁজে পাচ্ছি না।",
        rateLimited: "অল্প সময়ে অনেক প্রশ্ন করা হয়েছে। এক মিনিট পরে আবার চেষ্টা করো।",
        notConfigured: "এই সাইটে টিউটর এখনো চালু করা হয়নি, তাই এখন প্রশ্নের উত্তর দিতে পারছে না।",
        providersUnavailable: "এআই সেবা থেকে উত্তর আসেনি। এক মিনিট পরে আবার চেষ্টা করো।",
        wrongCode: "জয়েন কোডটি কাজ করেনি। আবার লেখো।",
    },
};

export function useChat(locale: Locale, centre?: CentreChat) {
    // Each centre keeps its own conversation, apart from the open tutor's.
    const storageKey = centre ? `centre:${centre.slug}:messages` : 'shikbo-ai-messages';
    const [messages, setMessages] = useState<Message[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    return parsed.map((msg: any) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }));
                } catch (e) {
                    return [];
                }
            }
        }
        return [];
    });
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [grade, setGrade] = useState("1");
    const [language, setLanguage] = useState<Language>("bengali");

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMessage: Message = {
            id: generateId(),
            content: input,
            role: "user",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);
        try {
            // The API accepts user/assistant turns only and keeps the last
            // MAX_HISTORY of them, starting at a user turn; send just that,
            // without ids or timestamps.
            const history = recentTurns(
                [...messages, userMessage].filter((m) => m.role === "user" || m.role === "assistant"),
            ).map(({ role, content }) => ({
                role,
                content: role === "assistant" ? content.slice(0, MAX_ASSISTANT_CHARS) : content,
            }));
            const res = await fetch("/api/teach", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(centre ? { "x-centre-student": centre.student } : {}),
                },
                body: JSON.stringify(
                    centre
                        ? { messages: history, language, centre: { slug: centre.slug, code: centre.code } }
                        : { messages: history, grade, language },
                ),
            });
            const data = await res.json().catch(() => ({}));
            const wrongCode = res.status === 401 && data.code === "wrong_code";
            if (wrongCode) centre?.onWrongCode();
            const fallback = wrongCode
                ? translations[locale].wrongCode
                : errorText(translations[locale], res.status, data.code);
            const assistantMessage: Message = {
                id: generateId(),
                content: (res.ok && typeof data.result === "string" && data.result) || fallback,
                role: "assistant",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMessage: Message = {
                id: generateId(),
                content: translations[locale].fetchError,
                role: "assistant",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearMessages = () => {
        setMessages([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(storageKey);
        }
    };

    const exportConversation = () => {
        const conversationText = messages.map(msg =>
            `${msg.role === 'user' ? 'You' : (centre?.name ?? 'Shikhbo AI')}: ${msg.content}\n`
        ).join('\n');

        const blob = new Blob([conversationText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shikbo-ai-conversation-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return {
        messages,
        input,
        setInput,
        loading,
        grade,
        setGrade,
        language,
        setLanguage,
        scrollRef,
        sendMessage,
        clearMessages,
        exportConversation,
    };
}

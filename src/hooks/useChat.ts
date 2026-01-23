"use client";
import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";
import { generateId } from "@/lib/utils";

type Locale = "en" | "bn";

const translations = {
    en: {
        fetchError: "Error connecting to the teacher bot.",
        apiError: "Sorry, I couldn't find an answer.",
    },
    bn: {
        fetchError: "শিক্ষক বট সংযোগ করতে ত্রুটি হয়েছে।",
        apiError: "দুঃখিত, আমি উত্তরটি খুঁজে পাচ্ছি না।",
    },
};

export function useChat(locale: Locale) {
    const [messages, setMessages] = useState<Message[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('shikbo-ai-messages');
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
    const [grade, setGrade] = useState(new Set(["5"]));

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('shikbo-ai-messages', JSON.stringify(messages));
        }
    }, [messages]);
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
            const res = await fetch("/api/teach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input: userMessage.content, grade: Array.from(grade)[0] }),
            });
            const data = await res.json();
            const assistantMessage: Message = {
                id: generateId(),
                content: data.result || translations[locale].apiError,
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
            localStorage.removeItem('shikbo-ai-messages');
        }
    };

    const exportConversation = () => {
        const conversationText = messages.map(msg =>
            `${msg.role === 'user' ? 'You' : 'Shikhbo AI'}: ${msg.content}\n`
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
        scrollRef,
        sendMessage,
        clearMessages,
        exportConversation,
    };
}

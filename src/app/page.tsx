"use client";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Textarea } from "@heroui/input";
import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { Divider } from "@heroui/divider";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Spacer } from "@heroui/spacer";
import { Image } from "@heroui/image";
import {
  Volume2,
  StopCircle,
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Settings,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

// ... (Interface, Type, and SpeechRecognition declaration remain the same) ...

type Locale = "en" | "bn";

const translations = {
  en: {
    title: "Shikhbo AI",
    subtitle: "Your Virtual Tutor",
    classPlaceholder: "Class",
    thinking: "Thinking...",
    inputPlaceholder: "Ask anything...",
    fetchError: "Error connecting to the teacher bot.",
    apiError: "Sorry, I couldn't find an answer.",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
  },
  bn: {
    title: "শিখবো এআই",
    subtitle: "তোমার ভার্চুয়াল গৃহশিক্ষক",
    classPlaceholder: "ক্লাস",
    thinking: "চিন্তা করছি...",
    inputPlaceholder: "কিছু জিজ্ঞাসা করুন...",
    fetchError: "শিক্ষক বট সংযোগ করতে ত্রুটি হয়েছে।",
    apiError: "দুঃখিত, আমি উত্তরটি খুঁজে পাচ্ছি না।",
    language: "ভাষা",
    theme: "থিম",
    light: "লাইট",
    dark: "ডার্ক",
  },
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function StudentBot() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessage, setSpeakingMessage] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [isListening, setIsListening] = useState(false);

  const {
    messages,
    input,
    setInput,
    loading,
    grade,
    setGrade,
    scrollRef,
    sendMessage,
  } = useChat(locale);
  const recognitionRef = useRef<any>(null);
  const { theme, setTheme } = useTheme();

  // ... (useEffect for scrolling, speak, stopSpeaking, STT, and handleSend remain the same) ...
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (content: string) => {
    if (isSpeaking) window.speechSynthesis.cancel();
    setSpeakingMessage(content);
    const utterance = new SpeechSynthesisUtterance(content);
    const voices = window.speechSynthesis.getVoices();
    const bengaliVoice = voices.find(
      (v) => v.lang.includes("bn-BD") || v.lang.includes("bn-IN"),
    );
    if (bengaliVoice) utterance.voice = bengaliVoice;
    utterance.lang = "bn-BD";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessage(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingMessage(null);
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = locale === "bn" ? "bn-BD" : "en-US";
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join("");
        setInput(transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [locale]);

  const handleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const t = translations[locale];
  const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
    key: (i + 1).toString(),
    label: `${t.classPlaceholder} ${i + 1}`,
  }));

  return (
    <div className="page-shell">
      <section className="hero-section">
        <Card className="hero-card">
          <CardBody className="hero-body">
            <div className="hero-copy">
              <div className="hero-badge">
                <Chip color="primary" variant="flat">
                  Shikhbo AI
                </Chip>
                <Chip variant="flat">শিখবো AI</Chip>
              </div>
              <h1 className="hero-title">
                প্রশ্ন? থাকতেই পারে!
                <span className="hero-title-accent">উত্তর? সেকেন্ডেই!</span>
              </h1>
              <p className="hero-subtitle">
                বাংলাদেশের শিক্ষার্থীদের জন্য স্মার্ট সহায়ক—জাতীয় কারিকুলাম
                অনুযায়ী দ্রুত ও নির্ভুল উত্তর।
              </p>
              <div className="hero-actions">
                <Button as="a" href="#chat" color="primary" size="lg">
                  ফ্রি’তে ট্রাই করুন
                </Button>
                <Button as="a" href="#pricing" variant="bordered" size="lg">
                  প্যাকেজ দেখুন
                </Button>
              </div>
              <div className="hero-note">
                Shikhbo AI: শিক্ষার্থী, অভিভাবক ও শিক্ষকের একাডেমিক সব প্রশ্নের
                ইনস্ট্যান্ট সল্যুশন!
              </div>
            </div>
            <div className="hero-visual">
              <Card className="hero-preview">
                <CardBody className="hero-image-body">
                  <Image
                    src="/hero-chat.svg"
                    alt="Shikhbo AI chat preview"
                    className="hero-image"
                  />
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="logos-section">
        <div className="logos-strip">
          <span className="logos-title">
            Trusted by learners across Bangladesh
          </span>
          <div className="logos-row">
            <Chip variant="flat">SSC</Chip>
            <Chip variant="flat">HSC</Chip>
            <Chip variant="flat">NCTB</Chip>
            <Chip variant="flat">Coaching</Chip>
            <Chip variant="flat">School</Chip>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <Card className="stat-card">
            <CardBody>
              <p className="stat-value">৫,০০০+</p>
              <p className="stat-label">শিক্ষার্থী ইতোমধ্যে যুক্ত হয়েছে</p>
            </CardBody>
          </Card>
          <Card className="stat-card">
            <CardBody>
              <p className="stat-value">১ লক্ষ+</p>
              <p className="stat-label">প্রশ্নের সমাধান</p>
            </CardBody>
          </Card>
          <Card className="stat-card">
            <CardBody>
              <p className="stat-value">১০,০০০+</p>
              <p className="stat-label">ছবি দিয়ে প্রশ্নের সমাধান</p>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="chat-section" id="chat">
        <Card className="chat-card">
          <CardHeader className="chat-header">
            <div className="header-brand">
              <Avatar
                icon={<Bot className="icon-lg" />}
                color="primary"
                className="avatar-lg"
              />
              <div>
                <h1 className="header-title">Shikhbo AI</h1>
                <p className="header-subtitle">{t.subtitle}</p>
                <div className="gamification-badges">
                  <Chip color="secondary" variant="flat" size="sm">
                    🔥 Study Streak: 5 days
                  </Chip>
                  <Chip color="primary" variant="dot" size="sm">
                    📚 Level 3 Scholar
                  </Chip>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <Autocomplete
                aria-label="Select Class"
                selectedKey={Array.from(grade)[0] || "5"}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    setGrade(new Set([key]));
                  }
                }}
                size="sm"
                variant="bordered"
                color="primary"
                className="class-select"
                classNames={{
                  popoverContent: "popover-glass select-popover",
                }}
                placeholder={`${t.classPlaceholder}`}
                defaultItems={gradeOptions}
              >
                {(item) => (
                  <AutocompleteItem key={item.key}>
                    {item.label}
                  </AutocompleteItem>
                )}
              </Autocomplete>

              <Dropdown
                classNames={{
                  content: "popover-glass",
                }}
              >
                <DropdownTrigger>
                  <Button isIconOnly variant="bordered" className="icon-button">
                    <Settings className="icon-md" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Settings menu"
                  onAction={(key) => {
                    if (key === "light" || key === "dark") setTheme(key);
                    if (key === "en" || key === "bn") setLocale(key);
                  }}
                >
                  <DropdownSection title={t.language} showDivider>
                    <DropdownItem key="en" startContent={<Globe size={18} />}>
                      English
                    </DropdownItem>
                    <DropdownItem key="bn" startContent={<Globe size={18} />}>
                      বাংলা
                    </DropdownItem>
                  </DropdownSection>
                  <DropdownSection title={t.theme}>
                    <DropdownItem key="light" startContent={<Sun size={18} />}>
                      {t.light}
                    </DropdownItem>
                    <DropdownItem key="dark" startContent={<Moon size={18} />}>
                      {t.dark}
                    </DropdownItem>
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
            </div>
          </CardHeader>

          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Today's Progress</span>
              <span className="progress-value">3/5 questions answered</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill w-3/5"></div>
            </div>
            <div className="progress-reward">
              <Chip color="secondary" size="sm">
                🎯 2 more to earn a badge!
              </Chip>
            </div>
          </div>

          <CardBody className="chat-body">
            <div ref={scrollRef} className="message-scroll">
              <div className="message-list">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`message-row ${message.role}`}
                  >
                    {message.role === "assistant" && (
                      <Avatar
                        icon={<Bot className="icon-md" />}
                        color="primary"
                        className="avatar-md"
                      />
                    )}
                    <Card className={`message-card ${message.role}`}>
                      <CardBody className="message-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[
                            rehypeRaw,
                            rehypeSanitize,
                            rehypeHighlight,
                          ]}
                          components={{
                            code({
                              node,
                              inline,
                              className,
                              children,
                              ...props
                            }: any) {
                              return (
                                <pre className="code-block">
                                  <code className={className} {...props}>
                                    {String(children).replace(/\n$/, "")}
                                  </code>
                                </pre>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        <div className="message-timestamp">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </CardBody>
                      {message.role === "assistant" && (
                        <>
                          <Divider className="message-divider" />
                          <CardFooter className="message-footer">
                            {isSpeaking &&
                            speakingMessage === message.content ? (
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={stopSpeaking}
                              >
                                <StopCircle className="icon-md" />
                              </Button>
                            ) : (
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color={theme === "dark" ? "default" : "primary"}
                                onPress={() => speak(message.content)}
                              >
                                <Volume2 className="icon-md" />
                              </Button>
                            )}
                          </CardFooter>
                        </>
                      )}
                    </Card>
                    {message.role === "user" && (
                      <Avatar
                        icon={<User className="icon-md" />}
                        color="default"
                        className="avatar-md"
                      />
                    )}
                  </motion.div>
                ))}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="message-row assistant"
                  >
                    <Card className="thinking-card">
                      <CardBody className="message-body">
                        <div className="thinking-row">
                          <Spinner size="sm" color="default" />
                          <span>{t.thinking}</span>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          </CardBody>
          <CardFooter className="chat-footer">
            <div className="input-row">
              <Button
                isIconOnly
                variant={isListening ? "solid" : "light"}
                color={isListening ? "danger" : "primary"}
                onPress={handleListen}
              >
                {isListening ? (
                  <MicOff className="icon-md" />
                ) : (
                  <Mic className="icon-md" />
                )}
              </Button>
              <Textarea
                placeholder={t.inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                minRows={1}
                maxRows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="input-expand"
              />
              <Button
                isIconOnly
                color="primary"
                size="lg"
                onPress={sendMessage}
                disabled={loading || !input.trim()}
              >
                <Send className="icon-md" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </section>

      <section className="audience-section">
        <div className="section-head">
          <h2 className="section-title">শিখবো AI কাদের জন্য?</h2>
          <p className="section-subtitle">
            শিক্ষার্থী, অভিভাবক ও শিক্ষকের জন্য সহজ, দ্রুত সমাধান।
          </p>
        </div>
        <div className="audience-grid">
          <Card className="audience-card">
            <CardBody>
              <Avatar icon={<User className="icon-md" />} color="primary" />
              <h3 className="audience-title">শিক্ষার্থী</h3>
              <p className="audience-text">
                ক্লাসভিত্তিক ব্যাখ্যা, দ্রুত উত্তর, এবং স্মার্ট প্র্যাকটিস।
              </p>
            </CardBody>
          </Card>
          <Card className="audience-card">
            <CardBody>
              <Avatar icon={<Bot className="icon-md" />} color="primary" />
              <h3 className="audience-title">শিক্ষক</h3>
              <p className="audience-text">
                উদাহরণসহ ব্যাখ্যা, প্রশ্নসেট তৈরিতে সহায়ক, সময় বাঁচায়।
              </p>
            </CardBody>
          </Card>
          <Card className="audience-card">
            <CardBody>
              <Avatar icon={<Globe className="icon-md" />} color="primary" />
              <h3 className="audience-title">অভিভাবক</h3>
              <p className="audience-text">
                সন্তানের শেখার গতি বুঝতে ও সহায়তা দিতে সহজ সহচর।
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="section-head">
          <h2 className="section-title">সহজ ও সাশ্রয়ী প্যাকেজ</h2>
          <p className="section-subtitle">
            আপনার প্রয়োজন অনুযায়ী পছন্দের প্যাকেজটি বেছে নিন। সব প্যাকেজেই আছে
            Shikhbo AI ব্যবহারের সুবিধা।
          </p>
        </div>
        <div className="pricing-kicker">
          <Chip variant="flat">Coming Soon</Chip>
        </div>
        <div className="pricing-shell">
          <div className="pricing-grid pricing-blur" aria-hidden="true">
            <Card className="pricing-card">
              <CardBody>
                <p className="pricing-name">ফ্রি</p>
                <p className="pricing-price">৳০</p>
                <p className="pricing-desc">১০ দিনের মেয়াদ</p>
                <Divider className="pricing-divider" />
                <ul className="pricing-list">
                  <li>প্রতিদিন ৩টি প্রশ্ন করতে পারবে</li>
                  <li>AI মডেল: Shikhbo AI Pro</li>
                  <li>ইমেজ আপলোড করতে পারবেন</li>
                </ul>
                <Spacer y={1} />
                <Button color="primary" variant="flat">
                  ফ্রিতে শুরু করুন
                </Button>
              </CardBody>
            </Card>
            <Card className="pricing-card">
              <CardBody>
                <p className="pricing-name">স্টার্টার</p>
                <p className="pricing-price">৳৪৯</p>
                <p className="pricing-desc">৩ দিনের মেয়াদ</p>
                <Divider className="pricing-divider" />
                <ul className="pricing-list">
                  <li>আনলিমিটেড প্রশ্ন</li>
                  <li>AI মডেল: Shikhbo AI Pro</li>
                  <li>ইমেজ আপলোড করতে পারবেন</li>
                </ul>
                <Spacer y={1} />
                <Button color="primary">এখনই কিনে নিন</Button>
              </CardBody>
            </Card>
            <Card className="pricing-card">
              <CardBody>
                <p className="pricing-name">বুস্ট</p>
                <p className="pricing-price">৳৭৯</p>
                <p className="pricing-desc">৭ দিনের মেয়াদ</p>
                <Divider className="pricing-divider" />
                <ul className="pricing-list">
                  <li>আনলিমিটেড প্রশ্ন</li>
                  <li>AI মডেল: Shikhbo AI Pro</li>
                  <li>ইমেজ আপলোড করতে পারবেন</li>
                </ul>
                <Spacer y={1} />
                <Button variant="bordered">এখনই কিনে নিন</Button>
              </CardBody>
            </Card>
            <Card className="pricing-card highlight">
              <CardBody>
                <Chip color="primary" variant="flat" className="pricing-tag">
                  মোস্ট পপুলার
                </Chip>
                <p className="pricing-name">প্রো</p>
                <p className="pricing-price">৳২৭৯</p>
                <p className="pricing-desc">৩০ দিনের মেয়াদ</p>
                <Divider className="pricing-divider" />
                <ul className="pricing-list">
                  <li>আনলিমিটেড প্রশ্ন</li>
                  <li>AI মডেল: Shikhbo AI Pro</li>
                  <li>ইমেজ আপলোড করতে পারবেন</li>
                </ul>
                <Spacer y={1} />
                <Button color="primary">এখনই কিনে নিন</Button>
              </CardBody>
            </Card>
            <Card className="pricing-card">
              <CardBody>
                <p className="pricing-name">এলিট</p>
                <p className="pricing-price">৳৭৪৯</p>
                <p className="pricing-desc">৯০ দিনের মেয়াদ</p>
                <Divider className="pricing-divider" />
                <ul className="pricing-list">
                  <li>আনলিমিটেড প্রশ্ন</li>
                  <li>AI মডেল: Shikhbo AI Pro</li>
                  <li>ইমেজ আপলোড করতে পারবেন</li>
                </ul>
                <Spacer y={1} />
                <Button variant="bordered">এখনই কিনে নিন</Button>
              </CardBody>
            </Card>
          </div>
          <div className="pricing-overlay">
            <Chip color="primary" variant="flat">
              Coming Soon
            </Chip>
            <h3 className="pricing-overlay-title">প্রাইসিং শিগগিরই আসছে</h3>
            <p className="pricing-overlay-text">
              আমরা এখন MVP পর্যায়ে আছি। প্রি‑সিড রিলিজের জন্য অপেক্ষা করুন।
            </p>
            <Button variant="bordered" size="sm">
              নোটিফাই মি
            </Button>
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="section-head">
          <h2 className="section-title">শিখো শিক্ষার্থীদের মতামত</h2>
          <p className="section-subtitle">
            বাস্তব শিক্ষার্থীদের অভিজ্ঞতা থেকে অনুপ্রেরণা।
          </p>
        </div>
        <div className="testimonials-grid">
          <Card className="testimonial-card">
            <CardBody>
              <p className="testimonial-quote">
                “প্রতিটা কনসেপ্ট ক্লিয়ার করতে আমাকে অনেক বেশি হেল্প করেছে
                অ্যানিমেটেড লেসনগুলো”
              </p>
              <p className="testimonial-name">নিবিড় কর্মকার</p>
              <p className="testimonial-meta">Academic Program '25 SSC '25</p>
            </CardBody>
          </Card>
          <Card className="testimonial-card">
            <CardBody>
              <p className="testimonial-quote">
                “লাইভ ক্লাসে অ্যাডভান্সড প্রবলেম সলভিংও করায়”
              </p>
              <p className="testimonial-name">ইশরাত</p>
              <p className="testimonial-meta">HSC '26 একাডেমিক প্রোগ্রাম</p>
            </CardBody>
          </Card>
          <Card className="testimonial-card">
            <CardBody>
              <p className="testimonial-quote">
                “অল্প খরচে এত ভালো টিচার, আমাদের স্বপ্নের চেয়ে বেশি”
              </p>
              <p className="testimonial-name">মুশফিক-এর মা</p>
              <p className="testimonial-meta">SSC '25 GPA-5</p>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}

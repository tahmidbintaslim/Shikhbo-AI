"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import CONTENT, { SUBJECTS } from "@/data/landing-content";
import { SimpleFooter } from "@/components/SimpleFooter";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import {
  Chip,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useTheme } from "next-themes";
import ChatAutoMount from "@/components/ChatAutoMount";
import "./globals.css";

// START: Icons and ThemeSwitcher
const MoonIcon = (props: any) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <path
      d="M21.53 15.93c-.16-.27-.61-.69-1.73-.49a8.46 8.46 0 01-1.88.13 8.409 8.409 0 01-5.91-2.82 8.068 8.068 0 01-1.44-8.66c.44-1.01.13-1.54-.09-1.76s-.77-.55-1.83-.11a10.318 10.318 0 00-6.32 10.21 10.475 10.475 0 007.04 8.99 10 10 0 002.89.55c.16.01.32.02.48.02a10.5 10.5 0 008.47-4.27c.67-.93.49-1.519.32-1.79z"
      fill="currentColor"
    />
  </svg>
);

const SunIcon = (props: any) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <g fill="currentColor">
      <path d="M19 12a7 7 0 11-7-7 7 7 0 017 7z" />
      <path d="M12 22.96a.969.969 0 01-1-.96v-.08a1 1 0 012 0 1.038 1.038 0 01-1 1.04zm7.14-2.82a1.024 1.024 0 01-.71-.29l-.13-.13a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.984.984 0 01-.7.29zm-14.28 0a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a1 1 0 01-.7.29zM22 13h-.08a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zM2.08 13H2a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zm16.93-7.01a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a.984.984 0 01-.7.29zm-14.02 0a1.024 1.024 0 01-.71-.29l-.13-.14a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.97.97 0 01-.7.3zM12 3.04a.969.969 0 01-1-.96V2a1 1 0 012 0 1.038 1.038 0 01-1 1.04z" />
    </g>
  </svg>
);

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Switch
      isSelected={theme === "dark"}
      onValueChange={(isSelected) => setTheme(isSelected ? "dark" : "light")}
      aria-label="Toggle color theme"
      size="md"
      color="secondary"
      thumbIcon={({ isSelected, className }) =>
        isSelected ? (
          <MoonIcon className={className} />
        ) : (
          <SunIcon className={className} />
        )
      }
    />
  );
}
// END: Icons and ThemeSwitcher

type Locale = "en" | "bn";

function ComparisonTable({ t, locale }: { t: any; locale: Locale }) {
  const criteriaLabel = locale === "bn" ? "মানদণ্ড" : "Criteria";
  const privateLabel =
    t?.compare?.private ??
    (locale === "bn" ? "প্রাইভেট টিউটর" : "Private Tutor");
  const usLabel = t?.compare?.us ?? "Shikhbo AI";
  const rows = t?.compare?.points || [];
  const columns = [
    { name: criteriaLabel, uid: "criteria" },
    { name: privateLabel, uid: "private" },
    { name: usLabel, uid: "us" },
  ];

  const renderCell = useCallback((row: any, columnKey: React.Key) => {
    switch (columnKey) {
      case "criteria":
        return (
          <div className="text-xs uppercase tracking-widest text-default-500 dark:text-default-400">
            {row.label}
          </div>
        );
      case "private":
        return (
          <div className="text-default-600 dark:text-default-300">{row.p}</div>
        );
      case "us":
        return (
          <Chip
            color="primary"
            variant="flat"
            className="text-sm font-semibold"
          >
            {row.u}
          </Chip>
        );
      default:
        return row.label;
    }
  }, []);

  return (
    <motion.section className="col-span-12 mt-6 max-w-6xl mx-auto w-full">
      <Card className="glass-panel overflow-hidden">
        <CardBody>
          <div className="relative px-2 py-2">
            <div className="relative bg-linear-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-default-500 dark:text-default-400">
                    {locale === "bn" ? "তুলনা" : "Comparison"}
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-foreground">
                    {t?.compare?.title}
                  </div>
                </div>
              </div>
              <div className="-mx-2 overflow-x-auto px-2 pb-1">
                <Table
                  aria-label={t?.compare?.title ?? criteriaLabel}
                  removeWrapper
                  classNames={{
                    base: "min-w-[420px] sm:min-w-[520px] w-full",
                    table: "border-separate border-spacing-y-3",
                    thead: "hidden sm:table-header-group",
                    th: "text-xs uppercase tracking-widest text-default-500 dark:text-default-400 bg-foreground/5 dark:bg-foreground/10",
                    tr: "bg-black/10 dark:bg-white/10",
                    td: "bg-black/10 dark:bg-black/60 border border-white/40 dark:border-white/25 text-sm sm:text-base text-foreground",
                  }}
                >
                  <TableHeader columns={columns}>
                    {(column) => (
                      <TableColumn
                        key={column.uid}
                        align={column.uid === "criteria" ? "start" : "center"}
                      >
                        {column.name}
                      </TableColumn>
                    )}
                  </TableHeader>
                  <TableBody items={rows}>
                    {(row: any) => (
                      <TableRow key={row.label}>
                        {(columnKey) => (
                          <TableCell
                            className={
                              columnKey === "criteria"
                                ? "rounded-l-xl"
                                : columnKey === "us"
                                  ? "rounded-r-xl"
                                  : undefined
                            }
                          >
                            {renderCell(row, columnKey)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.section>
  );
}

export default function Page() {
  const [locale, setLocale] = useState<Locale>("bn");
  const [selectedClass, setSelectedClass] = useState<string>("5");

  const { setInput, setGrade } = useChat(locale);
  const chatInputId = "chat-input"; // convention: ChatInterface input should use this id

  useEffect(() => {
    setGrade(new Set([selectedClass]));
  }, [selectedClass, setGrade]);

  const subjects = SUBJECTS;

  const L: any = (CONTENT as any)[locale];
  const brand = locale === "bn" ? "শিখবো AI" : "Shikhbo AI";
  const classLabel = locale === "bn" ? "শ্রেণি" : "Class";
  const heroLines = String(L?.hero?.title ?? "").split("\n");
  const classOptions = Array.from({ length: 12 }, (_, i) => ({
    id: `${i + 1}`,
    label: locale === "bn" ? `শ্রেণি ${i + 1}` : `Class ${i + 1}`,
  }));

  const handleSubjectSelect = (subject: any) => {
    const prompt =
      locale === "bn"
        ? `আমি ${subject.bn} এর সাহায্য চাই।`
        : `I need help with ${subject.en}.`;
    setInput(prompt);
    const el = document.getElementById(chatInputId) as HTMLElement | null;
    if (el) el.focus();
  };

  return (
    <div className="min-h-screen">
      <motion.header
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 w-full"
      >
        <div className="max-w-6xl mx-auto pt-4">
          <div className="glass-panel rounded-2xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="glass-card h-9 w-9 rounded-xl flex items-center justify-center text-xs font-semibold tracking-wide">
                AI
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold leading-none text-foreground">
                  {brand}
                </div>
                <div className="text-xs text-default-500 dark:text-default-400">
                  {locale === "bn"
                    ? "তৎক্ষণাৎ সমাধান, ২৪/৭"
                    : "Instant answers, 24/7"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Select
                aria-label={classLabel}
                size="sm"
                selectedKeys={new Set([selectedClass])}
                onSelectionChange={(keys) => {
                  const next = Array.from(keys as Set<string>)[0];
                  if (next) setSelectedClass(next);
                }}
                variant="bordered"
                className="w-full sm:w-36"
                classNames={{
                  trigger:
                    "rounded-lg bg-black/10 border-white/40 text-foreground dark:bg-black/70 dark:border-white/25 dark:text-foreground px-3 py-2",
                  value: "text-foreground",
                  popoverContent:
                    "bg-black/95 border border-white/25 text-white shadow-xl",
                  listbox: "text-sm",
                }}
              >
                {classOptions.map((c) => (
                  <SelectItem key={c.id}>{c.label}</SelectItem>
                ))}
              </Select>

              <Select
                aria-label="Language"
                size="sm"
                selectedKeys={new Set([locale])}
                onSelectionChange={(keys) => {
                  const next = Array.from(keys as Set<string>)[0];
                  if (next) setLocale(next as Locale);
                }}
                variant="bordered"
                className="w-28 sm:w-28"
                classNames={{
                  trigger:
                    "rounded-lg bg-black/10 border-white/40 text-foreground dark:bg-black/70 dark:border-white/25 px-3 py-2",
                  value: "text-sm text-foreground",
                  popoverContent:
                    "bg-black/95 border border-white/25 text-white shadow-xl",
                  listbox: "text-sm",
                }}
              >
                <SelectItem key="en">EN</SelectItem>
                <SelectItem key="bn">BN</SelectItem>
              </Select>

              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </motion.header>

      <main
        role="main"
        aria-label={locale === "bn" ? "মূল বিষয়বস্তু" : "Main content"}
        className="px-4 sm:px-6 pb-16"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6 sm:gap-8 items-start mt-6">
          <motion.section
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="col-span-12 lg:col-span-5"
          >
            <Card className="glass-panel p-6">
              <CardBody>
                <div className="glass-card rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-default-600 dark:text-default-300 w-auto">
                  {L?.hero?.badge}
                </div>
                <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
                  {heroLines.map((line, idx) => {
                    const isAccent = idx === heroLines.length - 1;
                    return (
                      <span
                        key={`${line}-${idx}`}
                        className={
                          isAccent
                            ? "bg-clip-text text-transparent bg-linear-to-b from-[#5EA2EF] to-[#0072F5] dark:from-[#FFFFFF] dark:to-[#B7C0CC]"
                            : undefined
                        }
                      >
                        {line}
                        {idx < heroLines.length - 1 ? <br /> : null}
                      </span>
                    );
                  })}
                </h1>
                <p className="text-base sm:text-lg text-default-600 dark:text-default-300 mt-4 max-w-xl">
                  {L?.hero?.subtitle}
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Button className="glass-btn-primary" radius="full">
                    {L?.hero?.cta}
                  </Button>
                  <Button className="glass-btn" radius="full">
                    {locale === "bn" ? "পাঠ্যক্রম" : "Syllabus"}
                  </Button>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(L?.hero?.stats || [])
                    .slice(0, 2)
                    .map((s: any, i: number) => (
                      <div
                        key={i}
                        className="glass-card px-4 py-3 text-sm font-semibold text-foreground"
                      >
                        {s}
                      </div>
                    ))}
                </div>
              </CardBody>
            </Card>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {L?.syllabus?.title}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {subjects.map((s: any) => {
                  const Icon = s.icon;
                  return (
                    <motion.div key={s.id} whileHover={{ scale: 1.02 }}>
                      <Card
                        onClick={() => handleSubjectSelect(s)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSubjectSelect(s);
                          }
                        }}
                        aria-label={
                          locale === "bn"
                            ? `${s.name.bn} - শ্রেণি ${selectedClass} সহায়তা`
                            : `${s.name.en} - Class ${selectedClass} support`
                        }
                        className="glass-card-hover p-0 rounded-2xl h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
                      >
                        <CardBody className="flex flex-col items-center justify-center gap-3 p-6 h-full text-center">
                          <div
                            className={`${s.color} glass-card w-14 h-14 flex items-center justify-center rounded-2xl`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="font-semibold text-sm mt-1">
                            {locale === "bn" ? s.name.bn : s.name.en}
                          </div>
                          <div className="text-xs text-default-500 dark:text-default-400 mt-1">
                            {locale === "bn"
                              ? `শ্রেণি ${selectedClass} সহায়তা`
                              : `Class ${selectedClass} support`}
                          </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ x: 12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="col-span-12 lg:col-span-7"
          >
            <Card className="glass-panel p-4">
              <CardBody>
                <div
                  id="chat-interface"
                  className="h-160 rounded-2xl glass-card flex items-center justify-center"
                >
                  <ChatAutoMount />
                </div>
              </CardBody>
            </Card>
          </motion.section>
        </div>

        <ComparisonTable t={L} locale={locale} />
      </main>

      <SimpleFooter brand={brand} locale={locale} />
    </div>
  );
}

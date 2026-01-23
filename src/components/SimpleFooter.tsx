"use client";

type Locale = "en" | "bn";

export function SimpleFooter({
  brand,
  locale,
}: {
  brand: string;
  locale: Locale;
}) {
  const tagline =
    locale === "bn"
      ? "সব বিষয়ের জন্য তাৎক্ষণিক সহায়তা — কোনো অ্যাপ প্রয়োজন নেই।"
      : "Instant help across subjects — no app required.";

  return (
    <footer className="max-w-6xl mx-auto mt-12 pb-10">
      <div className="glass-panel rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-center sm:text-left dark:bg-black/85 dark:border-white/30">
        <div className="flex items-center gap-3">
          <div className="glass-card h-9 w-9 rounded-xl flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground dark:text-white">
              AI
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground dark:text-white">
              {brand}
            </div>
            <div className="text-xs text-default-500 dark:text-white/70">
              {tagline}
            </div>
          </div>
        </div>
        <div className="text-xs text-default-500 dark:text-white/70">
          {locale === "bn"
            ? "© 2026 সর্বস্বত্ব সংরক্ষিত"
            : "© 2026 All rights reserved"}
        </div>
      </div>
    </footer>
  );
}

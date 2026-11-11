"use client";

import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      {/* One theme: the site is white ruled paper. */}
      <NextThemesProvider attribute="class" forcedTheme="light">
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}

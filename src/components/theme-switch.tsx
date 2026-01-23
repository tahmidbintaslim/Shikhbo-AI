"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/button";
import { Sun, Moon } from "lucide-react";

export const ThemeSwitch = () => {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      isIconOnly
      variant="bordered"
      aria-label="Toggle Dark Mode"
      className="theme-toggle"
      onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {/* TRICK: Render BOTH icons. 
         Use Tailwind's display modifiers (hidden/block) to swap them 
         based on the parent HTML 'dark' class.
      */}

      {/* Sun Icon: Visible in Light Mode, Hidden in Dark */}
      <Sun className="icon-md theme-icon-sun" />

      {/* Moon Icon: Hidden in Light Mode, Visible in Dark */}
      <Moon className="icon-md theme-icon-moon" />
    </Button>
  );
};

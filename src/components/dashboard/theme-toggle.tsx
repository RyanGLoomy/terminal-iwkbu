"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-base-300/70 bg-base-100/80 text-base-content shadow-sm transition-colors hover:bg-base-200"
      title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      aria-label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

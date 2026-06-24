"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-card/80 text-foreground shadow-sm transition-colors hover:bg-muted"
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

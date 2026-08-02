"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [spinning, setSpinning] = useState(false);

  const handleToggle = () => {
    setSpinning(true);
    toggle();
    setTimeout(() => setSpinning(false), 400);
  };

  return (
    <button
      onClick={handleToggle}
      className={`navbar-icon-btn ${spinning ? "theme-spinning" : ""}`}
      title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      aria-label={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
    >
      {theme === "dark" ? (
        <IconSun className="h-4 w-4" />
      ) : (
        <IconMoon className="h-4 w-4" />
      )}
    </button>
  );
}

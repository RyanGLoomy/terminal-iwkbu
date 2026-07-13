"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const THEME_ATTR: Record<Theme, string> = {
  light: "jr",
  dark: "jr-dark",
};

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "theme";

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Set theme ASAP via direct DOM manipulation (before React paints).
  // This runs as a regular effect but is the first thing that happens.
  useEffect(() => {
    const resolved = resolveInitialTheme();
    document.documentElement.setAttribute("data-theme", THEME_ATTR[resolved]);
    setThemeState(resolved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", THEME_ATTR[theme]);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

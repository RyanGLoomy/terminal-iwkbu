"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
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

  // useLayoutEffect runs AFTER DOM mutations but BEFORE browser paint.
  // This is the key to eliminating flicker:
  // 1. CSS sets body { visibility: hidden } — content is in DOM but not painted
  // 2. React hydrates/recovers — DOM may change during this
  // 3. useLayoutEffect fires — we set theme + restore visibility + reset scroll
  // 4. Browser paints — user only sees the FINAL correct state
  //
  // With useEffect (runs AFTER paint), the user would see:
  // - Frame 1: blank page (visibility:hidden)
  // - Frame 2: correct page (visibility:visible)
  // This creates a visible flash.
  //
  // With useLayoutEffect (runs BEFORE paint):
  // - No frame is painted until everything is ready
  // - User sees only the correct final state — no flash, no flicker
  useLayoutEffect(() => {
     // 1. Set correct theme before paint
     const resolved = resolveInitialTheme();
     document.documentElement.setAttribute("data-theme", THEME_ATTR[resolved]);
     setThemeState(resolved);
     setMounted(true);

     // 2. Prevent scroll restoration interference
     if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
     }

     // 3. Force scroll to top (in case recovery left it wrong)
     window.scrollTo(0, 0);

     // 4. Unlock scroll — CSS sets html { overflow-y: hidden } to prevent
     //    the browser from scrolling during hydration recovery. Now that
     //    React has finished, explicitly set overflow to auto (inline style
     //    overrides CSS rule). Using "" would fall back to the CSS hidden!
     document.documentElement.style.overflowY = "auto";
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

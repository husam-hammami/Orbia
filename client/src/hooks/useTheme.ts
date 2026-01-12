import { useState, useEffect, useCallback } from "react";
import { themePresets, defaultThemeId, getThemeById, type ThemePreset } from "@/lib/themePresets";

const THEME_STORAGE_KEY = "orbia-theme";
const DARK_MODE_STORAGE_KEY = "orbia-dark-mode";

export function useTheme() {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(THEME_STORAGE_KEY) || defaultThemeId;
    }
    return defaultThemeId;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (stored !== null) {
        return stored === "true";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const currentTheme = getThemeById(themeId) || themePresets[0];

  const applyTheme = useCallback((theme: ThemePreset, dark: boolean) => {
    const root = document.documentElement;
    const variables = dark ? theme.dark : theme.light;

    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", theme.id);
  }, []);

  useEffect(() => {
    applyTheme(currentTheme, isDark);
  }, [currentTheme, isDark, applyTheme]);

  const setTheme = useCallback((id: string) => {
    const theme = getThemeById(id);
    if (theme) {
      setThemeId(id);
      localStorage.setItem(THEME_STORAGE_KEY, id);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setIsDark(dark);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(dark));
  }, []);

  return {
    themeId,
    currentTheme,
    isDark,
    themes: themePresets,
    setTheme,
    toggleDarkMode,
    setDarkMode,
  };
}

import { useState, useEffect } from "react";

export type ThemeStyle = "default" | "modern";

const THEME_KEY = "caisse-theme-style";

export function useThemeStyle() {
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_KEY) as ThemeStyle) || "default";
    }
    return "default";
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeStyle);
    
    // Apply theme class to document
    document.documentElement.classList.remove("theme-default", "theme-modern");
    document.documentElement.classList.add(`theme-${themeStyle}`);
  }, [themeStyle]);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.classList.add(`theme-${themeStyle}`);
  }, []);

  return {
    themeStyle,
    setThemeStyle,
    isModern: themeStyle === "modern",
  };
}

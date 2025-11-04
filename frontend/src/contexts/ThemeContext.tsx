import React, { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "@/hooks/useSettings";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  setTheme?: (theme: Theme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

/**
 * Theme Provider Component
 * 
 * Features:
 * - Syncs with user settings from useSettings hook
 * - Applies theme to document root
 * - Supports light and dark modes
 * - Optional theme switching
 * 
 * The theme is managed in two places:
 * 1. ThemeContext state (for immediate UI updates)
 * 2. User settings (for persistence via useSettings)
 * 
 * When settings are loaded, the theme is synced automatically.
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true, // Enable switching by default for settings page
}: ThemeProviderProps) {
  const { data: settings } = useSettings();
  
  // Initialize theme from settings or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (settings?.theme) {
      return settings.theme;
    }
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  // Sync theme with settings when they load
  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setThemeState(settings.theme);
    }
  }, [settings?.theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Also update localStorage for backwards compatibility
    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = switchable
    ? () => {
        setThemeState(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  /**
   * Set theme directly
   * Used by Settings page to apply theme changes
   */
  const setTheme = switchable
    ? (newTheme: Theme) => {
        setThemeState(newTheme);
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * 
 * @throws Error if used outside ThemeProvider
 * 
 * @example
 * ```tsx
 * const { theme, toggleTheme, setTheme } = useTheme();
 * 
 * // Toggle theme
 * toggleTheme();
 * 
 * // Set specific theme
 * setTheme('dark');
 * ```
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

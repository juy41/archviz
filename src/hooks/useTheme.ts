import { useCallback, useEffect, useState } from 'react';

export type ThemeName = 'light' | 'dark';

/**
 * Theme state for the current session.
 *
 * Per the spec the choice is kept in React state ONLY — it is intentionally not
 * persisted to localStorage, so nothing about the user lingers between visits.
 * The active theme is mirrored onto <html data-theme> so plain CSS can drive the
 * entire palette through `[data-theme]` selectors.
 */
export function useTheme(initial: ThemeName = 'dark'): {
  theme: ThemeName;
  toggleTheme: () => void;
} {
  const [theme, setTheme] = useState<ThemeName>(initial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}

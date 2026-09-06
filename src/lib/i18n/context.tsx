import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALES, translations, type Locale } from "./translations";

const STORAGE_KEY = "nasab:locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const entry = translations[key];
  let str = entry?.[locale] ?? entry?.[DEFAULT_LOCALE] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && LOCALES.some((l) => l.code === saved)) setLocaleState(saved);
    } catch {
      // ignore — storage unavailable
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — storage unavailable
    }
  }

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

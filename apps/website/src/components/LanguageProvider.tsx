"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Language = "ENGLISH" | "HINDI";

type LanguageContextValue = {
  language: Language;
  hindi: boolean;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Holds the active UI language on the client so a language change applies to
 * every client component immediately, without a page refresh. The initial value
 * is seeded from the server-rendered user record.
 */
export function LanguageProvider({ initialLanguage, children }: { initialLanguage: Language; children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  const value = useMemo(
    () => ({ language, hindi: language === "HINDI", setLanguage }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageProvider;

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}

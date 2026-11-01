"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { defaultLocale, type Locale } from "./config";
import { createTranslate, type Translate } from "./translate";

const LocaleContext = createContext<Locale>(defaultLocale);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => createTranslate(locale), [locale]);
}

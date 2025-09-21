'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import ru from './ru.json';
import en from './en.json';

type Locale = 'ru' | 'en';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const messages: Record<Locale, Record<string, unknown>> = { ru, en };

const I18nContext = createContext<I18nContextValue>({
  locale: 'ru',
  setLocale: () => {},
});

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  const stored = window.localStorage.getItem('locale') as Locale | null;
  if (stored && messages[stored]) return stored;
  return 'ru';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', locale);
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale: setLocaleState }), [locale]);

  return (
    <I18nContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>{children}</NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  const t = useTranslations();
  return {
    ...ctx,
    t,
  };
}

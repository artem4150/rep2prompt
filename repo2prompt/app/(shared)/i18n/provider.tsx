'use client';
import { createContext, useContext, useMemo, useState } from 'react';
import ru from './ru.json';
import en from './en.json';

type Locale = 'ru' | 'en';
type Dict = typeof ru;

type I18nContext = {
  locale: Locale;
  t: (k: string) => string;
  setLocale: (l: Locale) => void;
};

const dicts: Record<Locale, Dict> = { ru, en };

const Ctx = createContext<I18nContext>({
  locale: 'ru',
  t: (k) => k,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    (typeof window !== 'undefined' && (localStorage.getItem('locale') as Locale)) || 'ru'
  );

  const t = useMemo(() => {
    const d = dicts[locale] ?? dicts.ru;
    return (k: string) => k.split('.').reduce<any>((a, part) => a?.[part], d) ?? k;
  }, [locale]);

  function setLocale(l: Locale) {
    if (typeof window !== 'undefined') localStorage.setItem('locale', l);
    setLocaleState(l);
  }

  return <Ctx.Provider value={{ locale, t, setLocale }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

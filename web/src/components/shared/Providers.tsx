'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import viMessages from '../../../messages/vi.json';
import enMessages from '../../../messages/en.json';

const allMessages: Record<string, Record<string, any>> = { vi: viMessages, en: enMessages };

type LocaleCtxType = {
  locale: string;
  setLocale: (locale: string) => void;
};

const LocaleCtx = createContext<LocaleCtxType>({ locale: 'vi', setLocale: () => {} });

export function useLocaleState() {
  return useContext(LocaleCtx);
}

export function Providers({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('vi');
  const [ready, setReady] = useState(false);
  const messages = allMessages[locale] || viMessages;

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1];
    const initial = cookie || 'vi';
    setLocale(initial);
    document.documentElement.lang = initial;
    setReady(true);
  }, []);

  const changeLocale = useCallback((next: string) => {
    setLocale(next);
    document.documentElement.lang = next;
  }, []);

  return (
    <LocaleCtx.Provider value={{ locale, setLocale: changeLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider>
          <AuthProvider>{ready ? children : null}</AuthProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  );
}

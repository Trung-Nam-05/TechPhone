import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en.js';
import vi from '../i18n/vi.js';
import { getMessage } from '../i18n/getMessage.js';

const STORAGE_KEY = 'techphone-locale';
const DICTS = { vi, en };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'vi') return stored;
    } catch {
      /* ignore */
    }
    return 'vi';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'en' ? 'en' : 'vi';
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (next === 'vi' || next === 'en') setLocaleState(next);
  }, []);

  const dict = DICTS[locale] || vi;

  const t = useCallback(
    (key, vars) => getMessage(dict, key, vars),
    [dict],
  );

  const formatPrice = useCallback(
    (value) => {
      const n = Number(value) || 0;
      if (locale === 'en') {
        return `${n.toLocaleString('en-US')} ${en.common.currency}`;
      }
      return `${n.toLocaleString('vi-VN')}${vi.common.currency}`;
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatPrice,
    }),
    [locale, setLocale, t, formatPrice],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider.');
  }
  return ctx;
}

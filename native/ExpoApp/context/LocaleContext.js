import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LANGUAGES } from '../i18n/translations';

const STORAGE_KEY = 'app_lang';

const LocaleContext = createContext(null);

const getNested = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

export const LocaleProvider = ({ children }) => {
  const [lang, setLangState] = useState(LANGUAGES.GE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === LANGUAGES.EN || stored === LANGUAGES.GE) {
        setLangState(stored);
      }
      setReady(true);
    });
  }, []);

  const setLang = useCallback(async (next) => {
    const value = next === LANGUAGES.EN ? LANGUAGES.EN : LANGUAGES.GE;
    setLangState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === LANGUAGES.EN ? LANGUAGES.GE : LANGUAGES.EN);
  }, [lang, setLang]);

  const t = useCallback(
    (key, params) => {
      let str = getNested(translations[lang], key) ?? getNested(translations.EN, key) ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t, ready, isGeorgian: lang === LANGUAGES.GE }),
    [lang, setLang, toggleLang, t, ready]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
};

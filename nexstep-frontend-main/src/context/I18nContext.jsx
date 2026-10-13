import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '../i18n.js';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  changeLanguage: () => {},
  t: (key) => key,
  i18n: i18n
});

export function I18nLanguageProvider({ children }) {
  const { t } = useTranslation();
  const [lang, setLangState] = useState(() => i18n.language || 'en');

  useEffect(() => {
    const handleLangChange = (lng) => {
      setLangState(lng);
    };
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, []);

  useEffect(() => {
    if (lang !== 'ur' || typeof document === 'undefined') return;
    const id = 'ns-urdu-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&display=swap';
    document.head.appendChild(link);
  }, [lang]);

  const changeLanguage = (newLang) => {
    i18n.changeLanguage(newLang);
    setLangState(newLang);
    try {
      localStorage.setItem('nexstep_lang', newLang);
    } catch (e) {}
  };

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={{ lang, setLang: changeLanguage, changeLanguage, t, i18n }}>
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

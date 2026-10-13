import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './data/translations.js';

const savedLang = (() => {
  try {
    // `nexstep_language` was used by the original i18n bootstrap. Read it once
    // as a fallback so existing visitors keep their selected language after the
    // app moved to a single i18n instance.
    const storedLanguage = localStorage.getItem('nexstep_lang') || localStorage.getItem('nexstep_language');
    return storedLanguage === 'ur' ? 'ur' : 'en';
  } catch (e) {
    return 'en';
  }
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: translations.en
      },
      ur: {
        translation: translations.ur
      }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React handles XSS
    }
  });

// Listen to language changes and persist in localStorage
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('nexstep_lang', lng);
    localStorage.removeItem('nexstep_language');
    // Update document dir attribute for RTL/LTR layout
    if (lng === 'ur') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ur');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  } catch (e) {}
});

export default i18n;

import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../context/I18nContext.jsx';

export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();
  const currentLng = lang || 'en';

  const toggleLanguage = () => {
    const nextLng = currentLng.startsWith('ur') ? 'en' : 'ur';
    setLang(nextLng);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Switch Language / زبان تبدیل کریں"
      className={`ns-chip-btn ${className}`}
    >
      <Globe className="h-4 w-4" strokeWidth={1.75} />
      <span>{currentLng.startsWith('ur') ? 'English' : 'اردو'}</span>
    </button>
  );
}

export default LanguageSwitcher;

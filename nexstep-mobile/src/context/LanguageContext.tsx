import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type Language = 'en' | 'ur';

export type CopyKey =
  | 'home' | 'career' | 'roadmap' | 'jobs' | 'profile' | 'workspace' | 'explore'
  | 'settings' | 'appearance' | 'language' | 'light' | 'dark' | 'system'
  | 'student' | 'mentor' | 'admin' | 'onboarding' | 'grade8Matric' | 'fscMapper'
  | 'universities' | 'scholarships' | 'tevtaIt' | 'transnational' | 'degreeCareer'
  | 'careerComparison' | 'skillGap' | 'resume' | 'courses' | 'mockInterview'
  | 'chatbot' | 'voiceAssistant' | 'community' | 'mentorship' | 'calendarNotif'
  | 'analytics' | 'helpCenter' | 'recruiterPortal' | 'mentorPortal' | 'adminPanel'
  | 'pricing' | 'designSystem' | 'services';

const copy: Record<Language, Record<CopyKey, string>> = {
  en: {
    home: 'Home', career: 'Career AI', roadmap: 'Roadmap', jobs: 'Jobs', profile: 'Profile', workspace: 'Workspace', explore: 'Explore',
    settings: 'Settings', appearance: 'Appearance', language: 'Language', light: 'Light', dark: 'Dark', system: 'System',
    student: 'Student', mentor: 'Mentor', admin: 'Admin',
    onboarding: 'Onboarding', grade8Matric: 'Grade 8 & Matric', fscMapper: 'F.Sc & Inter Mapper',
    universities: 'Universities', scholarships: 'Scholarships', tevtaIt: 'TEVTA & IT Diplomas',
    transnational: 'Foreign Degrees (TNE)', degreeCareer: 'Degree to Career', careerComparison: 'Career Comparison',
    skillGap: 'Skill Gap Analyzer', resume: 'AI Resume Builder', courses: 'Skill Courses', mockInterview: 'Mock Interview AI',
    chatbot: 'Career AI Chatbot', voiceAssistant: 'Voice Assistant', community: 'Community Forum', mentorship: '1-on-1 Mentorship',
    calendarNotif: 'Calendar & Alerts', analytics: 'Career Analytics', helpCenter: 'Help Center',
    recruiterPortal: 'Recruiter Portal', mentorPortal: 'Mentor Portal', adminPanel: 'Admin Panel', pricing: 'Pricing Plans',
    designSystem: 'Design System', services: 'All Services',
  },
  ur: {
    home: 'ہوم', career: 'کیریئر اے آئی', roadmap: 'روڈمیپ', jobs: 'نوکریاں', profile: 'پروفائل', workspace: 'ورک اسپیس', explore: 'دریافت کریں',
    settings: 'ترتیبات', appearance: 'ظاہری انداز', language: 'زبان', light: 'روشن', dark: 'تاریک', system: 'سسٹم',
    student: 'طالب علم', mentor: 'مینٹور', admin: 'ایڈمن',
    onboarding: 'آن بورڈنگ', grade8Matric: 'گریڈ 8 اور میٹرک', fscMapper: 'ایف ایس سی نیویگیٹر',
    universities: 'یونیورسٹیاں', scholarships: 'اسکالرشپس', tevtaIt: 'ٹیوٹا اور آئی ٹی ڈپلومہ',
    transnational: 'غیر ملکی ڈگریاں', degreeCareer: 'ڈگری سے کیریئر', careerComparison: 'کیریئر کا موازنہ',
    skillGap: 'مہارتوں کا تجزیہ', resume: 'ریزیومے بلڈر', courses: 'مہارتی کورسز', mockInterview: 'انٹرویو مشق',
    chatbot: 'اے آئی چیٹ باٹ', voiceAssistant: 'وائس اسسٹنٹ', community: 'کمیونٹی فورم', mentorship: 'مینٹورشپ',
    calendarNotif: 'کیلنڈر اور الرٹس', analytics: 'کیریئر تجزیات', helpCenter: 'رہنمائی مرکز',
    recruiterPortal: 'ریکروٹر پورٹل', mentorPortal: 'مینٹور پورٹل', adminPanel: 'ایڈمن پینل', pricing: 'قیمتیں اور پلانز',
    designSystem: 'ڈیزائن سسٹم', services: 'تمام خدمات',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  isRtl: boolean;
  t: (key: CopyKey) => string;
}

const STORAGE_KEY = 'nexstep_language';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'ur') setLanguageState(stored);
    }).catch(() => {});
  }, []);
  const setLanguage = (next: Language) => {
    setLanguageState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  };
  const value = useMemo(() => ({
    language,
    setLanguage,
    isRtl: language === 'ur',
    t: (key: CopyKey) => copy[language][key] ?? key,
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}


import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.jsx';
import { MobileBottomNav } from './components/MobileBottomNav.jsx';
import { MarketingNavbar } from './components/marketing/MarketingNavbar.tsx';
import { MarketingFooter } from './components/marketing/MarketingFooter.tsx';
import { PageLoader } from './components/common/PageLoader.jsx';
import { CookieConsentBanner } from './components/cookies/CookieConsentBanner.jsx';
import { ToastContainer } from './components/notifications/ToastContainer.jsx';
import { LiveAlertsWatcher } from './components/notifications/LiveAlertsWatcher.jsx';
import { PromotionBanner } from './components/onboarding/PromotionBanner.jsx';
import { isPageAllowedForLevel } from './config/educationLevels.js';
import { setAutoTranslate } from './i18n/autoTranslate.js';
import './portal-redesign.css';

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));
const DashboardTab = lazyNamed(() => import('./components/tabs/DashboardTab.jsx'), 'DashboardTab');
const QuizTab = lazyNamed(() => import('./components/tabs/QuizTab.jsx'), 'QuizTab');
const Grade8MatricTab = lazyNamed(() => import('./components/tabs/Grade8MatricTab.jsx'), 'Grade8MatricTab');
const FscMapperTab = lazyNamed(() => import('./components/tabs/FscMapperTab.jsx'), 'FscMapperTab');
const UniversitiesTab = lazyNamed(() => import('./components/tabs/UniversitiesTab.jsx'), 'UniversitiesTab');
const ScholarshipsTab = lazyNamed(() => import('./components/tabs/ScholarshipsTab.jsx'), 'ScholarshipsTab');
const TevtaItTab = lazyNamed(() => import('./components/tabs/TevtaItTab.jsx'), 'TevtaItTab');
const TransnationalTab = lazyNamed(() => import('./components/tabs/TransnationalTab.jsx'), 'TransnationalTab');
const DegreeCareerTab = lazyNamed(() => import('./components/tabs/DegreeCareerTab.jsx'), 'DegreeCareerTab');
const CareerComparisonTab = lazyNamed(() => import('./components/tabs/CareerComparisonTab.jsx'), 'CareerComparisonTab');
const ChatbotTab = lazyNamed(() => import('./components/tabs/ChatbotTab.jsx'), 'ChatbotTab');
const VoiceAssistantTab = lazyNamed(() => import('./components/tabs/VoiceAssistantTab.jsx'), 'VoiceAssistantTab');
const LandingTab = lazyNamed(() => import('./components/tabs/LandingTab.jsx'), 'LandingTab');
const AuthTab = lazyNamed(() => import('./components/tabs/AuthTab.jsx'), 'AuthTab');
const OnboardingTab = lazyNamed(() => import('./components/tabs/OnboardingTab.jsx'), 'OnboardingTab');
const CareerAiTab = lazyNamed(() => import('./components/tabs/CareerAiTab.jsx'), 'CareerAiTab');
const ResumeTab = lazyNamed(() => import('./components/tabs/ResumeTab.jsx'), 'ResumeTab');
const SkillGapTab = lazyNamed(() => import('./components/tabs/SkillGapTab.jsx'), 'SkillGapTab');
const CareerRoadmapTab = lazyNamed(() => import('./components/tabs/CareerRoadmapTab.jsx'), 'CareerRoadmapTab');
const CoursesTab = lazyNamed(() => import('./components/tabs/CoursesTab.jsx'), 'CoursesTab');
const JobPortalTab = lazyNamed(() => import('./components/tabs/JobPortalTab.jsx'), 'JobPortalTab');
const MockInterviewTab = lazyNamed(() => import('./components/tabs/MockInterviewTab.jsx'), 'MockInterviewTab');
const CommunityTab = lazyNamed(() => import('./components/tabs/CommunityTab.jsx'), 'CommunityTab');
const MentorshipTab = lazyNamed(() => import('./components/tabs/MentorshipTab.jsx'), 'MentorshipTab');
const CalendarNotifTab = lazyNamed(() => import('./components/tabs/CalendarNotifTab.jsx'), 'CalendarNotifTab');
const AnalyticsTab = lazyNamed(() => import('./components/tabs/AnalyticsTab.jsx'), 'AnalyticsTab');
const SettingsSubTab = lazyNamed(() => import('./components/tabs/SettingsSubTab.jsx'), 'SettingsSubTab');
const HelpCenterTab = lazyNamed(() => import('./components/tabs/HelpCenterTab.jsx'), 'HelpCenterTab');
const AboutPage = lazyNamed(() => import('./components/tabs/InfoPages.jsx'), 'AboutPage');
const PrivacyPage = lazyNamed(() => import('./components/tabs/InfoPages.jsx'), 'PrivacyPage');
const TermsPage = lazyNamed(() => import('./components/tabs/InfoPages.jsx'), 'TermsPage');
const MentorPortalTab = lazyNamed(() => import('./components/tabs/MentorPortalTab.jsx'), 'MentorPortalTab');
const PricingTab = lazyNamed(() => import('./components/tabs/PricingTab.jsx'), 'PricingTab');
const EntryTestPrepTab = lazyNamed(() => import('./components/tabs/EntryTestPrepTab.jsx'), 'EntryTestPrepTab');
const MeritCalculatorTab = lazyNamed(() => import('./components/tabs/MeritCalculatorTab.jsx'), 'MeritCalculatorTab');
const ProgressTrackerTab = lazyNamed(() => import('./components/tabs/ProgressTrackerTab.jsx'), 'ProgressTrackerTab');
const AdminPortal = lazyNamed(() => import('./admin/AdminPortal.jsx'), 'AdminPortal');
const PathwayTab = lazyNamed(() => import('./components/tabs/PathwayTab.jsx'), 'PathwayTab');
const RolePortalSelector = lazyNamed(() => import('./components/onboarding/RolePortalSelector.jsx'), 'RolePortalSelector');
const ProfileModal = lazyNamed(() => import('./components/ProfileModal.jsx'), 'ProfileModal');
const GuidedTourModal = lazyNamed(() => import('./components/tour/GuidedTourModal.jsx'), 'GuidedTourModal');
const CommandPaletteModal = lazyNamed(() => import('./components/CommandPaletteModal.jsx'), 'CommandPaletteModal');

import { useLanguage } from './context/I18nContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { useAuth, getUserRole, getRoleHomePath as roleHomePath } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { SsoCallback } from './auth/SsoCallback.jsx';

const TAB_TO_PATH = {
  landing: '/',
  dashboard: '/dashboard',
  pathway: '/pathway',
  auth: '/auth',
  onboarding: '/onboarding',
  quiz: '/quiz',
  roleSelect: '/role-select',
  grade8Matric: '/grade8-matric',
  fscMapper: '/fsc-mapper',
  universities: '/universities',
  scholarships: '/scholarships',
  jobs: '/jobs',
  tevtaIt: '/tevta-it',
  transnational: '/transnational',
  degreeCareer: '/degree-career',
  careerComparison: '/career-comparison',
  careerAi: '/career-ai',
  resume: '/resume',
  skillGap: '/skill-gap',
  careerRoadmap: '/career-roadmap',
  courses: '/courses',
  mockInterview: '/mock-interview',
  voiceAssistant: '/voice-assistant',
  aiChatbot: '/ai-chatbot',
  community: '/community',
  mentorship: '/mentorship',
  calendarNotif: '/calendar-notif',
  analytics: '/analytics',
  settings: '/settings',
  helpCenter: '/help-center',
  about: '/about',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/privacy',
  mentorPortal: '/portal/mentor',
  pricing: '/pricing',
  entryTestPrep: '/entry-test-prep',
  meritCalculator: '/merit-calculator',
  progressTracker: '/progress-tracker',
};

const PATH_TO_TAB = {
  '/': 'landing',
  '/landing': 'landing',
  '/dashboard': 'dashboard',
  '/pathway': 'pathway',
  '/auth': 'auth',
  '/sso-callback': 'auth',
  '/auth/sso-callback': 'auth',
  '/login': 'auth',
  '/register': 'auth',
  '/forgot-password': 'auth',
  '/reset-password': 'auth',
  '/onboarding': 'onboarding',
  '/role-select': 'roleSelect',
  '/quiz': 'quiz',
  '/grade8-matric': 'grade8Matric',
  '/fsc-mapper': 'fscMapper',
  '/universities': 'universities',
  '/scholarships': 'scholarships',
  '/jobs': 'jobs',
  '/job-portal': 'jobs',
  '/tevta-it': 'tevtaIt',
  '/transnational': 'transnational',
  '/degree-career': 'degreeCareer',
  '/career-comparison': 'careerComparison',
  '/career-ai': 'careerAi',
  '/resume': 'resume',
  '/skill-gap': 'skillGap',
  '/career-roadmap': 'careerRoadmap',
  '/courses': 'courses',
  '/mock-interview': 'mockInterview',
  '/voice-assistant': 'voiceAssistant',
  '/ai-chatbot': 'aiChatbot',
  '/community': 'community',
  '/mentorship': 'mentorship',
  '/calendar-notif': 'calendarNotif',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/help-center': 'helpCenter',
  '/about': 'about',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/portal/mentor': 'mentorPortal',
  '/mentor-portal': 'mentorPortal',
  '/pricing': 'pricing',
  '/entry-test-prep': 'entryTestPrep',
  '/merit-calculator': 'meritCalculator',
  '/progress-tracker': 'progressTracker',
};

/** Pages a mentor may open. Everything else in the student portal sends them to the mentor portal. */
// Public information pages: no sign-in, marketing layout, open to every role and level.
const PUBLIC_INFO_TABS = new Set(['about', 'privacy', 'terms']);
const MENTOR_ALLOWED_PATHS = new Set(['/', '/about', '/privacy', '/terms', '/portal/mentor', '/calendar-notif', '/community', '/ai-chatbot', '/settings', '/help-center', '/auth', '/login', '/register', '/forgot-password', '/reset-password', '/sso-callback', '/auth/sso-callback']);

/** Top-level switch: the admin portal (/admin…) is a separate app with its own sign-in. */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isAdminPortal = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <>
      {isAdminPortal ? (
        <Suspense fallback={<PageLoader />}>
          <AdminPortal />
        </Suspense>
      ) : (
        <MainApp
          isCommandPaletteOpen={isCommandPaletteOpen}
          setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        />
      )}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onOpen={() => setIsCommandPaletteOpen(true)}
            onSelectTab={(id) => {
              setIsCommandPaletteOpen(false);
              const targetPath = TAB_TO_PATH[id] || `/${id}`;
              if (location.pathname !== targetPath) navigate(targetPath);
            }}
            lang={lang}
          />
        </Suspense>
      )}
    </>
  );
}

function MainApp({ isCommandPaletteOpen, setIsCommandPaletteOpen }) {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();
  const { user, authStatus, logout, refreshUser } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = PATH_TO_TAB[location.pathname] || 'dashboard';
  const isMarketing = activeTab === 'landing' || PUBLIC_INFO_TABS.has(activeTab);

  const handleSelectTab = (tabOrFn) => {
    let nextTab;
    if (typeof tabOrFn === 'function') {
      nextTab = tabOrFn(activeTab);
    } else {
      nextTab = tabOrFn;
    }
    const targetPath = TAB_TO_PATH[nextTab] || `/${nextTab}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);

  // Auto-prompt Guided Tour for first-time visitors
  useEffect(() => {
    try {
      const hasCompleted = localStorage.getItem('nexstep_guided_tour_completed');
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsGuidedTourOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nexstep_lang', lang);
    } catch (e) { }
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);
  // Translate every remaining English text on the page while Urdu is selected.
  useEffect(() => {
    setAutoTranslate(lang === 'ur');
    return () => setAutoTranslate(false);
  }, [lang]);

  // ── Profile state — PostgreSQL is the authoritative source once authenticated ──
  // The default below is only used before the first fetch resolves or for
  // unauthenticated public pages. After login it is replaced with real DB data.
  const [profile, setProfile] = useState({
    name: '',
    gradeLevel: '',
    city: '',
    province: '',
    familyMonthlyIncomePkr: 0,
    budgetAnnualPkr: 0,
    preferredStream: '',
    topRiasecCluster: '',
    marks: { matricPct: 0, fscPct: 0, entryTestScore: 0 },
    skills: [],
    certifications: [],
    targetCareer: '',
    goals: '',
  });

  // ── Profile completion helper ─────────────────────────────────────────────
  // Returns the appropriate home path for the user's role after login.
  const getRoleHomePath = roleHomePath;
  const isMentor = authStatus === 'authenticated' && getUserRole(user) === 'MENTOR';
  const mentorBlocked = isMentor && !MENTOR_ALLOWED_PATHS.has(location.pathname);
  // Students only open pages meant for their class / level (Pakistani education system).
  const studentLevel = authStatus === 'authenticated' && !isMentor ? (profile?.education?.level || null) : null;
  const levelBlocked = Boolean(studentLevel) && Boolean(PATH_TO_TAB[location.pathname]) && !PUBLIC_INFO_TABS.has(PATH_TO_TAB[location.pathname]) && !isPageAllowedForLevel(PATH_TO_TAB[location.pathname], studentLevel);

  const handleEducationSaved = (state) => {
    const stream = state?.stream || '';
    setProfile((p) => ({
      ...p,
      education: { ...state, stream: stream || state?.stream || null, institution: state?.institution || p.institution || null },
      gradeLevel: state?.levelLabel || p.gradeLevel,
      preferredStream: stream || p.preferredStream,
      institution: state?.institution || p.institution || '',
    }));
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res?.data) return;
        setProfile((p) => ({
          ...p,
          ...res.data,
          education: res.data.education || state,
          preferredStream: res.data.preferredStream || stream || p.preferredStream,
          institution: res.data.institution || state?.institution || p.institution,
        }));
      })
      .catch(() => {});
  };
  const dismissPromotion = () => {
    setProfile((p) => ({ ...p, education: p.education ? { ...p.education, promotedFrom: null, promotedFromLabel: null } : p.education }));
    fetch('/api/education/ack', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  // Returns true when the student has enough data to skip onboarding.
  const isProfileComplete = (p) => {
    const hasName = !!(p?.name?.trim());
    const hasStream = !!(p?.preferredStream);
    const hasSkills = Array.isArray(p?.skills) && p.skills.length > 0;
    const hasMarks = !!(p?.marks?.matricPct || p?.marks?.fscPct);
    return hasName && hasStream && (hasSkills || hasMarks);
  };

  // Keep the saved theme / language in sync when they are changed from the header or menus.
  const prefsAppliedRef = React.useRef(false);
  useEffect(() => {
    if (authStatus !== 'authenticated' || !prefsAppliedRef.current) return undefined;
    const cur = profile?.preferences || {};
    const wantTheme = isDark ? 'dark' : 'light';
    if (cur.theme === wantTheme && cur.language === lang) return undefined;
    const t = setTimeout(() => {
      const next = { ...cur, theme: wantTheme, language: lang };
      fetch('/api/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: next }) })
        .then((r) => { if (r.ok) setProfile((p) => ({ ...p, preferences: next })); })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [isDark, lang, authStatus, profile?.preferences]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load full profile from PostgreSQL when auth status changes ────────────
  useEffect(() => {
    const EMPTY = { name: '', gradeLevel: '', city: '', province: '', familyMonthlyIncomePkr: 0, budgetAnnualPkr: 0, preferredStream: '', topRiasecCluster: '', marks: { matricPct: 0, fscPct: 0, entryTestScore: 0 }, skills: [], certifications: [], targetCareer: '', goals: '' };
    if (authStatus === 'unauthenticated') {
      setProfile(EMPTY);
      return;
    }
    if (authStatus !== 'authenticated') return;

    const applyProfile = (data) => {
      setProfile(data);
      const prefs = data.preferences || {};
      if (prefs.theme === 'light' || prefs.theme === 'dark') setTheme(prefs.theme);
      if (prefs.language === 'en' || prefs.language === 'ur') setLang(prefs.language);
      prefsAppliedRef.current = true;
      const role = String(user?.role ?? user?.userRole ?? 'STUDENT').trim().toUpperCase();
      const currentPath = window.location.hash.replace('#', '') || '/';
      const onPublicPage = ['/', '/auth', '/landing'].some(p => currentPath === p || currentPath.startsWith(p + '?'));
      if (role !== 'STUDENT') return;
      if (!data.education?.level && !onPublicPage && currentPath !== '/role-select') {
        navigate('/role-select');
      }
    };

    if (user?.fullProfile) applyProfile(user.fullProfile);

    fetch('/api/profile', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(resData => { if (resData?.data) applyProfile(resData.data); })
      .catch(err => console.log('Profile fetch note:', err));
  }, [authStatus, user?.id, user?.fullProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateProfile = async (updatedFields) => {
    const nextProfile = { ...profile, ...updatedFields };
    setProfile(nextProfile);
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedFields),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Error persisting profile:', data.error);
      throw new Error(data.error || 'Could not save your profile.');
    }
    const saved = data?.data || nextProfile;
    if (data?.data) setProfile(data.data);
    if (updatedFields.name || updatedFields.firstName) refreshUser?.();
    return saved;
  };

  const content = (
    <div
      className={`nexstep-app ${isMarketing ? 'marketing-app' : 'product-app'} min-h-screen flex flex-col ${isDark ? 'dark' : ''} relative ${lang === 'ur' ? 'font-urdu' : ''}`}
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
      lang={lang}
    >

      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNavbar activeTab={activeTab} onNavigate={handleSelectTab} lang={lang} />

        {/* Layout Container with Collapsible Sidebar */}
        <div className={`flex-1 flex w-full mx-auto relative ${isMarketing ? '' : ''}`} style={{ paddingTop: 'var(--ns-nav-h)' }}>
          {!isMarketing && activeTab !== 'auth' && (
            <div className="hidden lg:block">
              <Sidebar
                activeTab={activeTab}
                setActiveTab={handleSelectTab}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                lang={lang}
                profile={profile}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                onLogout={user && activeTab !== 'auth' ? () => { logout(); handleSelectTab('landing'); } : null}
              />
            </div>
          )}

          <main id="main-content" className={`flex-1 w-full min-w-0 ${activeTab === 'landing' ? '' : isMarketing ? 'pb-8' : 'px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8'}`}>
            <AnimatePresence>
              <motion.div
                key={location.pathname}
                className={`portal-route-shell portal-route-${activeTab} ${isMarketing ? 'portal-route-marketing' : 'portal-route-product'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
              >
                <Suspense fallback={<PageLoader />}>
                  {studentLevel && location.pathname !== '/pathway' && (
                    <PromotionBanner education={profile.education} lang={lang} onDismiss={dismissPromotion} onNavigate={handleSelectTab} />
                  )}
                  {mentorBlocked ? <Navigate to="/portal/mentor" replace /> : levelBlocked ? <Navigate to="/dashboard" replace state={{ levelRestricted: true }} /> : (
                  <Routes location={location}>
                  <Route path="/" element={<LandingTab onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/landing" element={<Navigate to="/" replace />} />
                  <Route path="/sso-callback" element={<SsoCallback />} />
                  <Route path="/auth/sso-callback" element={<SsoCallback />} />
                  <Route path="/auth" element={<AuthTab onAuthenticated={() => handleSelectTab('dashboard')} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/login" element={<AuthTab initialView="login" onAuthenticated={() => handleSelectTab('dashboard')} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/register" element={<AuthTab initialView="register" onAuthenticated={() => handleSelectTab('dashboard')} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/forgot-password" element={<AuthTab initialView="forgot" onAuthenticated={() => handleSelectTab('dashboard')} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/reset-password" element={<AuthTab initialView="reset" onAuthenticated={() => handleSelectTab('dashboard')} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/pathway" element={<ProtectedRoute><PathwayTab profile={profile} lang={lang} onNavigate={handleSelectTab} onEducationSaved={handleEducationSaved} /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardTab profile={profile} onNavigate={handleSelectTab} lang={lang} /></ProtectedRoute>} />
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingTab profile={profile} onUpdateProfile={handleUpdateProfile} onNavigate={handleSelectTab} lang={lang} /></ProtectedRoute>} />
                  <Route path="/role-select" element={
                    <ProtectedRoute>
                      <RolePortalSelector
                        lang={lang}
                        initial={{
                          ...profile?.education,
                          stream: profile?.education?.stream || profile?.preferredStream,
                          institution: profile?.education?.institution || profile?.institution,
                        }}
                        initialMarks={profile?.marks}
                        onNavigate={handleSelectTab}
                        onComplete={handleEducationSaved}
                      />
                    </ProtectedRoute>
                  } />
                  <Route path="/quiz" element={<ProtectedRoute><QuizTab profile={profile} onUpdateProfile={handleUpdateProfile} onNavigate={handleSelectTab} lang={lang} /></ProtectedRoute>} />
                  <Route path="/career-ai" element={<ProtectedRoute><CareerAiTab profile={profile} onNavigate={handleSelectTab} lang={lang} /></ProtectedRoute>} />
                  <Route path="/skill-gap" element={<ProtectedRoute><SkillGapTab profile={profile} onNavigate={handleSelectTab} lang={lang} /></ProtectedRoute>} />
                  <Route path="/career-roadmap" element={<ProtectedRoute><CareerRoadmapTab profile={profile} onNavigate={handleSelectTab} lang={lang} /></ProtectedRoute>} />
                  <Route path="/resume" element={<ProtectedRoute><ResumeTab profile={profile} lang={lang} /></ProtectedRoute>} />
                  <Route path="/mock-interview" element={<ProtectedRoute><MockInterviewTab profile={profile} lang={lang} /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><AnalyticsTab profile={profile} lang={lang} onNavigate={handleSelectTab} /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsSubTab profile={profile} onProfileSaved={(fresh) => setProfile((p) => ({ ...p, ...fresh }))} lang={lang} setLang={setLang} onNavigate={handleSelectTab} /></ProtectedRoute>} />
                  <Route path="/portal/admin" element={<Navigate to="/admin" replace />} />
                  <Route path="/admin-panel" element={<Navigate to="/admin" replace />} />
                  <Route path="/grade8-matric" element={<Grade8MatricTab profile={profile} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/fsc-mapper" element={<FscMapperTab profile={profile} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/universities" element={<UniversitiesTab profile={profile} lang={lang} />} />
                  <Route path="/scholarships" element={<ScholarshipsTab profile={profile} lang={lang} />} />
                  <Route path="/jobs" element={<JobPortalTab profile={profile} lang={lang} />} />
                  <Route path="/job-portal" element={<Navigate to="/jobs" replace />} />
                  <Route path="/tevta-it" element={<TevtaItTab lang={lang} />} />
                  <Route path="/transnational" element={<TransnationalTab lang={lang} />} />
                  <Route path="/degree-career" element={<DegreeCareerTab profile={profile} lang={lang} />} />
                  <Route path="/career-comparison" element={<CareerComparisonTab lang={lang} />} />
                  <Route path="/courses" element={<CoursesTab lang={lang} />} />
                  <Route path="/voice-assistant" element={<ProtectedRoute><VoiceAssistantTab profile={profile} lang={lang} /></ProtectedRoute>} />
                  <Route path="/ai-chatbot" element={<ProtectedRoute><ChatbotTab profile={profile} lang={lang} /></ProtectedRoute>} />
                  <Route path="/community" element={<CommunityTab profile={profile} lang={lang} />} />
                  <Route path="/mentorship" element={<MentorshipTab profile={profile} lang={lang} />} />
                  <Route path="/calendar-notif" element={<ProtectedRoute><CalendarNotifTab lang={lang} /></ProtectedRoute>} />
                  <Route path="/help-center" element={<HelpCenterTab lang={lang} onNavigate={handleSelectTab} />} />
                  <Route path="/portal/mentor" element={<ProtectedRoute roles={['MENTOR']}><MentorPortalTab lang={lang} /></ProtectedRoute>} />
                  <Route path="/mentor-portal" element={<Navigate to="/portal/mentor" replace />} />
                  <Route path="/pricing" element={<PricingTab profile={profile} onUpdateProfile={handleUpdateProfile} onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/entry-test-prep" element={<ProtectedRoute><EntryTestPrepTab profile={profile} lang={lang} /></ProtectedRoute>} />
                  <Route path="/merit-calculator" element={<MeritCalculatorTab profile={profile} lang={lang} />} />
                  <Route path="/progress-tracker" element={<ProtectedRoute><ProgressTrackerTab profile={profile} lang={lang} onNavigate={handleSelectTab} /></ProtectedRoute>} />
                  <Route path="/about" element={<AboutPage onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/privacy" element={<PrivacyPage onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="/terms" element={<TermsPage onNavigate={handleSelectTab} lang={lang} />} />
                  <Route path="*" element={<Navigate to={authStatus === 'authenticated' ? '/dashboard' : '/'} replace />} />
                  </Routes>
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <MarketingFooter onNavigate={handleSelectTab} lang={lang} compact={!isMarketing} />

        {isProfileOpen && (
          <Suspense fallback={null}>
            <ProfileModal
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              profile={profile}
              onSaveProfile={handleUpdateProfile}
              onNavigate={handleSelectTab}
              lang={lang}
            />
          </Suspense>
        )}

        {isGuidedTourOpen && (
          <Suspense fallback={null}>
            <GuidedTourModal
              isOpen={isGuidedTourOpen}
              onClose={() => setIsGuidedTourOpen(false)}
              onNavigateTab={handleSelectTab}
              lang={lang}
            />
          </Suspense>
        )}

        {/* Mobile / tablet bottom tab bar (app pages only) */}
        {!isMarketing && activeTab !== 'auth' && <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={handleSelectTab}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          profile={profile}
        />}

        {/* Global Notifications & Cookie Consent Alerts */}
        <ToastContainer />
        <LiveAlertsWatcher enabled={authStatus === 'authenticated'} preferences={profile?.preferences} />
        <CookieConsentBanner />
      </div>
    </div>
  );

  return content;
}

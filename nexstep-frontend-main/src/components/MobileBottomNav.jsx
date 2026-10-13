import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, X, Search, Sun, Moon, Languages, LogOut, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { getUserRole, useAuth } from '../context/AuthContext.jsx';
import { getAllNavItems, getNavGroups, getAccountItems, navLabel, NAV_ITEMS, normaliseRole } from '../config/navigation.js';
import { profileLevel, LEVEL_PRIMARY_TAB } from '../config/educationLevels.js';

/** The four primary tabs per role; everything else lives in "More". */
const PRIMARY_BY_ROLE = {
  STUDENT: ['dashboard', 'pathway', 'aiChatbot'],
  MENTOR:  ['mentorPortal', 'calendarNotif', 'community', 'aiChatbot'],
};
const SHORT = { pathway: 'Pathway', quiz: 'Quiz', fscMapper: 'Streams', universities: 'Unis', entryTestPrep: 'Tests', dashboard: 'Home', careerAi: 'Career', aiChatbot: 'AI Chat', jobs: 'Jobs', mentorPortal: 'Mentees', calendarNotif: 'Calendar', analytics: 'Stats', community: 'Community', settings: 'Settings' };
const SHORT_UR = { pathway: 'راستہ', dashboard: 'ہوم', careerAi: 'کیریئر', aiChatbot: 'اے آئی', jobs: 'نوکریاں', analytics: 'تجزیات', settings: 'ترتیبات' };

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  lang = 'en',
  setLang,
  theme: themeProp,
  setTheme: setThemeProp,
  isMobileView = false,
  profile,
}) {
  const { theme: themeCtx, setTheme: setThemeCtx } = useTheme();
  const { user, logout } = useAuth();
  const role = normaliseRole(getUserRole(user));
  const theme = themeProp || themeCtx;
  const setTheme = setThemeProp || setThemeCtx;
  const isUr = lang === 'ur';

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [query, setQuery] = useState('');

  const level = profileLevel(profile);
  const primaryIds = role === 'STUDENT'
    ? [...PRIMARY_BY_ROLE.STUDENT.slice(0, 2), LEVEL_PRIMARY_TAB[level] || 'careerAi', 'aiChatbot']
    : PRIMARY_BY_ROLE[role];
  const primaryTabs = primaryIds.map((id) => ({ id, ...NAV_ITEMS[id] }));
  const groups = useMemo(() => {
    const all = [...getNavGroups(role, level), { id: 'account', title: 'Account', titleUr: 'اکاؤنٹ', items: getAccountItems(role) }];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    const matches = getAllNavItems(role, level).filter((i) =>
      [i.label, i.labelUr, i.desc].some((v) => v && v.toLowerCase().includes(q)));
    return [{ id: 'results', title: 'Results', titleUr: 'نتائج', items: matches }];
  }, [role, query, level]);
  const moreActive = !primaryTabs.some((t) => t.id === activeTab);

  const go = (id) => { setActiveTab(id); setIsMoreOpen(false); setQuery(''); };
  const tabLabel = (id) => (isUr ? SHORT_UR[id] : null) || SHORT[id] || NAV_ITEMS[id].label;

  return (
    <>
      <div id="ns-bottom-nav" className={`${isMobileView ? 'absolute' : 'fixed lg:hidden'} bottom-0 left-0 right-0 z-40`}>
        <nav
          aria-label="Primary"
          className="flex items-stretch justify-around bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {[...primaryTabs, { id: 'more', icon: LayoutGrid }].map((tab) => {
            const Icon = tab.icon;
            const isMore = tab.id === 'more';
            const isActive = isMore ? (isMoreOpen || moreActive) : (activeTab === tab.id && !isMoreOpen);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => (isMore ? setIsMoreOpen(true) : go(tab.id))}
                aria-current={isActive && !isMore ? 'page' : undefined}
                className={`relative flex-1 min-w-0 h-14 flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                <span className="text-[11px] font-medium leading-none truncate max-w-full px-1">
                  {isMore ? (isUr ? 'مزید' : 'More') : tabLabel(tab.id)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 lg:hidden" role="dialog" aria-modal="true" aria-label={isUr ? 'تمام صفحات' : 'All pages'}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMoreOpen(false)} className="absolute inset-0" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              <div className="px-5 pt-3 pb-3 space-y-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{isUr ? 'تمام صفحات' : 'All pages'}</h3>
                  <button type="button" onClick={() => setIsMoreOpen(false)} aria-label="Close" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <label className="relative block">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isUr ? 'صفحہ تلاش کریں…' : 'Search pages…'}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white border border-transparent focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {groups.map((g) => (
                  <section key={g.id}>
                    <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{isUr ? g.titleUr : g.title}</p>
                    {g.items.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-slate-500">{isUr ? 'کوئی صفحہ نہیں ملا' : 'No pages found'}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {g.items.map((item) => {
                          const Icon = item.icon;
                          const active = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => go(item.id)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-start transition-colors cursor-pointer ${
                                active ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
                                active ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block text-sm font-medium truncate ${active ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'}`}>{navLabel(item, lang)}</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{item.desc}</span>
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" aria-hidden="true" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 border-t border-slate-100 dark:border-slate-800" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                <button type="button" onClick={() => setTheme && setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? (isUr ? 'روشن' : 'Light') : (isUr ? 'تاریک' : 'Dark')}</span>
                </button>
                <button type="button" onClick={() => setLang && setLang(isUr ? 'en' : 'ur')} className="h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                  <Languages className="w-4 h-4" />
                  <span>{isUr ? 'English' : 'اردو'}</span>
                </button>
                {user ? (
                  <button type="button" onClick={() => { setIsMoreOpen(false); logout(); setActiveTab('landing'); }} className="h-11 flex items-center justify-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-sm font-medium text-red-600 dark:text-red-400 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    <span>{isUr ? 'سائن آؤٹ' : 'Sign out'}</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => go('auth')} className="h-11 flex items-center justify-center rounded-xl bg-emerald-600 text-sm font-medium text-white cursor-pointer">
                    {isUr ? 'سائن اِن' : 'Sign in'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default MobileBottomNav;

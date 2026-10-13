import React, { useState, useEffect } from 'react';
import { getUserRole, useAuth } from '../context/AuthContext.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Sparkles, 
  Compass, 
  FileText, 
  TrendingUp, 
  Briefcase, 
  Building2, 
  GraduationCap, 
  Bot, 
  Sliders, 
  Mic, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Globe, 
  BookOpen, 
  Award, 
  Wrench,
  ArrowRight
} from 'lucide-react';
import { tr } from '../utils/translator.js';
import { getAllNavItems, navLabel } from '../config/navigation.js';

export function CommandPaletteModal({ isOpen, onClose, onOpen, onSelectTab, lang = 'en', profile }) {
  const [query, setQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isSearchKey = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK');
      if (isSearchKey) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
          onOpen?.();
        }
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, onOpen]);

  if (!isOpen) return null;

  const role = getUserRole(user);
  const allItems = getAllNavItems(role, profile?.education?.level || null);

  const visibleItems = allItems.filter(item => !item.roles || item.roles.includes(role));
  const filtered = query.trim() === ''
    ? visibleItems
    : visibleItems.filter(item => 
        [item.label, item.labelUr, item.desc, item.category, item.categoryUr].some((value) =>
          String(value || '').toLowerCase().includes(query.toLowerCase())
        )
      );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'ur' ? 'پورٹل میں کچھ بھی تلاش کریں (مثال: سکالرشپ، یونیورسٹی)...' : 'Type a command or search (e.g., Scholarships, Resume, AI Chat)...'}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md border border-slate-300 dark:border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/50">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold">{lang === 'ur' ? 'کوئی نائج نہیں ملا' : 'No matching pages found'}</p>
              </div>
            ) : (
              filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/80 dark:hover:bg-blue-950/50 text-left transition-all group cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shrink-0 shadow-2xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {navLabel(item, lang)}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {lang === 'ur' ? item.categoryUr : item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                          {tr(item.desc, lang)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{lang === 'ur' ? 'کی بورڈ شارٹ کٹ: ⌘K یا Ctrl+K' : 'Press ⌘K anytime to open global command search'}</span>
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">NexStep AI</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

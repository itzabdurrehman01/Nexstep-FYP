import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Filter, 
  FileCheck, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowUpRight, 
  Search, 
  ExternalLink,
  Award,
  GraduationCap,
  Briefcase,
  Layers,
  X
} from 'lucide-react';

export function RecentActivityTimeline({ onNavigate, lang = 'en' }) {
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Applications', 'Lessons', 'AI Insights'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const activities = [];

  // Filter activities based on active tab and search query
  const filteredActivities = activities.filter(item => {
    const matchesFilter = activeFilter === 'All' || item.category === activeFilter;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
      {/* Widget Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {lang === 'ur' ? 'حالیہ سرگرمیوں کی ٹائم لائن' : 'Recent Activity Timeline'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {lang === 'ur' 
              ? 'درخواستوں کی صورتحال، مکمل شدہ اسباق اور اے آئی تجاویز کی لائیو اپڈیٹس' 
              : 'Track application updates, finished lessons, and personalized AI insights'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', 'Applications', 'Lessons', 'AI Insights'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'All' ? (lang === 'ur' ? 'تمام' : 'All') :
               cat === 'Applications' ? (lang === 'ur' ? 'درخواستیں' : 'Applications') :
               cat === 'Lessons' ? (lang === 'ur' ? 'اسباق' : 'Lessons') :
               (lang === 'ur' ? 'اے آئی تجاویز' : 'AI Insights')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'ur' ? 'سرگرمی یا نوٹیفکیشن تلاش کریں...' : 'Search recent activity or updates...'}
          className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Timeline List View */}
      <div className="relative space-y-3 pt-1">
        {/* Vertical Connecting Line */}
        <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-slate-200/80 dark:bg-slate-800 pointer-events-none hidden sm:block" />

        <AnimatePresence mode="popLayout">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((act, index) => {
              const IconComponent = act.icon;
              
              // Dynamic color badges
              const badgeColors = {
                emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                teal: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
                blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
              }[act.color] || 'bg-slate-500/10 text-slate-700 border-slate-500/30';

              const iconBgClass = {
                emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
                teal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
                amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border-amber-300 dark:border-amber-800',
                blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400 border-blue-300 dark:border-blue-800',
              }[act.color] || 'bg-slate-100 text-slate-700';

              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => setSelectedActivity(act)}
                  className="relative group p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs hover:shadow-md"
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Icon Circle */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105 z-10 ${iconBgClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* Text Details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColors}`}>
                          {act.category}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {act.time}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {act.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-1">
                        {act.summary}
                      </p>
                    </div>
                  </div>

                  {/* Status Tag & Expand Arrow */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      {act.statusTag}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-colors">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 space-y-2 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Layers className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
              <p className="text-xs font-bold text-slate-500">
                {lang === 'ur' ? 'کوئی سرگرمی نہیں ملی' : 'No matching activity logs found'}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Activity Details Modal / Expandable Dialog */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 " />

              <div className="flex items-start justify-between gap-4 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    <selectedActivity.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      {selectedActivity.category} Update
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      {selectedActivity.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <p>{selectedActivity.details.description}</p>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Key Takeaway: {selectedActivity.details.keyTakeaway}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400 font-semibold">Logged: {selectedActivity.date}</span>
                
                {selectedActivity.details.actionTab && (
                  <button
                    onClick={() => {
                      const tab = selectedActivity.details.actionTab;
                      setSelectedActivity(null);
                      if (onNavigate) onNavigate(tab);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedActivity.details.actionLabel}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RecentActivityTimeline;

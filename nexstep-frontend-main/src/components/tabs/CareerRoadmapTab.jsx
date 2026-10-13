import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass, CheckCircle2, Circle, ArrowRight, Flag,
  RotateCcw, Target, Sparkles, TrendingUp, Map,
  ListChecks, LayoutGrid, Clock, ChevronRight,
  Briefcase, GraduationCap, School, BookOpen, Rocket,
  Zap, Award, Calendar, CheckSquare, Square,
  ChevronDown, X, AlertTriangle, PartyPopper
} from 'lucide-react';
import {
  loadRoadmapAsync, saveRoadmapAsync, resetRoadmapAsync,
  getDefaultMilestonesForCareer, getRoadmapCareerOptions, computeRoadmapProgress,
} from '../../services/roadmapService.js';
import { CAREERS_DATA } from '../../data/careersData.js';

const CAREER_TO_ROADMAP = {
  'car-1': 'car-1',
  'car-2': 'car-2',
  'car-3': 'car-3',
};

function getRoadmapId(careerId) {
  return CAREER_TO_ROADMAP[careerId] ?? 'default';
}

const CATEGORY_CONFIG = {
  foundation: {
    label: 'Foundation',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500 ',
    ring: 'ring-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    icon: School,
    ringColor: '#3b82f6',
  },
  intermediate: {
    label: 'Intermediate',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500 ',
    ring: 'ring-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900',
    icon: BookOpen,
    ringColor: '#10b981',
  },
  prep: {
    label: 'University Prep',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500 ',
    ring: 'ring-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    icon: Target,
    ringColor: '#8b5cf6',
  },
  university: {
    label: 'University Degree',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500 ',
    ring: 'ring-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900',
    icon: GraduationCap,
    ringColor: '#f59e0b',
  },
  professional: {
    label: 'Career Launch',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500 ',
    ring: 'ring-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900',
    icon: Rocket,
    ringColor: '#14b8a6',
  },
};

const CATEGORY_ORDER = ['foundation', 'intermediate', 'prep', 'university', 'professional'];

function categorizeMilestone(milestone) {
  const title = (milestone.title || '').toLowerCase();
  if (title.includes('matric') || title.includes('o-level') || title.includes('foundation') || title.includes('grade 9') || title.includes('grade 10')) return 'foundation';
  if (title.includes('fsc') || title.includes('ics') || title.includes('intermediate') || title.includes('grade 11') || title.includes('grade 12')) return 'intermediate';
  if (title.includes('entry test') || title.includes('mdcat') || title.includes('admission') || title.includes('prep')) return 'prep';
  if (title.includes('university') || title.includes('mbbs') || title.includes('bs ') || title.includes('degree') || title.includes('enrollment') || title.includes('clinical')) return 'university';
  return 'professional';
}

function MiniRing({ score, size = 56, strokeWidth = 6, color = '#10b981' }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg width={size} height={size} aria-hidden="true" className="rotate-[-90deg] shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
        stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
        stroke={color} strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  );
}

function ReadinessRing({ score, size = 120, strokeWidth = 10 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const col = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} aria-hidden="true" className="rotate-[-90deg] shrink-0 drop-shadow-[0_0_20px_rgba(16,185,129,0.25)]">
      <defs>
        <linearGradient id="roadmapRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={col} stopOpacity="1" />
          <stop offset="100%" stopColor={col} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
        stroke="currentColor" className="text-slate-700/50" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
        stroke="url(#roadmapRingGrad)" strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.3, ease: 'easeOut' }} />
    </svg>
  );
}

function ProgressBar({ value, gradient = 'bg-emerald-500 ', height = 'h-2' }) {
  return (
    <div className={`ns-progress ${height}`}>
      <motion.div
        className={`ns-progress-bar  ${gradient}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

function MilestoneTimelineNode({ status, category, index }) {
  const cat = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.professional;
  return (
    <div className="relative flex flex-col items-center shrink-0 w-14">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 22 }}
        className="relative z-10"
      >
        {status === 'completed' ? (
          <div className={`w-11 h-11 rounded-full ${cat.dot} flex items-center justify-center shadow-lg shadow-${cat.dot}/30 ring-4 ring-white dark:ring-slate-900`}>
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        ) : status === 'current' ? (
          <div className="relative">
            <motion.div
              className={`absolute inset-0 w-11 h-11 rounded-full ${cat.dot}`}
              initial={{ opacity: 0.4, scale: 1 }}
              animate={{ opacity: [0.4, 0, 0.4], scale: [1, 1.6, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ opacity: 0.2 }}
            />
            <div className={`relative w-11 h-11 rounded-full ring-4 ${cat.ring} ring-opacity-30 bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg shadow-${cat.dot}/40`}>
              <div className={`w-6 h-6 rounded-full ${cat.dot} flex items-center justify-center`}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-11 h-11 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-sm">
            <Circle className="w-5 h-5 text-slate-400" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ConnectorLine({ fromStatus, toStatus, category }) {
  const cat = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.professional;
  if (fromStatus === 'completed' && (toStatus === 'completed' || toStatus === 'current')) {
    return (
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: '100%' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className={`absolute left-1/2 -translate-x-1/2 top-11 w-0.5 ${cat.dot} bottom-0 z-0`}
      />
    );
  }
  if (fromStatus === 'current' || (fromStatus === 'completed' && toStatus === 'upcoming')) {
    return (
      <div className="absolute left-1/2 -translate-x-1/2 top-11 w-0.5 bottom-0 z-0 overflow-hidden">
        <motion.div
          className="w-full h-full"
          initial={{ y: '-100%' }}
          animate={{ y: '0%' }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{
            background: `linear-gradient(to bottom, transparent, ${cat.ringColor}66, transparent)`,
          }}
        />
      </div>
    );
  }
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-11 w-0.5 bottom-0 z-0 border-l-2 border-dashed border-slate-300 dark:border-slate-700" />
  );
}

function getTemplateSuggestion(profile) {
  const target = (profile?.targetCareer || '').toLowerCase();
  const stream = (profile?.preferredStream || '').toLowerCase();
  if (target.includes('med') || target.includes('doctor') || target.includes('mbbs') || target.includes('surg') || stream.includes('pre-med')) {
    return { id: 'car-2', label: 'Pre-Medical Roadmap', desc: 'MBBS journey: FSc Pre-Medical → MDCAT → Medical College → House Job → FCPS/MS', icon: GraduationCap };
  }
  if (target.includes('engin') || target.includes('civil') || target.includes('mech') || target.includes('electr') || stream.includes('pre-eng')) {
    return { id: 'car-1', label: 'Engineering Roadmap', desc: 'Engineering path: FSc Pre-Engineering → Entry Test → University → Internship → P.Eng', icon: Briefcase };
  }
  if (target.includes('soft') || target.includes('comput') || target.includes('ai') || target.includes('data') || target.includes('cyber') || target.includes('cs') || stream.includes('ics')) {
    return { id: 'car-1', label: 'CS / Software Engineering Roadmap', desc: 'Tech career: ICS → NET/NTS → BS CS/SE → Projects → Software / AI / Data Engineer role', icon: Rocket };
  }
  return { id: 'default', label: 'General Career Pathway', desc: 'Flexible roadmap: Foundation → Skill Building → Education → Career Entry', icon: Compass };
}

function ConfettiBurst({ show }) {
  const particles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 200,
      y: -(50 + Math.random() * 100),
      rot: (Math.random() - 0.5) * 720,
      color: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'][i % 6],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 0.1,
    })), []);
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: 0,
            rotate: p.rot,
            scale: 0.3,
          }}
          transition={{
            duration: 0.9 + Math.random() * 0.4,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

const VIEW_TABS = [
  { id: 'timeline', label: 'Timeline view', icon: Map },
  { id: 'checklist', label: 'Checklist view', icon: ListChecks },
  { id: 'overview', label: 'Overview stats', icon: LayoutGrid },
];

function CareerSelector({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const sel = options.find(o => o.id === value);
  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="ns-btn ns-btn-ghost flex items-center gap-2 min-w-[180px] justify-between font-bold text-xs"
      >
        <span className="truncate">{sel?.label ?? 'Select career'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              role="listbox"
              className="absolute z-50 right-0 mt-2 w-72 rounded-2xl ns-card shadow-2xl p-1.5 max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700"
            >
              {options.map(opt => (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={value === opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                    value === opt.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                role="option"
                aria-selected={value === 'default'}
                onClick={() => { onChange('default'); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  value === 'default'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>General Career Pathway</span>
                {value === 'default' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResetModal({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="ns-card relative w-full max-w-md p-6 shadow-2xl overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative z-10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 id="reset-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                Reset Roadmap Progress?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                This action will permanently clear all milestones and completed tasks for your current roadmap. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/60 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider">Irreversible</p>
              <p className="text-xs text-red-600/80 dark:text-red-300/80 font-medium">All saved progress will be lost</p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="ns-btn ns-btn-ghost flex-1 font-bold text-sm py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="ns-btn ns-btn-primary flex-1 font-bold text-sm py-2.5 bg-red-600 hover:bg-red-500 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              Yes, Reset Everything
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CareerRoadmapTab({ profile, onNavigate, lang }) {
  const [milestones, setMilestones] = useState([]);
  const [selectedCareerId, setSelectedCareerId] = useState('car-1');
  const [activeView, setActiveView] = useState('timeline');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [justCompleted, setJustCompleted] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [confettiTaskId, setConfettiTaskId] = useState(null);

  const careerOptions = useMemo(() => getRoadmapCareerOptions(), []);

  useEffect(() => {
    (async () => {
      const saved = await loadRoadmapAsync();
      if (saved && saved.milestones && saved.milestones.length > 0) {
        setSelectedCareerId(saved.selectedCareerId ?? 'car-1');
        setMilestones(saved.milestones);
        setIsEmptyState(false);
      } else {
        setIsEmptyState(true);
        const profileTarget = profile?.targetCareer;
        const matchedCareer = CAREERS_DATA.find(c =>
          c.title === profileTarget || c.id === profileTarget
        );
        const initId = matchedCareer ? (CAREER_TO_ROADMAP[matchedCareer.id] ?? 'car-1') : 'car-1';
        setSelectedCareerId(initId);
      }
      setLoaded(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded || milestones.length === 0) return;
    saveRoadmapAsync({ selectedCareerId, milestones });
    setIsEmptyState(false);
  }, [milestones, selectedCareerId, loaded]);

  const progress = useMemo(() => computeRoadmapProgress(milestones), [milestones]);

  const handleCareerChange = useCallback((newCareerId) => {
    setSelectedCareerId(newCareerId);
    const fresh = getDefaultMilestonesForCareer(newCareerId);
    setMilestones(fresh);
    setShowResetConfirm(false);
  }, []);

  const generateRoadmap = useCallback((careerId) => {
    const fresh = getDefaultMilestonesForCareer(careerId);
    setSelectedCareerId(careerId);
    setMilestones(fresh);
    setIsEmptyState(false);
  }, []);

  const toggleTask = useCallback((milestoneId, taskId) => {
    let triggered = false;
    setMilestones(prev => {
      const next = prev.map(m => {
        if (m.id !== milestoneId) return m;
        const newTasks = (m.tasks ?? []).map(t =>
          t.id === taskId ? { ...t, done: !t.done } : t
        );
        const allDone = newTasks.every(t => t.done);
        const anyDone = newTasks.some(t => t.done);
        let newStatus = m.status;
        if (allDone && m.status !== 'completed') {
          newStatus = 'completed';
          if (!newTasks.find(t => t.id === taskId)?.done === false) triggered = true;
        } else if (!allDone && m.status === 'completed') {
          newStatus = 'current';
        }
        const justMarkedDone = newTasks.find(t => t.id === taskId)?.done;
        if (justMarkedDone) triggered = true;
        return { ...m, tasks: newTasks, status: newStatus };
      });
      return next;
    });
    setJustCompleted(taskId);
    if (triggered) {
      setConfettiTaskId(taskId);
      setTimeout(() => setConfettiTaskId(null), 1400);
    }
    setTimeout(() => setJustCompleted(null), 1200);
  }, []);

  const handleReset = useCallback(() => {
    resetRoadmapAsync();
    setMilestones([]);
    setIsEmptyState(true);
    setShowResetConfirm(false);
  }, []);

  const templateSuggestion = useMemo(() => getTemplateSuggestion(profile), [profile]);

  const nextTask = useMemo(() => {
    for (const m of milestones) {
      const pending = (m.tasks ?? []).find(t => !t.done);
      if (pending) return { task: pending, milestone: m };
    }
    return null;
  }, [milestones]);

  const categorizedMilestones = useMemo(() =>
    milestones.map(m => ({ ...m, category: categorizeMilestone(m) }))
  , [milestones]);

  const estimatedTimeToNext = useMemo(() => {
    const current = milestones.find(m => m.status === 'current');
    if (!current) return null;
    const doneCount = (current.tasks ?? []).filter(t => t.done).length;
    const remaining = (current.tasks ?? []).length - doneCount;
    if (remaining === 0) return null;
    const weeksPerTask = 1.5;
    const totalWeeks = Math.ceil(remaining * weeksPerTask);
    if (totalWeeks >= 4) return `~${Math.ceil(totalWeeks / 4)} month${totalWeeks >= 8 ? 's' : ''}`;
    return `~${totalWeeks} week${totalWeeks > 1 ? 's' : ''}`;
  }, [milestones]);

  const perCategoryProgress = useMemo(() => {
    const map = {};
    for (const cat of CATEGORY_ORDER) {
      const items = categorizedMilestones.filter(m => m.category === cat);
      let done = 0, total = 0;
      for (const item of items) {
        const tasks = item.tasks ?? [];
        done += tasks.filter(t => t.done).length;
        total += tasks.length;
      }
      map[cat] = total > 0 ? Math.round((done / total) * 100) : 0;
    }
    return map;
  }, [categorizedMilestones]);

  if (!loaded) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-56 rounded-3xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (isEmptyState || milestones.length === 0) {
    const SugIcon = templateSuggestion.icon;
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl ns-hero text-white p-8 md:p-10 shadow-2xl border border-slate-700"
        >
          <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center gap-5 max-w-2xl mx-auto">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
              className="w-20 h-20 rounded-3xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl ring-4 ring-white/10"
            >
              <Map className="w-10 h-10" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400 ">
                Start Your Career Roadmap
              </h1>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                A personalized step-by-step journey from where you are today to your dream career. Track milestones, complete tasks, and watch your progress grow.
              </p>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="ns-card p-6 space-y-5 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
                <SugIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Suggested for You</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Based on your profile</p>
              </div>
            </div>
            <div className="space-y-1 relative z-10">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{templateSuggestion.label}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{templateSuggestion.desc}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => generateRoadmap(templateSuggestion.id)}
              className="ns-btn ns-btn-primary w-full py-3 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              aria-label={`Generate ${templateSuggestion.label}`}
            >
              <Sparkles className="w-4 h-4" />
              Generate This Roadmap
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="ns-card p-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Browse Roadmaps</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose any track</p>
              </div>
            </div>
            <div className="space-y-2">
              {careerOptions.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  whileHover={{ x: 3 }}
                  onClick={() => generateRoadmap(opt.id)}
                  className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  aria-label={`Browse ${opt.label} roadmap`}
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{opt.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showResetConfirm && (
          <ResetModal
            open={showResetConfirm}
            onClose={() => setShowResetConfirm(false)}
            onConfirm={handleReset}
          />
        )}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl ns-hero text-white shadow-2xl border border-slate-800"
        aria-label="Roadmap header"
      >
        <div className="absolute top-0 right-0 w-[32rem] h-[32rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute top-20 left-10 w-52 h-52 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-40 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 p-6 md:p-7 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center gap-6 lg:gap-8 justify-between">
            <div className="flex items-start gap-4 md:gap-5 min-w-0 flex-1">
              <motion.div
                whileHover={{ scale: 1.04, rotate: -2 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xl shrink-0 ring-4 ring-white/10"
              >
                <Map className="w-7 h-7 md:w-8 md:h-8" />
              </motion.div>
              <div className="min-w-0 space-y-2 flex-1">
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Career Roadmap
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed mt-1">
                    {profile?.targetCareer ? (
                      <>Your guided path to becoming a <span className="text-emerald-400 font-semibold">{profile?.targetCareer}</span></>
                    ) : (
                      <>Track your journey from foundation to career launch</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-slate-300 backdrop-blur">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {progress.doneTasks}/{progress.totalTasks} tasks
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-saved
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-3 pt-2 flex-wrap">
                  {CATEGORY_ORDER.map(catKey => {
                    const cat = CATEGORY_CONFIG[catKey];
                    const CatIcon = cat.icon;
                    const pct = perCategoryProgress[catKey] ?? 0;
                    return (
                      <motion.div
                        key={catKey}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur"
                        title={`${cat.label}: ${pct}%`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cat.dot} shrink-0`} />
                        <CatIcon className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">{cat.label}</span>
                        <span className={`text-[11px] font-black ${cat.text} shrink-0 ml-0.5`}>{pct}%</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 shrink-0 w-full xl:w-auto">
              <div className="flex items-center justify-center gap-5 shrink-0">
                <div className="relative shrink-0">
                  <ReadinessRing score={progress.pct} size={112} strokeWidth={10} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white leading-none">
                      {progress.pct}<span className="text-sm font-bold text-slate-400">%</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Ready</span>
                  </div>
                </div>
                <div className="space-y-1 hidden sm:block">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Progress</div>
                  <div className="w-36">
                    <ProgressBar value={progress.pct} gradient="bg-emerald-500 " height="h-1.5" />
                  </div>
                  <div className="flex items-center gap-3 pt-1.5">
                    <div>
                      <span className="text-sm font-black text-white">{progress.completedMilestones}</span>
                      <span className="text-[11px] text-slate-400 ml-0.5">/ {progress.totalMilestones}</span>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Milestones</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end sm:flex-col sm:items-stretch">
                <CareerSelector
                  value={selectedCareerId}
                  onChange={handleCareerChange}
                  options={careerOptions}
                />
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="ns-btn ns-btn-ghost !p-2.5 !min-w-0 text-slate-400 hover:text-white hover:bg-slate-800/70 border-slate-700"
                  title="Reset roadmap progress"
                  aria-label="Reset roadmap progress"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Progress by Phase</div>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORY_ORDER.map(catKey => {
                const cat = CATEGORY_CONFIG[catKey];
                const pct = perCategoryProgress[catKey] ?? 0;
                return (
                  <div key={catKey} className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-white/5">
                    <MiniRing score={pct} size={40} strokeWidth={5} color={cat.ringColor} />
                    <span className="text-[11px] font-bold text-slate-400 uppercase leading-tight text-center">{cat.label.slice(0, 4)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <nav aria-label="View switcher" className="mt-6">
            <div role="tablist" className="flex gap-1.5 p-1 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur">
              {VIEW_TABS.map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      isActive
                        ? ' bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </motion.section>

      <AnimatePresence mode="wait">
        {activeView === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 lg:grid-cols-[1fr_340px]"
          >
            <div className="space-y-2">
              {categorizedMilestones.map((m, idx) => {
                const cat = CATEGORY_CONFIG[m.category] ?? CATEGORY_CONFIG.professional;
                const doneTasks = (m.tasks ?? []).filter(t => t.done).length;
                const taskPct = (m.tasks ?? []).length > 0 ? Math.round((doneTasks / (m.tasks ?? []).length) * 100) : 0;
                const nextStatus = categorizedMilestones[idx + 1]?.status;
                const isLast = idx === categorizedMilestones.length - 1;
                const CatIcon = cat.icon;
                return (
                  <div key={m.id} className="relative">
                    {!isLast && (
                      <ConnectorLine
                        fromStatus={m.status}
                        toStatus={nextStatus}
                        category={m.category}
                      />
                    )}
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="relative z-10 flex gap-4"
                    >
                      <MilestoneTimelineNode status={m.status} category={m.category} index={idx} />
                      <div className="flex-1 pb-2 min-w-0">
                        <div className={`ns-card overflow-hidden ${m.status === 'current' ? 'ring-2 ring-emerald-400/30 shadow-lg' : ''}`}>
                          <div className={`px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 ${cat.bg}`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${cat.dot} text-white shrink-0 shadow-sm shadow-${cat.dot}/30`}>
                                <CatIcon className="w-3.5 h-3.5" />
                              </span>
                              <span className={`text-[11px] font-extrabold uppercase tracking-wider ${cat.text}`}>
                                {cat.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {doneTasks}/{(m.tasks ?? []).length}
                              </span>
                              <span className={`ns-badge ${
                                m.status === 'completed'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                                  : m.status === 'current'
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {m.status === 'current' ? 'Active' : m.status}
                              </span>
                            </div>
                          </div>
                          <div className="p-5 space-y-4 relative">
                            <ConfettiBurst show={m.tasks?.some(t => confettiTaskId === t.id)} />
                            <div className="space-y-1">
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-snug">
                                {m.title}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {m.period}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[11px] font-bold">
                                <span className="text-slate-600 dark:text-slate-400">Progress</span>
                                <span className={cat.text}>{taskPct}%</span>
                              </div>
                              <ProgressBar value={taskPct} gradient={cat.bar} />
                            </div>
                            <div className="space-y-2 pt-1">
                              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Action Items
                              </span>
                              {m.tasks.map(task => (
                                <motion.button
                                  key={task.id}
                                  layout
                                  onClick={() => toggleTask(m.id, task.id)}
                                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-emerald-500/40 ${
                                    task.done
                                      ? `${cat.bg} ${cat.border}`
                                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                                  } ${justCompleted === task.id ? 'ring-2 ring-emerald-400/60 scale-[1.015]' : ''}`}
                                  aria-pressed={task.done}
                                  aria-label={`${task.done ? 'Mark incomplete:' : 'Mark complete:'} ${task.text}`}
                                >
                                  <motion.span
                                    layout
                                    whileTap={{ scale: 0.85 }}
                                    className="shrink-0"
                                  >
                                    {task.done ? (
                                      <CheckSquare className={`w-5 h-5 ${cat.text}`} />
                                    ) : (
                                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors" />
                                    )}
                                  </motion.span>
                                  <span className={`text-xs font-medium flex-1 leading-relaxed ${
                                    task.done
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {task.text}
                                  </span>
                                  {justCompleted === task.id && task.done && (
                                    <motion.span
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="shrink-0 text-emerald-500"
                                    >
                                      <PartyPopper className="w-4 h-4" />
                                    </motion.span>
                                  )}
                                </motion.button>
                              ))}
                            </div>
                            {m.status === 'completed' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-1 p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2"
                              >
                                <Award className="w-4 h-4 shrink-0" />
                                Milestone completed — excellent progress!
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 lg:sticky lg:top-4 self-start">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="ns-card p-5 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
                    <Target className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Roadmap Progress</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {careerOptions.find(o => o.id === selectedCareerId)?.label ?? 'Career Pathway'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Overall</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{progress.pct}%</span>
                  </div>
                  <ProgressBar value={progress.pct} gradient="bg-emerald-500 " height="h-2.5" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center border border-slate-100 dark:border-slate-700/50">
                      <span className="block text-lg font-black text-slate-900 dark:text-white leading-none">{progress.completedMilestones}</span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Done</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center border border-slate-100 dark:border-slate-700/50">
                      <span className="block text-lg font-black text-slate-900 dark:text-white leading-none">{progress.totalMilestones}</span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="ns-card p-5 space-y-3.5"
              >
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Milestones Breakdown
                </h4>
                <div className="space-y-2.5">
                  {categorizedMilestones.map((m, i) => {
                    const cat = CATEGORY_CONFIG[m.category] ?? CATEGORY_CONFIG.professional;
                    const done = (m.tasks ?? []).filter(t => t.done).length;
                    const pct = (m.tasks ?? []).length > 0 ? Math.round((done / (m.tasks ?? []).length) * 100) : 0;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.03 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cat.dot} shrink-0`} />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">{m.title}</span>
                          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 shrink-0">{pct}%</span>
                        </div>
                        <div className="pl-4">
                          <ProgressBar value={pct} gradient={cat.bar} height="h-1" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {nextTask && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 24 }}
                  className="ns-card p-5 space-y-3 relative overflow-hidden ring-2 ring-amber-400/30 shadow-lg"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">
                      <Zap className="w-3 h-3" />
                      Focus Now
                    </span>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        {nextTask.milestone.title}
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {nextTask.task.text}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleTask(nextTask.milestone.id, nextTask.task.id)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark as Complete
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {estimatedTimeToNext && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="ns-card p-5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Next Milestone</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    At your current pace, approximately <span className="font-bold text-emerald-600 dark:text-emerald-400">{estimatedTimeToNext}</span> to complete the active milestone tasks.
                  </p>
                </motion.div>
              )}

              {progress.pct === 100 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 24 }}
                  className="ns-card p-5 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 space-y-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><GraduationCap className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" /></div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white">Roadmap Complete!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Prepare for your next step with our AI mock interview.
                  </p>
                  <button
                    onClick={() => onNavigate?.('mockInterview')}
                    className="ns-btn ns-btn-primary w-full py-2.5 font-extrabold text-xs flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Practice Interview
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'checklist' && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="ns-card p-5 md:p-7 space-y-7 relative"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <ListChecks className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Master Checklist</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {progress.doneTasks} of {progress.totalTasks} tasks complete
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-60 space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Total Progress</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{progress.pct}%</span>
                </div>
                <ProgressBar value={progress.pct} gradient="bg-emerald-500 " height="h-2.5" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">By Phase</div>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORY_ORDER.map(catKey => {
                  const cat = CATEGORY_CONFIG[catKey];
                  const pct = perCategoryProgress[catKey] ?? 0;
                  const CatIcon = cat.icon;
                  return (
                    <div key={catKey} className={`p-3 rounded-xl ${cat.bg} border ${cat.border} flex flex-col items-center gap-1.5`}>
                      <span className={`w-6 h-6 rounded-lg ${cat.dot} text-white flex items-center justify-center shrink-0`}>
                        <CatIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300 leading-tight text-center">{cat.label}</span>
                      <span className={`text-sm font-black ${cat.text}`}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              {categorizedMilestones.map((m, idx) => {
                const cat = CATEGORY_CONFIG[m.category] ?? CATEGORY_CONFIG.professional;
                const done = (m.tasks ?? []).filter(t => t.done).length;
                const allDone = done === (m.tasks ?? []).length;
                const CatIcon = cat.icon;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`space-y-3 p-4 md:p-5 rounded-2xl ${cat.bg} border ${cat.border}`}
                  >
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${cat.dot} text-white shrink-0 shadow-sm`}>
                        <CatIcon className="w-4.5 h-4.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                          {m.title}
                        </h3>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {m.period} · {done}/{m.tasks.length} tasks
                        </span>
                      </div>
                      {allDone && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold border border-emerald-200 dark:border-emerald-900"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </motion.span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <ProgressBar value={m.tasks.length > 0 ? Math.round((done / m.tasks.length) * 100) : 0} gradient={cat.bar} height="h-1.5" />
                    </div>
                    <div className="grid gap-2">
                      {m.tasks.map(task => (
                        <motion.button
                          key={task.id}
                          layout
                          onClick={() => toggleTask(m.id, task.id)}
                          whileTap={{ scale: 0.985 }}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-emerald-500/40 ${
                            task.done
                              ? `bg-white dark:bg-slate-800/40 ${cat.border}`
                              : 'bg-white dark:bg-slate-800/20 border-slate-200/70 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                          } ${justCompleted === task.id ? 'ring-2 ring-emerald-400/50' : ''}`}
                          aria-pressed={task.done}
                        >
                          <ConfettiBurst show={confettiTaskId === task.id} />
                          <motion.span whileTap={{ scale: 0.85 }} className="shrink-0 relative z-10">
                            {task.done ? (
                              <CheckSquare className={`w-5 h-5 ${cat.text}`} />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
                            )}
                          </motion.span>
                          <span className={`text-xs font-medium flex-1 relative z-10 ${
                            task.done
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {task.text}
                          </span>
                          {justCompleted === task.id && task.done && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="shrink-0 text-emerald-500 relative z-10"
                            >
                              <PartyPopper className="w-4 h-4" />
                            </motion.span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div className="ns-card p-6 md:p-7 flex flex-col md:flex-row items-center gap-6 lg:gap-8">
              <div className="relative shrink-0">
                <ReadinessRing score={progress.pct} size={150} strokeWidth={13} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                    {progress.pct}<span className="text-xl font-bold text-slate-500">%</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5">Complete</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-4 w-full text-center md:text-left">
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {careerOptions.find(o => o.id === selectedCareerId)?.label ?? 'Career Pathway'}
                  </h2>
                  {profile?.targetCareer && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Target role: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{profile?.targetCareer}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Tasks', val: progress.totalTasks, color: 'text-slate-900 dark:text-white', icon: ListChecks, grad: 'bg-slate-500 ' },
                    { label: 'Completed', val: progress.doneTasks, color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, grad: 'bg-emerald-500 ' },
                    { label: 'Remaining', val: progress.totalTasks - progress.doneTasks, color: 'text-amber-600 dark:text-amber-400', icon: Clock, grad: 'bg-amber-500 ' },
                    { label: 'Milestones', val: `${progress.completedMilestones}/${progress.totalMilestones}`, color: 'text-blue-600 dark:text-blue-400', icon: Flag, grad: 'bg-blue-500 ' },
                  ].map((s, i) => {
                    const SIcon = s.icon;
                    return (
                      <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 24 }}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-1.5 relative overflow-hidden"
                      >
                        <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full  ${s.grad} opacity-5`} />
                        <div className="flex items-center gap-2 relative z-10">
                          <SIcon className={`w-3.5 h-3.5 ${s.color}`} />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</span>
                        </div>
                        <span className={`text-xl md:text-2xl font-black ${s.color} relative z-10 block leading-none`}>{s.val}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="ns-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Phase Progress Rings
                </h3>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">5-Phase Roadmap</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {CATEGORY_ORDER.map((catKey, i) => {
                  const cat = CATEGORY_CONFIG[catKey];
                  const pct = perCategoryProgress[catKey] ?? 0;
                  const CatIcon = cat.icon;
                  return (
                    <motion.div
                      key={catKey}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 22 }}
                      className={`p-4 rounded-2xl ${cat.bg} border ${cat.border} flex flex-col items-center gap-2 text-center`}
                    >
                      <div className="relative">
                        <MiniRing score={pct} size={64} strokeWidth={7} color={cat.ringColor} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xs font-black ${cat.text}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className={`w-7 h-7 rounded-lg ${cat.dot} text-white flex items-center justify-center mx-auto mb-1`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </span>
                        <div className="text-[11px] font-extrabold uppercase tracking-tight text-slate-800 dark:text-slate-200 leading-tight">{cat.label}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="ns-card p-6 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Milestone Progression
                </h3>
                <div className="space-y-4">
                  {categorizedMilestones.map((m, idx) => {
                    const cat = CATEGORY_CONFIG[m.category] ?? CATEGORY_CONFIG.professional;
                    const done = (m.tasks ?? []).filter(t => t.done).length;
                    const pct = (m.tasks ?? []).length > 0 ? Math.round((done / (m.tasks ?? []).length) * 100) : 0;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-3 h-3 rounded-full ${cat.dot} shrink-0 ring-4 ring-white dark:ring-slate-900 shadow-sm`} />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{m.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-400">{done}/{m.tasks.length}</span>
                            <span className={`text-[11px] font-black ${cat.text}`}>{pct}%</span>
                          </div>
                        </div>
                        <ProgressBar value={pct} gradient={cat.bar} height="h-1.5" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="ns-card p-6 space-y-3 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/8 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 relative z-10">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Next Recommended Step
                  </h3>
                  {nextTask ? (
                    <div className="space-y-3 relative z-10">
                      <div className={`p-4 rounded-2xl ${CATEGORY_CONFIG[nextTask.milestone.category]?.bg ?? 'bg-slate-50 dark:bg-slate-800/40'} border ${CATEGORY_CONFIG[nextTask.milestone.category]?.border ?? 'border-slate-200 dark:border-slate-700'}`}>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {nextTask.milestone.title}
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {nextTask.task.text}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleTask(nextTask.milestone.id, nextTask.task.id)}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Complete This Task
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center py-6">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><PartyPopper className="w-7 h-7" strokeWidth={1.75} aria-hidden="true" /></div>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">All tasks complete!</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">You&apos;re fully prepared for your career journey.</p>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="ns-card p-6 space-y-3"
                >
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Flag className="w-4 h-4 text-blue-500" />
                    Milestone Status
                  </h3>
                  <div className="space-y-2.5">
                    {['completed', 'current', 'upcoming'].map((status, i) => {
                      const count = milestones.filter(m => m.status === status).length;
                      const config = {
                        completed: { dot: 'bg-emerald-500', label: 'Completed', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900' },
                        current:   { dot: 'bg-amber-500',   label: 'In Progress', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900' },
                        upcoming:  { dot: 'bg-slate-400',   label: 'Upcoming',    text: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-50 dark:bg-slate-800/40',    border: 'border-slate-200 dark:border-slate-700' },
                      }[status];
                      return (
                        <motion.div
                          key={status}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + i * 0.04 }}
                          className={`flex items-center justify-between p-3 rounded-xl ${config.bg} border ${config.border}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                            <span className={`text-xs font-bold ${config.text}`}>{config.label}</span>
                          </div>
                          <span className={`text-sm font-black ${config.text}`}>{count}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {progress.pct < 100 && progress.upcomingTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="ns-card p-6 space-y-3"
                  >
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      Upcoming Tasks
                    </h3>
                    <div className="space-y-1">
                      {progress.upcomingTasks.slice(0, 5).map((task, i) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.18 + i * 0.04 }}
                          className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[11px] font-extrabold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{task.text}</span>
                        </motion.div>
                      ))}
                    </div>
                    <button
                      onClick={() => onNavigate?.('skillGap')}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500/40 rounded"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      View Skill Gap Analysis
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

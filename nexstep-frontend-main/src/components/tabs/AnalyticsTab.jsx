import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  BarChart3, TrendingUp, Award, CheckCircle2, Download,
  AlertCircle, Loader2, RefreshCw, Target, Sparkles, BookOpen,
  Briefcase, User, Calendar, ArrowUp, ArrowDown,
  Activity, Clock, FileText, ChevronRight, Zap,
} from 'lucide-react';
import { loadAnalyticsData } from '../../services/analyticsService.js';

const PALETTE = {
  emerald: '#059669',
  indigo:  '#2563eb',
  amber:   '#d97706',
  violet:  '#64748b',
  teal:    '#0284c7',
};

const PIE_COLORS = [PALETTE.emerald, PALETTE.indigo, PALETTE.amber, PALETTE.violet, PALETTE.teal, '#ef4444'];
const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'All time'];

function MiniRing({ pct, size = 44, stroke = 4, color = PALETTE.emerald }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`${pct} percent`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-200 dark:text-slate-700" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="text-[11px] font-extrabold fill-slate-700 dark:fill-slate-200">
        {pct}%
      </text>
    </svg>
  );
}

function ChartTooltip({ isDark }) {
  return {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    borderRadius: '14px',
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '11px',
    padding: '10px 14px',
    boxShadow: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
  };
}

function NsEmpty({ icon: Icon, title, body, action }) {
  return (
    <div className="ns-empty" role="status" aria-live="polite">
      <div className="ns-empty-icon">
        {Icon && <Icon className="w-7 h-7" aria-hidden="true" />}
      </div>
      <div className="space-y-1">
        <div className="ns-empty-title">{title}</div>
        <div className="ns-empty-sub">{body}</div>
      </div>
      {action}
    </div>
  );
}

function ChartCard({ title, subtitle, children, delay = 0, ariaLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="ns-card ns-card-hover p-6 print:shadow-none print:border-slate-300"
      role="region"
      aria-label={ariaLabel || title}
    >
      <div className="mb-4">
        <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

function GradientDefs() {
  return (
    <defs>
      <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.emerald} stopOpacity={0.38} />
        <stop offset="100%" stopColor={PALETTE.emerald} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.indigo} stopOpacity={0.32} />
        <stop offset="100%" stopColor={PALETTE.indigo} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.amber} stopOpacity={0.30} />
        <stop offset="100%" stopColor={PALETTE.amber} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.violet} stopOpacity={0.30} />
        <stop offset="100%" stopColor={PALETTE.violet} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradTeal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={PALETTE.teal} />
        <stop offset="100%" stopColor={PALETTE.emerald} />
      </linearGradient>
      <linearGradient id="gradBarEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.emerald} />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
      <linearGradient id="gradBarIndigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PALETTE.indigo} />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
  );
}

function SkeletonKpiCard() {
  return (
    <div className="ns-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-8 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonChartCard() {
  return (
    <div className="ns-card p-6">
      <div className="space-y-2 mb-4">
        <div className="h-5 w-48 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-64 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
      <div className="h-[260px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
        <div className="space-y-3 w-full px-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="h-3 w-16 rounded bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
              <div
                className="rounded bg-slate-200 dark:bg-slate-700 animate-pulse"
                style={{ height: `${20 + (i * 8)}px`, width: `${80 - (i * 10)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="ns-card p-6">
      <div className="space-y-2 mb-4">
        <div className="h-5 w-36 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-3 w-72 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <div className="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse col-span-1" />
            <div className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsTab({ profile, lang, onNavigate }) {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('All time');

  const axisText = isDark ? '#94a3b8' : '#64748b';
  const gridLine = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(226,232,240,0.7)';
  const tooltipStyle = useMemo(() => ChartTooltip({ isDark }), [isDark]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadAnalyticsData(profile);
      setData(result);
    } catch (err) {
      setError('Failed to load analytics data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => window.print();

  const d = data ?? {};
  const { profileCompletion, skillGapSummary, roadmap, interviewAnalytics, applications, bestCareerScore } = d;
  const careerMatches = Array.isArray(d?.careerMatches) ? d.careerMatches : [];
  const skillReadiness = Array.isArray(d?.skillReadiness) ? d.skillReadiness : [];
  const academicMarks = Array.isArray(d?.academicMarks) ? d.academicMarks : [];

  const roadmapMilestones = Array.isArray(roadmap?.perMilestone) ? roadmap.perMilestone : [];
  const activityTimelineData = roadmapMilestones.map((m) => ({
    label: m.name,
    progress: m.pct,
    tasks: m.completed,
  })) || [];

  const interviewTrendData = Array.isArray(interviewAnalytics?.chartData) ? interviewAnalytics.chartData : [];

  const skillMatchData = skillReadiness.slice(0, 10).map(s => ({
    skill: s.skill,
    match: s.status === 'have' ? 100 : 0,
    missing: s.status === 'missing' ? 100 : 0,
  }));

  const careerMatchData = careerMatches.slice(0, 5).map(c => ({
    name: c.shortTitle,
    score: c.score,
    demand: c.demandLevel,
  }));

  const categoryData = useMemo(() => {
    const cats = [];
    if (Array.isArray(applications?.byType) && applications.byType.length) {
      applications.byType.forEach(a => cats.push({ name: a.name, value: a.value }));
    }
    const roadmapDone = roadmap?.doneTasks ?? 0;
    if (roadmapDone > 0) cats.push({ name: 'Roadmap Tasks', value: roadmapDone });
    const interviews = interviewAnalytics?.totalSessions ?? 0;
    if (interviews > 0) cats.push({ name: 'Interviews', value: interviews });
    const skillCount = skillGapSummary?.totalHave ?? 0;
    if (skillCount > 0) cats.push({ name: 'Skills', value: skillCount });
    return cats;
  }, [applications, roadmap, interviewAnalytics, skillGapSummary]);

  const recentActivity = useMemo(() => {
    const events = [];
    if (Array.isArray(applications?.recentApplications)) {
      applications.recentApplications.forEach(a => {
        events.push({
          date: a.createdAt || a.date || '—',
          type: 'Application',
          detail: `${a.type || 'Job'} — ${a.title || a.company || 'Submitted'}`,
          metric: a.status || 'Submitted',
          metricColor: 'text-blue-600 dark:text-blue-400',
        });
      });
    }
    if (interviewTrendData.length) {
      interviewTrendData.slice().reverse().forEach(s => {
        events.push({
          date: s.date || '—',
          type: 'Interview',
          detail: `${s.category || 'Mock'} — Session ${s.session}`,
          metric: `${s.score}%`,
          metricColor: s.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : s.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500',
        });
      });
    }
    if (roadmapMilestones.length) {
      roadmapMilestones.forEach(m => {
        if (m.completed > 0) {
          events.push({
            date: roadmap.lastUpdated || '—',
            type: 'Roadmap',
            detail: `${m.fullTitle || m.name}`,
            metric: `${m.completed}/${m.total} done`,
            metricColor: 'text-emerald-600 dark:text-emerald-400',
          });
        }
      });
    }
    return events.slice(0, 8);
  }, [applications, interviewTrendData, roadmap, roadmapMilestones]);

  const totalRoadmapDone = roadmap?.doneTasks ?? 0;
  const totalRoadmapAll = roadmap?.totalTasks ?? 0;
  const roadmapTrend = roadmap?.overallPct ?? 0;

  const totalInterviews = interviewAnalytics?.totalSessions ?? 0;
  const avgInterview = interviewAnalytics?.avg ?? 0;

  const skillsHave = skillGapSummary?.totalHave ?? 0;
  const skillsPct = skillGapSummary?.skillMatchPct ?? 0;

  const profilePct = profileCompletion?.pct ?? 0;
  const interviewTrendRaw = interviewAnalytics?.trend ?? 0;

  const containerBase = { height: 260, minHeight: 240 };
  const containerTall = { height: 280, minHeight: 260 };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading analytics data">
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-7 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="space-y-3">
                <div className="h-7 w-48 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-80 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="h-10 w-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-10 w-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <SkeletonKpiCard key={i} />)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map(i => <SkeletonChartCard key={i} />)}
        </div>

        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="ns-card p-10 md:p-14 text-center max-w-2xl mx-auto"
        role="alert"
        aria-live="assertive"
      >
        <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-5 border border-red-100 dark:border-red-900/60">
          <AlertCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Couldn't load analytics
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 max-w-md mx-auto leading-relaxed">
          {error}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={fetchData}
            className="ns-btn bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all"
            aria-label="Retry loading analytics data"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6" id="analytics-root">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-7 border ns-hero print:shadow-none print:border-slate-300"
        role="banner"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shrink-0"
              aria-hidden="true"
            >
              <BarChart3 className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                Progress Analytics
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                Track your roadmap milestones, interview performance, skill mastery, and career match scores — all in real time.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
            <div
              className="flex items-center gap-1 p-1 rounded-2xl bg-slate-800/70 border border-slate-700/60 backdrop-blur shadow-inner"
              role="tablist"
              aria-label="Select date range"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 shrink-0" aria-hidden="true" />
              {DATE_RANGES.map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  role="tab"
                  aria-selected={dateRange === range}
                  aria-label={`Show analytics for ${range}`}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${
                    dateRange === range
                      ? ' bg-emerald-500 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                title="Refresh analytics data"
                aria-label="Refresh analytics data"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                title="Print or save this page as PDF"
                aria-label="Export analytics report as PDF"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Export
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key performance indicators">
        {[
          {
            label: 'Profile Completion',
            ringPct: profilePct,
            sub: `${profileCompletion?.done ?? 0}/${profileCompletion?.total ?? 0} fields complete`,
            delta: profilePct >= 70 ? +5 : profilePct >= 40 ? +2 : +1,
            deltaLabel: profilePct >= 70 ? 'Strong' : profilePct >= 40 ? 'On track' : 'Build up',
            deltaPositive: true,
            color: PALETTE.violet,
            icon: User,
            badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
            badgeIcon: 'text-blue-600 dark:text-blue-400',
            delay: 0.02,
          },
          {
            label: 'Skill Match %',
            ringPct: skillsPct,
            sub: `${skillsHave} skills matched`,
            delta: skillsPct >= 70 ? +8 : skillsPct >= 40 ? +4 : +2,
            deltaLabel: `${skillsPct >= 70 ? 'High' : skillsPct >= 40 ? 'Moderate' : 'Developing'}`,
            deltaPositive: true,
            color: PALETTE.amber,
            icon: Zap,
            badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
            badgeIcon: 'text-amber-600 dark:text-amber-400',
            delay: 0.07,
          },
          {
            label: 'Roadmap Progress',
            ringPct: roadmapTrend,
            sub: `${totalRoadmapDone}/${totalRoadmapAll || 0} tasks done`,
            delta: Math.round((totalRoadmapAll || 1) > 0 ? ((totalRoadmapDone / (totalRoadmapAll || 1)) * 100) / 10 : 0),
            deltaLabel: totalRoadmapAll > 0 ? `${roadmapTrend}% overall` : 'Start roadmap',
            deltaPositive: roadmapTrend >= 50,
            color: PALETTE.emerald,
            icon: Target,
            badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
            badgeIcon: 'text-emerald-600 dark:text-emerald-400',
            delay: 0.12,
          },
          {
            label: 'Interview Avg',
            ringPct: Math.round(avgInterview),
            sub: `${totalInterviews} sessions practiced`,
            delta: interviewTrendRaw,
            deltaLabel: interviewTrendRaw >= 0 ? `+${interviewTrendRaw} trend` : `${interviewTrendRaw} trend`,
            deltaPositive: interviewTrendRaw >= 0,
            color: PALETTE.indigo,
            icon: Award,
            badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
            badgeIcon: 'text-blue-600 dark:text-blue-400',
            delay: 0.17,
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: card.delay, ease: [0.22, 1, 0.36, 1] }}
            className="ns-card ns-card-hover p-5 group print:shadow-none print:border-slate-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.badgeBg} group-hover:scale-105 transition-transform`}
                aria-hidden="true"
              >
                <card.icon className={`w-5 h-5 ${card.badgeIcon}`} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <MiniRing pct={card.ringPct} color={card.color} size={42} stroke={3.5} />
                {card.delta !== undefined && (
                  <div className="flex items-center gap-0.5" aria-label={`${card.deltaLabel} delta`}>
                    {card.deltaPositive ? (
                      <ArrowUp className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-red-500" aria-hidden="true" />
                    )}
                    <span
                      className={`text-[11px] font-extrabold leading-none ${
                        card.deltaPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500'
                      }`}
                    >
                      {card.deltaLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {card.label}
              </span>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: card.delay + 0.15 }}
                className="text-[26px] leading-none font-extrabold text-slate-900 dark:text-white tracking-tight mt-1"
                aria-label={`${card.label}: ${card.ringPct} percent`}
              >
                {card.ringPct}
                <span className="text-base font-bold text-slate-400 dark:text-slate-500 ml-0.5">%</span>
              </motion.div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                {card.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2">
        <ChartCard
          title="Roadmap Progress Timeline"
          subtitle="Milestone completion % across your career journey with task counts"
          delay={0.22}
          ariaLabel="Roadmap progress timeline area chart"
        >
          {activityTimelineData.length === 0 ? (
            <NsEmpty
              icon={Target}
              title="Not enough data yet"
              body="Open the Career Roadmap and complete 3+ tasks to see your progress timeline."
              action={onNavigate && (
                <button
                  onClick={() => onNavigate('careerRoadmap')}
                  className="ns-btn bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 text-white text-xs font-bold cursor-pointer transition-all"
                  aria-label="Open Career Roadmap to complete tasks"
                >
                  Open Roadmap <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <div style={containerBase}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTimelineData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                  <GradientDefs />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridLine} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: axisText }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={52}
                    axisLine={{ stroke: gridLine }}
                    tickLine={{ stroke: gridLine }}
                    aria-label="Milestones"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: axisText }}
                    tickFormatter={v => `${v}%`}
                    width={42}
                    axisLine={{ stroke: gridLine }}
                    tickLine={{ stroke: gridLine }}
                    aria-label="Progress percentage"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, n, p) => [`${v}% (${p.payload.tasks} tasks)`, 'Progress']}
                    cursor={{ stroke: PALETTE.emerald, strokeWidth: 1, strokeDasharray: '4 4' }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="progress"
                    stroke={PALETTE.emerald}
                    strokeWidth={2.5}
                    fill="url(#gradEmerald)"
                    animationDuration={800}
                    animationBegin={200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Interview Score Trend"
          subtitle="Performance across your recent mock interview sessions"
          delay={0.27}
          ariaLabel="Interview score trend line chart"
        >
          {interviewTrendData.length < 2 ? (
            <NsEmpty
              icon={Award}
              title="Not enough data yet"
              body="Complete 2+ mock interviews to see your score trend over time."
              action={onNavigate && (
                <button
                  onClick={() => onNavigate('mockInterview')}
                  className="ns-btn bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 text-white text-xs font-bold cursor-pointer transition-all"
                  aria-label="Start a mock interview session"
                >
                  Start Interview <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <div style={containerBase}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={interviewTrendData} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                  <GradientDefs />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridLine} />
                  <XAxis
                    dataKey="session"
                    tick={{ fontSize: 10, fill: axisText }}
                    axisLine={{ stroke: gridLine }}
                    tickLine={{ stroke: gridLine }}
                    aria-label="Interview session number"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: axisText }}
                    tickFormatter={v => `${v}%`}
                    width={42}
                    axisLine={{ stroke: gridLine }}
                    tickLine={{ stroke: gridLine }}
                    aria-label="Score percentage"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, n) => [`${v}%`, 'Score']}
                    cursor={{ stroke: PALETTE.indigo, strokeWidth: 1, strokeDasharray: '4 4' }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={PALETTE.indigo}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: PALETTE.indigo, strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff' }}
                    activeDot={{ r: 6, fill: PALETTE.indigo, stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={900}
                    animationBegin={250}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Skill Match Breakdown"
          subtitle="Matching vs. missing skills for your target career path"
          delay={0.32}
          ariaLabel="Skill match breakdown horizontal bar chart"
        >
          {skillMatchData.length === 0 ? (
            <NsEmpty
              icon={Sparkles}
              title="Not enough data yet"
              body="Add skills to your profile to see your match vs. missing skill breakdown."
              action={onNavigate && (
                <button
                  onClick={() => onNavigate('settings')}
                  className="ns-btn bg-amber-600 hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 text-white text-xs font-bold cursor-pointer transition-all"
                  aria-label="Edit profile to add skills"
                >
                  Edit Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <>
              <div style={containerTall}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillMatchData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <GradientDefs />
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridLine} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={false}
                      axisLine={{ stroke: gridLine }}
                    />
                    <YAxis
                      type="category"
                      dataKey="skill"
                      tick={{ fontSize: 9.5, fill: axisText }}
                      width={108}
                      axisLine={{ stroke: gridLine }}
                      tickLine={false}
                      aria-label="Skills"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, n) => [v > 0 ? 'Matched' : 'Missing', n === 'match' ? 'Matched' : 'Missing']}
                      cursor={{ fill: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)' }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    />
                    <Bar dataKey="match" stackId="a" fill={PALETTE.emerald} radius={[0, 0, 0, 0]} animationDuration={700} animationBegin={300} />
                    <Bar dataKey="missing" stackId="a" fill={PALETTE.amber} radius={[0, 4, 4, 0]} animationDuration={700} animationBegin={300} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-3" aria-label="Skill legend">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block shadow-sm" style={{ background: PALETTE.emerald }} aria-hidden="true" />
                  You have
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block shadow-sm" style={{ background: PALETTE.amber }} aria-hidden="true" />
                  Missing
                </span>
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard
          title="Top 5 Career Match Scores"
          subtitle="How strongly your profile aligns with each career path by demand"
          delay={0.37}
          ariaLabel="Top career match scores bar chart"
        >
          {careerMatchData.length === 0 ? (
            <NsEmpty
              icon={Briefcase}
              title="No career matches yet"
              body="Complete the RIASEC quiz and fill in your skills to generate match scores."
              action={onNavigate && (
                <button
                  onClick={() => onNavigate('quiz')}
                  className="ns-btn bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 text-white text-xs font-bold cursor-pointer transition-all"
                  aria-label="Take RIASEC quiz to generate career matches"
                >
                  Take RIASEC Quiz <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <div style={containerBase}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={careerMatchData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <GradientDefs />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridLine} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9.5, fill: axisText }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={54}
                    axisLine={{ stroke: gridLine }}
                    tickLine={{ stroke: gridLine }}
                    aria-label="Career paths"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: axisText }}
                    tickFormatter={v => `${v}%`}
                    width={42}
                    axisLine={{ stroke: gridLine }}
                    tickLine={{ stroke: gridLine }}
                    aria-label="Match percentage"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, n, p) => [`${v}% match`, `${p.payload.name}${p.payload.demand ? ` · ${p.payload.demand} demand` : ''}`]}
                    cursor={{ fill: isDark ? 'rgba(8,145,178,0.08)' : 'rgba(8,145,178,0.05)' }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="url(#gradTeal)" animationDuration={800} animationBegin={350} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Activity Category Distribution"
          subtitle="Breakdown of tasks, interviews, applications & skills completed"
          delay={0.42}
          ariaLabel="Activity category distribution pie chart"
        >
          {categoryData.length === 0 ? (
            <NsEmpty
              icon={Activity}
              title="No activity recorded yet"
              body="Start using roadmap, interviews, or job applications to see your activity breakdown."
            />
          ) : (
            <div style={containerBase}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
                  <GradientDefs />
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="46%"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={900}
                    animationBegin={400}
                  >
                    {categoryData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke={isDark ? '#1e293b' : '#fff'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, n) => [v, n]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10.5px', paddingTop: '8px' }}
                    formatter={(value) => <span style={{ color: axisText, fontWeight: 600 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Academic Performance"
          subtitle="Matric, FSc / Inter, and entry test scores as percentages"
          delay={0.47}
          ariaLabel="Academic performance bar chart"
        >
          {academicMarks.length === 0 ? (
            <NsEmpty
              icon={BookOpen}
              title="No marks recorded yet"
              body="Enter your Matric, FSc, and entry test scores in your profile to see your academic performance."
              action={onNavigate && (
                <button
                  onClick={() => onNavigate('settings')}
                  className="ns-btn bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 text-white text-xs font-bold cursor-pointer transition-all"
                  aria-label="Add academic marks to profile"
                >
                  Add Marks <ChevronRight className="w-3.5 h-3.5 ml-0.5" aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <>
              <div style={containerBase}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={academicMarks} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <GradientDefs />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridLine} />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: axisText, fontWeight: 600 }}
                      axisLine={{ stroke: gridLine }}
                      tickLine={{ stroke: gridLine }}
                      aria-label="Academic subjects"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: axisText }}
                      tickFormatter={v => `${v}%`}
                      width={42}
                      axisLine={{ stroke: gridLine }}
                      tickLine={{ stroke: gridLine }}
                      aria-label="Score percentage"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={v => [`${v}%`, 'Score']}
                      cursor={{ fill: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' }}
                      labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} animationDuration={800} animationBegin={450}>
                      {academicMarks.map((item, i) => (
                        <Cell key={i} fill={item.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-2" aria-label="Academic legend">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" aria-hidden="true" />
                  Matric
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm" aria-hidden="true" />
                  FSc
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm" aria-hidden="true" />
                  Entry Test
                </span>
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
        className="ns-card ns-card-hover p-6 print:shadow-none print:border-slate-300"
        role="region"
        aria-label="Recent activity log"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              Recent Activity
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Latest events across roadmaps, interviews, and job applications
            </p>
          </div>
          <span
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wider self-start sm:self-center"
            aria-label={`${recentActivity.length} recent events`}
          >
            {recentActivity.length} events
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <NsEmpty
            icon={FileText}
            title="No recent activity"
            body="Your recent events (interviews, applications, task completions) will appear here."
          />
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6 px-6 pb-6">
            <table className="ns-table min-w-[540px]" role="table" aria-label="Recent activity events table">
              <thead>
                <tr>
                  <th className="w-[22%]" scope="col">Date</th>
                  <th className="w-[18%]" scope="col">Type</th>
                  <th scope="col">Detail</th>
                  <th className="w-[18%] text-right" scope="col">Metric</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((ev, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.56 + i * 0.03 }}
                    className="group"
                  >
                    <td className="font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {ev.date === '—' ? ev.date : (typeof ev.date === 'string' ? ev.date.slice(0, 10) : '—')}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide border ${
                          ev.type === 'Interview'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/60'
                            : ev.type === 'Application'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/60'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60'
                        }`}
                        aria-label={`Activity type: ${ev.type}`}
                      >
                        {ev.type === 'Interview' && <Award className="w-3 h-3 -ml-0.5" aria-hidden="true" />}
                        {ev.type === 'Application' && <Briefcase className="w-3 h-3 -ml-0.5" aria-hidden="true" />}
                        {ev.type === 'Roadmap' && <Target className="w-3 h-3 -ml-0.5" aria-hidden="true" />}
                        {ev.type}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-700 dark:text-slate-200 text-[12px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {ev.detail}
                    </td>
                    <td
                      className={`text-right font-extrabold text-[12px] tabular-nums ${ev.metricColor || 'text-slate-700 dark:text-slate-200'}`}
                      aria-label={`Metric: ${ev.metric}`}
                    >
                      {ev.metric}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

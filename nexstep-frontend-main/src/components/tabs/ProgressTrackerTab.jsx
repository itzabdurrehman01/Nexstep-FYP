import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, CheckCircle2, BookOpen, Briefcase, GraduationCap,
  Target, Award, Mic, BarChart3, RefreshCw, Loader2, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { JourneyPanel } from '../dashboard/JourneyPanel.jsx';

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800',
    blue:    'bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200 dark:border-blue-800',
    purple:  'bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200 dark:border-blue-800',
    amber:   'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-800',
    rose:    'bg-rose-50 dark:bg-rose-950/30 text-rose-600 border-rose-200 dark:border-rose-800',
  };
  return (
    <motion.div whileHover={{ y: -2 }} className={`p-5 rounded-2xl border ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-3" />
      <div className="text-2xl font-black text-slate-800 dark:text-white">{value ?? '—'}</div>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function ReadinessArc({ score }) {
  const r = 60, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, score) / 100) * circ;
  const col = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="160" height="160" className="rotate-[-90deg]">
      <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" stroke="#e2e8f0" />
      <motion.circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" stroke={col}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: 'easeOut' }} />
    </svg>
  );
}

export function ProgressTrackerTab({ profile, lang = 'en', onNavigate }) {
  const { apiFetch } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await apiFetch('/api/progress');
      if (res.ok) { const d = await res.json(); setData(d); }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  const c = data?.current || {};
  const history = (data?.history || []).map(h => ({
    date:     new Date(h.snapshot_date).toLocaleDateString('en-PK', { month:'short', day:'numeric' }),
    skills:   h.skills_count,
    readiness: Math.round(Number(h.readiness_score) || 0),
    roadmap:  Math.round(Number(h.roadmap_pct) || 0),
  }));

  const readiness = Math.min(100, c.readinessScore || 0);
  const readinessLabel = readiness >= 80 ? 'Excellent — You are ready!' : readiness >= 60 ? 'Good progress' : readiness >= 40 ? 'Keep building' : 'Just starting';

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Your Progress</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">A unified view of your career readiness journey</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <JourneyPanel profile={profile} onNavigate={onNavigate} />

      {/* Readiness Ring */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative shrink-0">
            <ReadinessArc score={readiness} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black text-slate-800 dark:text-white">{readiness}%</div>
              <div className="text-xs text-slate-500">Career Readiness</div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{readinessLabel}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Complete the milestones below to improve your score.</p>
            <div className="space-y-2 pt-1">
              {[
                { done: c.riasecCompleted, label: 'RIASEC Assessment completed' },
                { done: (c.skillsCount || 0) >= 3, label: `Skills added (${c.skillsCount || 0}/3 minimum)` },
                { done: (c.roadmapPct || 0) >= 25, label: `Career roadmap started (${Math.round(c.roadmapPct || 0)}%)` },
                { done: (c.interviewSessions || 0) >= 1, label: `Mock interview practised (${c.interviewSessions || 0} sessions)` },
                { done: (c.mockTestSessions || 0) >= 1, label: `Entry test practice done (${c.mockTestSessions || 0} sessions)` },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {item.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
                  <span className={item.done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Target}   label="Skills"       value={c.skillsCount}       sub="added to profile"      color="emerald" />
        <StatCard icon={TrendingUp} label="Roadmap"    value={`${Math.round(c.roadmapPct || 0)}%`} sub="milestones done" color="blue" />
        <StatCard icon={Briefcase} label="Applications" value={c.applicationsCount} sub="submitted"             color="purple" />
        <StatCard icon={Mic}       label="Interviews"  value={c.interviewSessions} sub={c.avgInterviewScore ? `avg ${c.avgInterviewScore}%` : 'none yet'} color="amber" />
        <StatCard icon={BookOpen}  label="Mock Tests"  value={c.mockTestSessions}  sub={c.avgMockTestScore ? `avg ${c.avgMockTestScore}%` : 'none yet'}  color="rose" />
      </div>

      {/* Historical chart */}
      {history.length >= 2 && (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Readiness Over Time
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="readiness" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Readiness %" />
              <Line type="monotone" dataKey="roadmap"   stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" name="Roadmap %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {history.length < 2 && (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-slate-500 text-sm">Progress chart will appear after you use the platform for a few days.</p>
          <p className="text-xs text-slate-400">Start by completing your RIASEC quiz and adding skills to your profile.</p>
        </div>
      )}
    </div>
  );
}

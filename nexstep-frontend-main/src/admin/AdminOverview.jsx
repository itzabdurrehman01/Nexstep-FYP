import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, UserCog, UserPlus, Mic, MessagesSquare, ArrowRight } from 'lucide-react';
import { adminFetch, formatDate } from './adminApi.js';
import { Card, Empty, Loading, Notice, PageHeader, Badge } from './AdminUi.jsx';

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <Icon className="w-4 h-4 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminFetch('/admin/stats'), adminFetch('/admin/activity').catch(() => null)])
      .then(([s, a]) => { setStats(s?.data ?? null); setActivity(a?.data ?? a ?? null); })
      .catch((err) => setError(err.message));
  }, []);

  const n = (v) => Number(v || 0).toLocaleString();
  const signups = stats?.monthlySignups ?? [];
  const maxSignups = Math.max(1, ...signups.map((m) => m.signups || 0));
  const recentUsers = activity?.recentUsers ?? [];

  return (
    <div>
      <PageHeader title="Overview" description="Live numbers from the NexStep database." />
      <Notice>{error}</Notice>
      {!stats && !error ? <Loading /> : stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Stat icon={Users} label="All users" value={n(stats.total_users)} sub={`${n(stats.active_users)} active`} />
            <Stat icon={GraduationCap} label="Students" value={n(stats.total_students)} />
            <Stat icon={UserCog} label="Mentors" value={n(stats.total_mentors)} />
            <Stat icon={UserPlus} label="New this week" value={n(stats.new_users_7d)} />
            <Stat icon={Mic} label="Mock interviews" value={n(stats.total_interviews)} />
            <Stat icon={MessagesSquare} label="AI conversations" value={n(stats.total_conversations)} />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <Card title="Sign-ups" description="Last 6 months" className="lg:col-span-3">
              {signups.length === 0 ? <Empty icon={UserPlus} title="No sign-ups yet" /> : (
                <div className="h-48 flex items-end gap-3">
                  {signups.map((m) => (
                    <div key={m.month} className="flex-1 h-full flex flex-col items-center justify-end gap-2 min-w-0">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{m.signups}</span>
                      <div className="w-full max-w-12 rounded-lg bg-emerald-500/80" style={{ height: `${Math.max(4, Math.round((m.signups / maxSignups) * 100))}%` }} />
                      <span className="text-[11px] text-slate-500 truncate max-w-full">{m.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Recent sign-ups" className="lg:col-span-2"
              actions={<button type="button" onClick={() => onNavigate('/admin/users')} className="text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline">All users <ArrowRight className="w-3 h-3" /></button>}>
              {recentUsers.length === 0 ? <Empty icon={Users} title="No users yet" /> : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
                  {recentUsers.slice(0, 6).map((u, i) => (
                    <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.name || u.email}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge tone={u.role === 'MENTOR' ? 'blue' : 'green'}>{u.role === 'MENTOR' ? 'Mentor' : 'Student'}</Badge>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(u.joinedAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOverview;

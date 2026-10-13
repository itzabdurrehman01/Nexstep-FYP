import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, CalendarClock, CheckCircle2, Users, Loader2, RefreshCw, Video, X, Check, Clock, AlertCircle, GraduationCap, History, ClipboardCheck } from 'lucide-react';
import { MentorReviews } from '../mockInterview/MentorReviews.jsx';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const STATUS = {
  requested: { label: 'Waiting for you', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  upcoming: { label: 'Scheduled', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  no_show: { label: 'No show', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
};

async function api(path, body) {
  const res = await fetch(`/api/mentorship${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white';

function SessionCard({ s, children }) {
  const st = STATUS[s.status] || STATUS.completed;
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.topic}</p>
          <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1" data-no-translate>
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />{s.student.name}{s.student.level ? ` · ${s.student.level}` : ''}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${st.cls}`}>{st.label}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
        {s.status === 'requested' ? 'Preferred: ' : ''}{fmt(s.scheduledAt)} · {s.durationMinutes} min
      </p>
      {s.message && <p className="text-sm text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">“{s.message}”</p>}
      {s.mentorResponse && s.status !== 'requested' && <p className="text-xs text-slate-500">Your note: {s.mentorResponse}</p>}
      {s.notes && s.status === 'completed' && <p className="text-xs text-slate-500">Session notes: {s.notes}</p>}
      {children}
    </article>
  );
}

function RequestActions({ s, onDone, onError }) {
  const [mode, setMode] = useState(null); // accept | decline
  const [when, setWhen] = useState(toLocalInput(s.scheduledAt));
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (path, body) => {
    setBusy(true);
    try { await api(path, body); onDone(); } catch (err) { onError(err.message); } finally { setBusy(false); }
  };
  if (!mode) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('accept')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium cursor-pointer"><Check className="w-4 h-4" /> Accept</button>
        <button type="button" onClick={() => setMode('decline')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4" /> Decline</button>
      </div>
    );
  }
  if (mode === 'accept') {
    return (
      <form className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-700 p-3"
        onSubmit={(e) => { e.preventDefault(); run(`/mentor/sessions/${s.id}/accept`, { scheduledAt: when ? new Date(when).toISOString() : undefined, meetingLink: link, note }); }}>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Session time</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} required /></label>
          <label className="space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Meeting link (optional)</span>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" className={inputCls} /></label>
        </div>
        <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Message to the student (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={inputCls} /></label>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm session</button>
          <button type="button" onClick={() => setMode(null)} className="h-9 px-3 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Back</button>
        </div>
      </form>
    );
  }
  return (
    <form className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-700 p-3"
      onSubmit={(e) => { e.preventDefault(); run(`/mentor/sessions/${s.id}/decline`, { note }); }}>
      <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Reason (optional, shown to the student)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="e.g. Not available then — please pick another day" className={inputCls} /></label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Decline request</button>
        <button type="button" onClick={() => setMode(null)} className="h-9 px-3 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Back</button>
      </div>
    </form>
  );
}

function UpcomingActions({ s, onDone, onError }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (path, body) => {
    setBusy(true);
    try { await api(path, body); onDone(); } catch (err) { onError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {s.meetingLink && (
          <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"><Video className="w-4 h-4" /> Join meeting</a>
        )}
        <button type="button" onClick={() => setMode(mode === 'complete' ? null : 'complete')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><CheckCircle2 className="w-4 h-4" /> Mark completed</button>
        <button type="button" onClick={() => setMode(mode === 'cancel' ? null : 'cancel')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><X className="w-4 h-4" /> Cancel</button>
      </div>
      {mode && (
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); run(`/mentor/sessions/${s.id}/${mode}`, mode === 'complete' ? { notes: text } : { note: text }); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className={inputCls}
            placeholder={mode === 'complete' ? 'Session notes (optional, visible to the student)' : 'Reason (optional)'} />
          <button type="submit" disabled={busy} className={`shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-white text-sm font-medium disabled:opacity-60 cursor-pointer ${mode === 'complete' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}{mode === 'complete' ? 'Save' : 'Cancel session'}
          </button>
        </form>
      )}
    </div>
  );
}

/** Mentor workspace: session requests, schedule, assigned students and history. */
export function MentorPortalTab() {
  const [sessions, setSessions] = useState(null);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState('requests');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, st] = await Promise.all([api('/mentor/sessions'), api('/mentor/students')]);
      setSessions(s.data); setStudents(st.data); setError('');
      fetch('/api/mock-interviews/review-queue', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((d) => setReviewCount((d.data || []).filter((x) => x.status === 'submitted').length))
        .catch(() => {});
    } catch (err) { setError(err.message); setSessions((x) => x || []); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const groups = useMemo(() => {
    const list = sessions || [];
    return {
      requests: list.filter((s) => s.status === 'requested').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
      upcoming: list.filter((s) => s.status === 'upcoming').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
      history: list.filter((s) => !['requested', 'upcoming'].includes(s.status)),
    };
  }, [sessions]);

  const stats = [
    { id: 'requests', label: 'New requests', value: groups.requests.length, icon: Inbox },
    { id: 'upcoming', label: 'Scheduled', value: groups.upcoming.length, icon: CalendarClock },
    { id: 'history', label: 'Completed', value: (sessions || []).filter((s) => s.status === 'completed').length, icon: CheckCircle2 },
    { id: 'students', label: 'My students', value: students.length, icon: Users },
  ];
  const tabs = [
    { id: 'requests', label: 'Requests', icon: Inbox, count: groups.requests.length },
    { id: 'upcoming', label: 'Scheduled', icon: CalendarClock, count: groups.upcoming.length },
    { id: 'reviews', label: 'Interview reviews', icon: ClipboardCheck, count: reviewCount },
    { id: 'students', label: 'Students', icon: Users, count: students.length },
    { id: 'history', label: 'History', icon: History },
  ];

  const empty = (Icon, title, text) => (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
      <Icon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );

  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mentor workspace</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Answer session requests and score mock interviews from the students assigned to you.</p>
        </div>
        <button type="button" onClick={load} disabled={refreshing} className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} type="button" onClick={() => setTab(s.id)} className="text-start rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-300 cursor-pointer">
              <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{s.label}</span><Icon className="w-4 h-4 text-slate-400" aria-hidden="true" /></div>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{sessions ? s.value : '–'}</p>
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}

      <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 w-full sm:w-fit overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm whitespace-nowrap cursor-pointer ${tab === t.id ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />{t.label}
              {t.count ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center">{t.count}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === 'reviews' ? (
        <MentorReviews onCountChange={setReviewCount} />
      ) : !sessions ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : tab === 'requests' ? (
        groups.requests.length === 0 ? empty(Inbox, 'No new requests', 'When an assigned student asks for a session it appears here.') : (
          <div className="grid md:grid-cols-2 gap-4">
            {groups.requests.map((s) => <SessionCard key={s.id} s={s}><RequestActions s={s} onDone={load} onError={setError} /></SessionCard>)}
          </div>
        )
      ) : tab === 'upcoming' ? (
        groups.upcoming.length === 0 ? empty(CalendarClock, 'No scheduled sessions', 'Accepted requests appear here.') : (
          <div className="grid md:grid-cols-2 gap-4">
            {groups.upcoming.map((s) => <SessionCard key={s.id} s={s}><UpcomingActions s={s} onDone={load} onError={setError} /></SessionCard>)}
          </div>
        )
      ) : tab === 'students' ? (
        students.length === 0 ? empty(Users, 'No students assigned yet', 'An admin assigns students to you from the admin portal.') : (
          <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((st) => (
              <li key={st.id} className="p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                  {st.avatarUrl ? <img src={st.avatarUrl} alt="" className="w-full h-full object-cover" /> : st.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1" data-no-translate>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{st.name}</p>
                  <p className="text-xs text-slate-500 truncate">{[st.level, st.stream, st.city].filter(Boolean).join(' · ') || st.email}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{st.completedSessions} completed</span>
              </li>
            ))}
          </ul>
        )
      ) : (
        groups.history.length === 0 ? empty(History, 'No past sessions yet', 'Completed, declined and cancelled sessions appear here.') : (
          <div className="grid md:grid-cols-2 gap-4">{groups.history.map((s) => <SessionCard key={s.id} s={s} />)}</div>
        )
      )}
    </div>
  );
}

export default MentorPortalTab;

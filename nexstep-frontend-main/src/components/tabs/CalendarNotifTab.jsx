import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, BellRing, CalendarDays, Plus, Trash2, Check, Clock, Repeat, Loader2, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, GraduationCap, FileText, School, Award, Users, BookOpen, Sparkles, X,
} from 'lucide-react';
import { useAuth, getUserRole } from '../../context/AuthContext.jsx';

/** Alert types the user can choose, with a matching title placeholder. */
const TYPES = [
  { id: 'exam', label: 'Exam / test', icon: FileText, placeholder: 'e.g. MDCAT exam, Class 10 Physics paper' },
  { id: 'deadline', label: 'Deadline', icon: Clock, placeholder: 'e.g. Submit admission form' },
  { id: 'admission', label: 'Admission', icon: School, placeholder: 'e.g. NUST admissions open' },
  { id: 'scholarship', label: 'Scholarship', icon: Award, placeholder: 'e.g. Need-based scholarship last date' },
  { id: 'session', label: 'Mentor session', icon: Users, placeholder: 'e.g. Session with my mentor' },
  { id: 'study', label: 'Study reminder', icon: BookOpen, placeholder: 'e.g. Revise Chemistry chapter 4' },
  { id: 'custom', label: 'Other', icon: Sparkles, placeholder: 'e.g. Collect domicile certificate' },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));
const REMIND = [
  [0, 'At the time'], [15, '15 minutes before'], [30, '30 minutes before'], [60, '1 hour before'], [180, '3 hours before'],
  [1440, '1 day before'], [2880, '2 days before'], [10080, '1 week before'],
];
const REPEAT = [['none', 'Only once'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month']];
const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white';
const pad = (n) => String(n).padStart(2, '0');
const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function AlertForm({ initial, onSaved, onCancel }) {
  const defaultWhen = useMemo(() => { const d = new Date(Date.now() + 24 * 3600 * 1000); d.setMinutes(0, 0, 0); return localInput(d); }, []);
  const [type, setType] = useState(initial?.type || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [when, setWhen] = useState(initial ? localInput(new Date(initial.alertAt)) : defaultWhen);
  const [remind, setRemind] = useState(initial?.remindBeforeMinutes ?? 60);
  const [repeat, setRepeat] = useState(initial?.repeat || 'none');
  const [note, setNote] = useState(initial?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!type) { setError('Choose what kind of alert you need.'); return; }
    setBusy(true); setError('');
    try {
      const body = { type, title, alertAt: new Date(when).toISOString(), remindBeforeMinutes: Number(remind), repeat, note };
      const res = initial
        ? await api(`/api/alerts/${initial.id}`, { method: 'PUT', body: { ...body, status: 'active' } })
        : await api('/api/alerts', { method: 'POST', body });
      onSaved(res.data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">What kind of alert do you need?</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.id;
            return (
              <button key={t.id} type="button" onClick={() => { setType(t.id); setError(''); }} aria-pressed={active}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm text-start cursor-pointer ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />{t.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {type && (
        <>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder={TYPE_BY_ID[type].placeholder} className={inputCls} /></label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="space-y-1.5"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Date & time</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className={inputCls} /></label>
            <label className="space-y-1.5"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Remind me</span>
              <select value={remind} onChange={(e) => setRemind(e.target.value)} className={inputCls}>
                {REMIND.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label className="space-y-1.5"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Repeat</span>
              <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputCls}>
                {REPEAT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
          </div>
          <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="e.g. Bring CNIC copy and 2 photos" className={inputCls} /></label>
        </>
      )}

      {error && <p role="alert" className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !type} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}{initial ? 'Save changes' : 'Create alert'}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
      </div>
    </form>
  );
}

function MonthCalendar({ items }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(new Date());
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  const onDay = (d) => items.filter((it) => sameDay(new Date(it.at), d));
  const today = new Date();
  const dayItems = onDay(selected);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <button type="button" aria-label="Previous month" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          <button type="button" aria-label="Next month" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500 mb-1">
          {Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' })).map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const its = onDay(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSel = sameDay(d, selected);
            return (
              <button key={d.toISOString()} type="button" onClick={() => setSelected(d)}
                className={`aspect-square sm:aspect-auto sm:h-14 rounded-lg flex flex-col items-center justify-center gap-1 text-sm cursor-pointer ${isSel ? 'bg-emerald-600 text-white' : sameDay(d, today) ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : inMonth ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-600'}`}>
                <span>{d.getDate()}</span>
                {its.length > 0 && <span className={`flex gap-0.5`}>{its.slice(0, 3).map((it, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : it.kind === 'session' ? 'bg-blue-500' : 'bg-amber-500'}`} />)}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Your alerts</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Mentor sessions</span>
        </div>
      </div>
      <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{selected.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {dayItems.length === 0 ? <p className="text-sm text-slate-500">Nothing on this day.</p> : (
          <ul className="space-y-2">
            {dayItems.map((it) => (
              <li key={it.key} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${it.kind === 'session' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{it.title}</p>
                  <p className="text-xs text-slate-500">{new Date(it.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}{it.sub ? ` · ${it.sub}` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Calendar & alerts: user-defined live alerts, a month calendar and the notification inbox. */
export function CalendarNotifTab() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const [tab, setTab] = useState('alerts');
  const [alerts, setAlerts] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [inbox, setInbox] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | alert
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  const load = useCallback(async () => {
    try {
      const [a, n] = await Promise.all([api('/api/alerts'), api('/api/notifications')]);
      setAlerts(a.data); setInbox(n.data || []);
      const s = await api(role === 'MENTOR' ? '/api/mentorship/mentor/sessions' : '/api/mentorship/my-sessions').catch(() => ({ data: [] }));
      setSessions((s.data || []).filter((x) => x.status === 'upcoming'));
    } catch (err) { setError(err.message); setAlerts((x) => x || []); setInbox((x) => x || []); }
  }, [role]);
  useEffect(() => { load(); }, [load]);

  const askPermission = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') {
      // also switch on Settings → Preferences → Browser notifications
      try {
        const cur = await fetch('/api/profile', { credentials: 'include' }).then((r) => r.json()).then((j) => j.data?.preferences || {});
        await fetch('/api/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: { ...cur, pushNotif: true } }) });
      } catch { /* ignore */ }
    }
  };

  const remove = async (a) => {
    try { await api(`/api/alerts/${a.id}`, { method: 'DELETE' }); setNotice('Alert deleted.'); load(); } catch (err) { setError(err.message); }
  };
  const markDone = async (a) => {
    try {
      await api(`/api/alerts/${a.id}`, { method: 'PUT', body: { type: a.type, title: a.title, note: a.note, alertAt: a.alertAt, remindBeforeMinutes: a.remindBeforeMinutes, repeat: a.repeat, status: 'done' } });
      load();
    } catch (err) { setError(err.message); }
  };
  const markAllRead = async () => {
    try { await api('/api/notifications/read-all', { method: 'POST' }); load(); } catch (err) { setError(err.message); }
  };

  const upcoming = (alerts || []).filter((a) => a.status === 'active' && (a.repeat !== 'none' || new Date(a.alertAt) >= new Date(Date.now() - 3600 * 1000)));
  const past = (alerts || []).filter((a) => !upcoming.includes(a));
  const calendarItems = useMemo(() => [
    ...(alerts || []).filter((a) => a.status === 'active').map((a) => ({ key: `a-${a.id}`, kind: 'alert', title: a.title, at: a.alertAt, sub: TYPE_BY_ID[a.type]?.label })),
    ...sessions.map((s) => ({ key: `s-${s.id}`, kind: 'session', title: s.topic, at: s.scheduledAt, sub: role === 'MENTOR' ? s.student?.name : s.mentor?.name })),
  ], [alerts, sessions, role]);
  const unread = (inbox || []).filter((n) => !n.is_read).length;

  const tabs = [
    { id: 'alerts', label: 'My alerts', icon: BellRing, count: upcoming.length },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'inbox', label: 'Notifications', icon: Bell, count: unread },
  ];

  const AlertRow = ({ a }) => {
    const T = TYPE_BY_ID[a.type] || TYPE_BY_ID.custom;
    const Icon = T.icon;
    const remind = REMIND.find(([v]) => v === a.remindBeforeMinutes)?.[1];
    return (
      <li className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title} <span className="text-xs font-normal text-slate-500">· {T.label}</span></p>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{fmt(a.alertAt)}</span>
            {remind && <span className="inline-flex items-center gap-1"><Bell className="w-3.5 h-3.5" aria-hidden="true" />{remind}</span>}
            {a.repeat !== 'none' && <span className="inline-flex items-center gap-1"><Repeat className="w-3.5 h-3.5" aria-hidden="true" />{REPEAT.find(([v]) => v === a.repeat)?.[1]}</span>}
          </p>
          {a.note && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{a.note}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {a.status === 'active' && <button type="button" onClick={() => setEditing(a)} className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Edit</button>}
          {a.status === 'active' && <button type="button" onClick={() => markDone(a)} aria-label="Mark done" title="Mark done" className="h-8 w-8 rounded-lg text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center justify-center cursor-pointer"><Check className="w-4 h-4" /></button>}
          <button type="button" onClick={() => remove(a)} aria-label="Delete alert" title="Delete" className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center cursor-pointer"><Trash2 className="w-4 h-4" /></button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Calendar & alerts</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create reminders for exams, deadlines, admissions or study time. When they are due, NexStep pops up an alert here and emails your Gmail.</p>
        </div>
        {!editing && <button type="button" onClick={() => { setEditing('new'); setTab('alerts'); setNotice(''); }} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium cursor-pointer"><Plus className="w-4 h-4" /> New alert</button>}
      </header>

      {permission === 'default' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-500/10 p-4">
          <BellRing className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
          <p className="text-sm text-emerald-900 dark:text-emerald-200 flex-1">Allow browser notifications to get alerts even when NexStep is in another tab.</p>
          <button type="button" onClick={askPermission} className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium cursor-pointer">Allow notifications</button>
        </div>
      )}
      {permission === 'denied' && <p className="text-xs text-slate-500">Browser notifications are blocked for this site — alerts will still appear inside NexStep while it is open.</p>}

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{notice}</p>}

      {editing && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{editing === 'new' ? 'New alert' : 'Edit alert'}</h2>
            <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
          </div>
          <AlertForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); setNotice(editing === 'new' ? 'Alert created. You will get an in-app reminder and an email to your Gmail.' : 'Alert updated.'); load(); }} />
        </section>
      )}

      <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 w-full sm:w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-sm cursor-pointer ${tab === t.id ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />{t.label}
              {t.count ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center">{t.count}</span> : null}
            </button>
          );
        })}
      </div>

      {alerts === null ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : tab === 'alerts' ? (
        <div className="space-y-6">
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
              <BellRing className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No alerts yet</p>
              <p className="mt-1 text-xs text-slate-500">Tap “New alert” and choose what you want to be reminded about.</p>
            </div>
          ) : (
            <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming.map((a) => <AlertRow key={a.id} a={a} />)}
            </ul>
          )}
          {past.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Past & done</h2>
              <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 opacity-80">
                {past.map((a) => <AlertRow key={a.id} a={a} />)}
              </ul>
            </section>
          )}
        </div>
      ) : tab === 'calendar' ? (
        <MonthCalendar items={calendarItems} />
      ) : (
        <section className="space-y-3">
          <div className="flex justify-end">{unread > 0 && <button type="button" onClick={markAllRead} className="h-8 px-3 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer">Mark all as read</button>}</div>
          {inbox.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
              <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm text-slate-500">No notifications yet.</p>
            </div>
          ) : (
            <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {inbox.map((n) => (
                <li key={n.id} className={`p-4 flex gap-3 ${!n.is_read ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-emerald-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
                    <p className="text-xs text-slate-400 mt-1">{fmt(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default CalendarNotifTab;

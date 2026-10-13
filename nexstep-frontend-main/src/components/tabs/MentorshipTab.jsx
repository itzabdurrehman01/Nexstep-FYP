import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserRound, CalendarPlus, Clock, Loader2, Video, AlertCircle, CheckCircle2, X, Briefcase, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const STATUS = {
  requested: { label: 'Waiting for mentor', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  upcoming: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  declined: { label: 'Declined', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  no_show: { label: 'Missed', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
};
const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white';

async function api(path, body) {
  const res = await fetch(`/api/mentorship${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function minDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const REQUEST_KINDS = [
  { id: 'session', label: 'Career session', hint: 'Subject choice, university, or career plan' },
  { id: 'interview', label: 'Interview prep', hint: 'Admission or job interview practice' },
  { id: 'mock_interview', label: 'Mock interview', hint: 'A full practice interview with feedback' },
];

function RequestForm({ mentor, onSent, onCancel }) {
  const [kind, setKind] = useState('session');
  const [topic, setTopic] = useState('');
  const [when, setWhen] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/requests', { mentorId: mentor.id, kind, topic, preferredAt: new Date(when).toISOString(), durationMinutes: minutes, message });
      onSent();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <fieldset>
        <legend className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">What do you want to request?</legend>
        <div className="grid sm:grid-cols-3 gap-2">
          {REQUEST_KINDS.map((k) => (
            <button key={k.id} type="button" onClick={() => setKind(k.id)} aria-pressed={kind === k.id}
              className={`text-start px-3 py-2 rounded-xl border text-xs cursor-pointer ${kind === k.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
              <span className="block font-semibold">{k.label}</span>
              <span className="block text-slate-500 mt-0.5">{k.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">What do you want to discuss?</span>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} required placeholder="e.g. Choosing between Pre-Medical and ICS" className={inputCls} /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Preferred date & time</span>
          <input type="datetime-local" min={minDateTime()} value={when} onChange={(e) => setWhen(e.target.value)} required className={inputCls} /></label>
        <label className="space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Length</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={inputCls}>
            {[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select></label>
      </div>
      <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Message (optional)</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} className={`${inputCls} h-auto py-2`} /></label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Send request</button>
        <button type="button" onClick={onCancel} className="h-9 px-3 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
      </div>
    </form>
  );
}

/** Student view: assigned mentors, session requests and the student's sessions. */
export function MentorshipTab() {
  const { user, authStatus, openSignIn } = useAuth();
  const [mentors, setMentors] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [requesting, setRequesting] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api('/my-mentors'), api('/my-sessions')]);
      setMentors(m.data); setSessions(s.data); setError('');
    } catch (err) { setError(err.message); setMentors((x) => x || []); }
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useAutoRefresh(load, { enabled: Boolean(user) });

  const cancel = async (s) => {
    try { await api(`/requests/${s.id}/cancel`, {}); setNotice('Request cancelled.'); load(); } catch (err) { setError(err.message); }
  };

  const active = useMemo(() => sessions.filter((s) => ['requested', 'upcoming'].includes(s.status)).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)), [sessions]);
  const past = useMemo(() => sessions.filter((s) => !['requested', 'upcoming'].includes(s.status)), [sessions]);

  if (authStatus !== 'authenticated') {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-3">
        <UserRound className="w-10 h-10 mx-auto text-slate-300" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mentorship</h1>
        <p className="text-sm text-slate-500">Sign in to see your mentor and request a session.</p>
        <button type="button" onClick={() => openSignIn?.()} className="h-10 px-5 rounded-xl bg-emerald-600 text-white text-sm font-medium cursor-pointer">Sign in</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mentorship</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Request a career session, interview prep, or a mock interview with a mentor.</p>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{notice}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your mentor</h2>
        {!mentors ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : mentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 px-4 text-center">
            <UserRound className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No mentors available yet</p>
            <p className="mt-1 text-xs text-slate-500">Ask your admin to add mentors, then you can request a session or interview here.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {mentors.map((m) => (
              <article key={m.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base font-semibold overflow-hidden shrink-0">
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-white" data-no-translate>{m.name}</p>
                    {m.headline && <p className="text-sm text-slate-600 dark:text-slate-300">{m.headline}</p>}
                    <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                      {[m.organization, m.yearsExperience != null ? `${m.yearsExperience} years experience` : null].filter(Boolean).join(' · ') || 'Mentor'}
                    </p>
                  </div>
                </div>
                {m.expertise?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.expertise.map((e) => <span key={e} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">{e}</span>)}
                  </div>
                )}
                {(m.availability || m.sessionMode) && (
                  <p className="text-xs text-slate-500 inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{[m.availability, m.sessionMode].filter(Boolean).join(' · ')}</p>
                )}
                {requesting === m.id ? (
                  <RequestForm mentor={m} onCancel={() => setRequesting(null)}
                    onSent={() => { setRequesting(null); setNotice('Request sent. Your mentor will accept or suggest another time.'); load(); }} />
                ) : (
                  <button type="button" onClick={() => { setRequesting(m.id); setNotice(''); }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium cursor-pointer">
                    <CalendarPlus className="w-4 h-4" /> Request session or interview
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your sessions</h2>
        {active.length === 0 && past.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center">
            <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-500">No session requests yet.</p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {[...active, ...past].map((s) => {
              const st = STATUS[s.status] || STATUS.completed;
              return (
                <li key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{s.topic}</p>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      <span data-no-translate>{s.mentor.name}</span> · {fmt(s.scheduledAt)} · {s.durationMinutes} min
                    </p>
                    {s.mentorResponse && <p className="text-xs text-slate-600 dark:text-slate-300">Mentor: {s.mentorResponse}</p>}
                    {s.status === 'completed' && s.notes && <p className="text-xs text-slate-600 dark:text-slate-300">Notes: {s.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {s.status === 'upcoming' && s.meetingLink && (
                      <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"><Video className="w-4 h-4" /> Join</a>
                    )}
                    {['requested', 'upcoming'].includes(s.status) && (
                      <button type="button" onClick={() => cancel(s)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"><X className="w-4 h-4" /> Cancel</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default MentorshipTab;

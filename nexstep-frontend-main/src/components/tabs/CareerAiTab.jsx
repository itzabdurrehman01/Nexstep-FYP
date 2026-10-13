import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Loader2, AlertCircle, RefreshCw, Target, ListChecks, UserCog, CheckCircle2, Circle, ChevronDown,
  GraduationCap, Route, Columns3, X, Star, ArrowRight, Info,
} from 'lucide-react';
import { usePlan, PlanBadge, UpgradeCard } from '../premium/premium.jsx';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
const btnGhost = 'inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const btnPrimary = 'inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 cursor-pointer';

const RIASEC = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
const SKILLGAP_KEY = 'ns_skillgap_career';

function tone(score) {
  if (score >= 75) return { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', ring: '#10b981' };
  if (score >= 55) return { text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', ring: '#3b82f6' };
  if (score >= 40) return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', ring: '#f59e0b' };
  return { text: 'text-slate-500', bar: 'bg-slate-400', ring: '#94a3b8' };
}

function ScoreRing({ score, size = 64 }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const t = tone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-slate-100 dark:text-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.ring} strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${t.text}`}>{score}%</span>
    </div>
  );
}

function ProfileStep({ done, label, hint, action, onAction }) {
  return (
    <li className="flex items-start gap-3">
      {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? 'text-slate-700 dark:text-slate-200' : 'font-medium text-slate-900 dark:text-white'}`}>{label}</p>
        {!done && hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {!done && onAction && <button type="button" onClick={onAction} className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0">{action}</button>}
    </li>
  );
}

function MatchCard({ m, rank, isTarget, onTarget, onGap, selectable, selected, onSelect, busy }) {
  const [open, setOpen] = useState(rank === 1);
  const c = m.career;
  return (
    <article className={`${card} p-5 space-y-4 ${selected ? 'ring-2 ring-emerald-500' : ''}`}>
      <div className="flex items-start gap-4">
        <ScoreRing score={m.score} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">#{rank}</span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{c.title}</h3>
            {isTarget && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Star className="w-3 h-3 fill-current" />My target</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{c.category} · {m.fit} · Interests {c.riasecCode}</p>
          {c.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{c.description}</p>}
        </div>
        {selectable && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
            <input type="checkbox" checked={selected} onChange={onSelect} className="w-4 h-4 accent-emerald-600" /> Compare
          </label>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        {m.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between text-xs"><span className="font-medium text-slate-700 dark:text-slate-200">{f.label}</span><span className="text-slate-500">{f.score}/{f.max}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${tone((f.score / f.max) * 100).bar}`} style={{ width: `${(f.score / f.max) * 100}%` }} /></div>
            <p className="mt-1 text-xs text-slate-500">{f.note}</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />{open ? 'Hide details' : 'Why this career & how to get there'}
      </button>
      {open && (
        <div className="space-y-4 text-sm">
          {(m.strengths.length > 0 || m.gaps.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1.5">In your favour</p>
                {m.strengths.length ? <ul className="space-y-1.5">{m.strengths.map((s, i) => <li key={i} className="flex gap-2 text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />{s}</li>)}</ul> : <p className="text-slate-500">Complete your profile to see your strengths.</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1.5">To work on</p>
                {m.gaps.length ? <ul className="space-y-1.5">{m.gaps.map((s, i) => <li key={i} className="flex gap-2 text-slate-600 dark:text-slate-300"><Target className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />{s}</li>)}</ul> : <p className="text-slate-500">Nothing major — keep going.</p>}
              </div>
            </div>
          )}
          {c.degrees.length > 0 && (
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 inline-flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Degrees</p>
              <div className="flex flex-wrap gap-1.5">{c.degrees.map((d) => <span key={d} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">{d}</span>)}</div></div>
          )}
          {c.pathway && (
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 inline-flex items-center gap-1.5"><Route className="w-3.5 h-3.5" />Pathway</p>
              <p className="text-slate-600 dark:text-slate-300">{c.pathway}</p></div>
          )}
          {(c.startingSalaryPkr || c.demandLevel) && (
            <p className="text-xs text-slate-500">{c.demandLevel ? `Demand: ${c.demandLevel}` : ''}{c.demandLevel && c.startingSalaryPkr ? ' · ' : ''}{c.startingSalaryPkr ? `Starting salary about Rs ${Number(c.startingSalaryPkr).toLocaleString('en-PK')} / month` : ''}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={onGap} className={btnPrimary}><Target className="w-4 h-4" /> Skill gap</button>
        {!isTarget && <button type="button" onClick={onTarget} disabled={busy} className={btnGhost}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />} Set as my target</button>}
      </div>
    </article>
  );
}

function CompareTable({ items, onClose }) {
  const rows = [
    ['Match', (m) => <span className={`font-bold ${tone(m.score).text}`}>{m.score}%</span>],
    ...['interests', 'stream', 'skills', 'marks'].map((k) => [items[0].factors.find((f) => f.key === k).label, (m) => { const f = m.factors.find((x) => x.key === k); return `${f.score}/${f.max}`; }]),
    ['Category', (m) => m.career.category],
    ['Interest code', (m) => m.career.riasecCode],
    ['Usual groups', (m) => m.career.streams.join(', ') || 'Any'],
    ['Degrees', (m) => m.career.degrees.join(', ') || '—'],
    ['Skills you have', (m) => (m.have.length ? m.have.join(', ') : 'None yet')],
    ['Skills to build', (m) => (m.missing.length ? m.missing.join(', ') : 'None')],
  ];
  return (
    <section className={`${card} p-5 space-y-3`}>
      <div className="flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900 dark:text-white">Comparison</h2>
        <button type="button" onClick={onClose} aria-label="Close comparison" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button></div>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr><th className="text-start py-2 pe-3 text-xs font-medium text-slate-500 w-36"></th>{items.map((m) => <th key={m.career.id} className="text-start py-2 px-3 font-semibold text-slate-900 dark:text-white">{m.career.title}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(([label, fn]) => <tr key={label}><td className="py-2 pe-3 text-xs font-medium text-slate-500 align-top">{label}</td>{items.map((m) => <td key={m.career.id} className="py-2 px-3 text-slate-700 dark:text-slate-200 align-top">{fn(m)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Career AI — careers ranked against the student's interests, group, skills and marks. */
export function CareerAiTab({ onNavigate }) {
  const { plan, isPremium } = usePlan();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('balanced');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState([]);
  const [compare, setCompare] = useState(null);
  const [busyTarget, setBusyTarget] = useState(null);
  const [compareError, setCompareError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/career-ai/matches?sort=${sortBy}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load your matches.');
      setData(json); setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [sortBy]);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => ['all', ...new Set((data?.data || []).map((m) => m.career.category))], [data]);
  const shown = (data?.data || []).filter((m) => category === 'all' || m.career.category === category);
  const p = data?.profile;

  const setTarget = async (careerId) => {
    setBusyTarget(careerId);
    try {
      const res = await fetch('/api/career-ai/target', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ careerId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save.');
      setData((d) => ({ ...d, profile: { ...d.profile, targetCareer: json.targetCareer } }));
    } catch (e) { setError(e.message); } finally { setBusyTarget(null); }
  };

  const openGap = (careerId) => {
    try { sessionStorage.setItem(SKILLGAP_KEY, careerId); } catch { /* ignore */ }
    onNavigate?.('skillGap');
  };

  const runCompare = async () => {
    setCompareError('');
    try {
      const res = await fetch('/api/career-ai/compare', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not compare.');
      setCompare(json.data);
    } catch (e) { setCompareError(e.message); }
  };

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  const profileSteps = p ? [
    { done: !!p.riasec, label: p.riasec ? `Interests: ${p.riasec.split('').map((l) => RIASEC[l]).join(', ')}` : 'Take the interest quiz', hint: 'Interests count for 35% of each match. Retake the quiz to change this.', action: p.riasec ? 'Retake quiz' : 'Take quiz', tab: 'quiz' },
    { done: !!p.stream || p.level === 'dae', label: p.stream ? `Group: ${p.stream}` : 'Add your group / stream', hint: 'Used to check which careers your group leads to.', action: 'Open settings', tab: 'settings' },
    { done: p.skillsCount > 0, label: p.skillsCount ? `${p.skillsCount} skill${p.skillsCount === 1 ? "" : "s"} in your profile` : 'Add skills you already have', hint: 'Skills you list are matched against each career.', action: 'Add skills', tab: 'skillGap' },
    { done: p.hasMarks, label: p.hasMarks ? 'Marks added' : 'Add your Matric / Inter marks', hint: 'Marks show how competitive your admissions will be.', action: 'Open settings', tab: 'settings' },
  ] : [];
  const completed = profileSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white inline-flex items-center gap-2"><Sparkles className="w-6 h-6 text-emerald-600" aria-hidden="true" />Career AI</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {sortBy === 'interest'
              ? 'A different set of careers chosen from your interest quiz — not the marks list.'
              : sortBy === 'marks'
                ? 'A different set of careers chosen from your marks, grades and group — not the interest list.'
                : 'Careers ranked against your interests, group, skills and marks.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PlanBadge plan={plan} />
          <button type="button" onClick={load} disabled={loading} className={btnGhost}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}

      {!data ? (!error && <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Calculating your matches…</div>) : (
        <>
          {completed < profileSteps.length && (
            <section className={`${card} p-5`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><UserCog className="w-4 h-4" />Improve your matches</h2>
                <span className="text-xs text-slate-500">{completed} of {profileSteps.length} done</span>
              </div>
              <ul className="space-y-2.5">
                {profileSteps.map((s) => <ProfileStep key={s.label} {...s} onAction={() => onNavigate?.(s.tab)} />)}
              </ul>
            </section>
          )}

          {data.total === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-14 text-center">
              <ListChecks className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No careers available yet</p>
              <p className="mt-1 text-xs text-slate-500">An admin adds careers from Admin → Content → Careers.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rank careers by">
                  {[
                    ['balanced', 'Both'],
                    ['interest', 'By interest'],
                    ['marks', 'By marks'],
                  ].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setSortBy(id)} aria-pressed={sortBy === id}
                      className={`h-8 px-3 rounded-lg text-xs font-medium cursor-pointer ${sortBy === id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c}
                      className={`h-8 px-3 rounded-lg text-xs font-medium cursor-pointer ${category === c ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {c === 'all' ? 'All' : c}
                    </button>
                  ))}
                </div>
                {isPremium && (
                  <button type="button" onClick={runCompare} disabled={selected.length < 2} className={btnGhost}><Columns3 className="w-4 h-4" />Compare {selected.length ? `(${selected.length})` : ''}</button>
                )}
              </div>
              {isPremium && selected.length < 2 && <p className="text-xs text-slate-500 inline-flex items-center gap-1.5 -mt-3"><Info className="w-3.5 h-3.5" />Tick “Compare” on two or three careers to see them side by side.</p>}
              {compareError && <p role="alert" className="text-sm text-red-600">{compareError}</p>}
              {compare && <CompareTable items={compare} onClose={() => setCompare(null)} />}

              <div className="space-y-4">
                {shown.map((m) => (
                  <MatchCard key={m.career.id} m={m} rank={data.data.indexOf(m) + 1}
                    isTarget={p?.targetCareer === m.career.title}
                    onTarget={() => setTarget(m.career.id)} busy={busyTarget === m.career.id}
                    onGap={() => openGap(m.career.id)}
                    selectable={isPremium} selected={selected.includes(m.career.id)} onSelect={() => toggleSelect(m.career.id)} />
                ))}
              </div>

              {data.limited && (
                <UpgradeCard
                  title={`${data.total - data.data.length} more careers matched your profile`}
                  text="Premium shows every match, lets you compare careers side by side and unlocks the full skill plan."
                  onUpgrade={() => onNavigate?.('pricing')} />
              )}
              {!isPremium && !data.limited && (
                <button type="button" onClick={() => onNavigate?.('pricing')} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">Compare careers with Premium <ArrowRight className="w-4 h-4" /></button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default CareerAiTab;

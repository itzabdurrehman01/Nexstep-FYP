import React, { useCallback, useEffect, useState } from 'react';
import {
  Target, Loader2, AlertCircle, CheckCircle2, Plus, X, BookOpen, ExternalLink, Star, Sparkles, Info,
} from 'lucide-react';
import { usePlan, PlanBadge, UpgradeCard } from '../premium/premium.jsx';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white';
const btnGhost = 'inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const SKILLGAP_KEY = 'ns_skillgap_career';
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.error || 'Something went wrong.'); e.code = json.code; throw e; }
  return json;
}

function Readiness({ value }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-end justify-between"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Skill readiness</span><span className="text-2xl font-bold text-slate-900 dark:text-white">{value}%</span></div>
      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

/** Skill Gap — which skills a career needs, which you have, and how to learn the rest. */
export function SkillGapTab({ onNavigate }) {
  const { plan, isPremium } = usePlan();
  const [matches, setMatches] = useState(null);
  const [limited, setLimited] = useState(false);
  const [careerId, setCareerId] = useState('');
  const [gap, setGap] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState('Beginner');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const loadSkills = useCallback(() => api('/api/profile/skills').then((d) => setSkills(d.data || [])).catch(() => {}), []);

  useEffect(() => {
    loadSkills();
    api('/api/career-ai/matches').then((d) => {
      setMatches(d.data); setLimited(d.limited);
      let wanted = '';
      try { wanted = sessionStorage.getItem(SKILLGAP_KEY) || ''; sessionStorage.removeItem(SKILLGAP_KEY); } catch { /* ignore */ }
      const target = d.data.find((m) => m.career.title === d.profile?.targetCareer);
      setCareerId((d.data.find((m) => m.career.id === wanted) || target || d.data[0])?.career.id || '');
    }).catch((e) => { setError(e.message); setMatches([]); });
  }, [loadSkills]);

  const loadGap = useCallback(async (id) => {
    if (!id) return;
    setGapLoading(true);
    try { const d = await api(`/api/career-ai/careers/${id}/gap`); setGap(d.data); setError(''); }
    catch (e) { setGap(null); setError(e.message); }
    finally { setGapLoading(false); }
  }, []);
  useEffect(() => { loadGap(careerId); }, [careerId, loadGap]);

  const addSkill = async (name, level = 'Intermediate') => {
    const n = String(name).trim();
    if (n.length < 2) return;
    setBusy(n);
    try {
      await api('/api/career-ai/skills', { method: 'POST', body: { name: n, level } });
      await loadSkills(); await loadGap(careerId);
      setNewSkill('');
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const removeSkill = async (name) => {
    setBusy(name);
    try { await api(`/api/career-ai/skills/${encodeURIComponent(name)}`, { method: 'DELETE' }); await loadSkills(); await loadGap(careerId); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const setTarget = async () => {
    setBusy('target');
    try { await api('/api/career-ai/target', { method: 'PUT', body: { careerId } }); setGap((g) => ({ ...g, isTarget: true })); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-6 w-full">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white inline-flex items-center gap-2"><Target className="w-6 h-6 text-emerald-600" aria-hidden="true" />Skill Gap</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">See which skills a career needs, mark what you already know and plan the rest.</p>
        </div>
        <PlanBadge plan={plan} />
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}

      {!matches ? <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div> : matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-14 text-center">
          <Target className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No careers available yet</p>
          <p className="mt-1 text-xs text-slate-500">An admin adds careers from Admin → Content → Careers.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          {/* Left: career + gap */}
          <div className="lg:col-span-2 space-y-5">
            <section className={`${card} p-5 space-y-4`}>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Career</span>
                <select value={careerId} onChange={(e) => setCareerId(e.target.value)} className={inputCls}>
                  {matches.map((m) => <option key={m.career.id} value={m.career.id}>{m.career.title} — {m.score}% match</option>)}
                </select>
              </label>
              {limited && <p className="text-xs text-slate-500 inline-flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />Free plan: skill gap for your top 3 matches. <button type="button" onClick={() => onNavigate?.('pricing')} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">Premium</button> unlocks every career.</p>}

              {gapLoading && !gap ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : gap && (
                <div className={`space-y-5 ${gapLoading ? 'opacity-60' : ''}`}>
                  <Readiness value={gap.readiness} />
                  <div className="flex flex-wrap gap-2">
                    {gap.isTarget
                      ? <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-sm font-medium"><Star className="w-4 h-4 fill-current" />Your target career</span>
                      : <button type="button" onClick={setTarget} disabled={busy === 'target'} className={btnGhost}>{busy === 'target' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}Set as my target</button>}
                    <button type="button" onClick={() => onNavigate?.('careerAi')} className={btnGhost}><Sparkles className="w-4 h-4" />Back to Career AI</button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">You have ({gap.have.length})</p>
                      {gap.have.length ? (
                        <div className="flex flex-wrap gap-1.5">{gap.have.map((s) => <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" />{s}</span>)}</div>
                      ) : <p className="text-sm text-slate-500">None yet. Tick the skills you already know.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">To build ({gap.missing.length})</p>
                      {gap.missing.length ? (
                        <ul className="space-y-1.5">
                          {gap.missing.map((s) => (
                            <li key={s} className="flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-200">
                              <span>{s}</span>
                              <button type="button" onClick={() => addSkill(s)} disabled={!!busy} className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer">
                                {busy === s ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}I have this
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-emerald-700 dark:text-emerald-400">You have every key skill for this career.</p>}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {gap && gap.missing.length > 0 && (
              <section className={`${card} p-5 space-y-4`}>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><BookOpen className="w-4 h-4" />Learning plan</h2>
                <ol className="space-y-4">
                  {gap.learningPlan.map((item, i) => (
                    <li key={item.skill} className="flex gap-3">
                      <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.skill}</p>
                        {item.courses.length ? item.courses.map((c) => (
                          <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{c.title}</p>
                              <p className="text-xs text-slate-500 truncate">{[c.provider, c.duration, c.format, c.pricePkr === 0 ? 'Free' : c.pricePkr ? `Rs ${Number(c.pricePkr).toLocaleString('en-PK')}` : null].filter(Boolean).join(' · ')}</p>
                            </div>
                            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">Open <ExternalLink className="w-3.5 h-3.5" /></a>}
                          </div>
                        )) : (
                          <p className="text-xs text-slate-500">No course listed for this skill yet. <button type="button" onClick={() => onNavigate?.('courses')} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">Browse courses</button></p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {gap.lockedSkills > 0 && (
                  <UpgradeCard compact title={`${gap.lockedSkills} more skill${gap.lockedSkills > 1 ? 's' : ''} in your plan`} text="Premium shows the full learning plan for every skill and career." onUpgrade={() => onNavigate?.('pricing')} />
                )}
              </section>
            )}
          </div>

          {/* Right: my skills */}
          <aside className={`${card} p-5 space-y-4`}>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">My skills</h2>
              <p className="text-xs text-slate-500 mt-0.5">Saved to your profile and used by Career AI.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addSkill(newSkill, newLevel); }} className="space-y-2">
              <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} maxLength={80} placeholder="e.g. Python, Biology, Public speaking" className={inputCls} aria-label="Skill name" />
              <div className="flex gap-2">
                <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className={inputCls} aria-label="Skill level">
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
                <button type="submit" disabled={newSkill.trim().length < 2 || !!busy} className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 cursor-pointer"><Plus className="w-4 h-4" />Add</button>
              </div>
            </form>
            {skills.length === 0 ? <p className="text-sm text-slate-500">No skills yet.</p> : (
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <li key={s.name} className="inline-flex items-center gap-1 ps-2.5 pe-1 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <span>{s.name}</span>{s.level && <span className="text-slate-400">· {s.level}</span>}
                    <button type="button" onClick={() => removeSkill(s.name)} disabled={busy === s.name} aria-label={`Remove ${s.name}`} className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                      {busy === s.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!isPremium && plan && <p className="text-xs text-slate-500">Free plan: learning plan for the first 3 missing skills.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}

export default SkillGapTab;

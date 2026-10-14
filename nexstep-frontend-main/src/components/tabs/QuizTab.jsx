import React, { useEffect, useMemo, useState } from 'react';
import {
  ListChecks, ChevronLeft, ChevronRight, RotateCcw, Loader2, CheckCircle2, ArrowRight, Sparkles,
  Stethoscope, Cog, Laptop, Briefcase, Scale, Palette, Wrench, HeartHandshake, AlertCircle, Clock,
} from 'lucide-react';
import {
  RIASEC_TYPES, LIKERT, AREAS, RECOMMENDATIONS, recommendationGroup, scoreQuiz,
} from '../../data/interestQuiz.js';
import { buildPersonalQuiz } from '../../data/quizPersonalize.js';
import { isPageAllowedForLevel, levelLabel } from '../../config/educationLevels.js';
import { NAV_ITEMS } from '../../config/navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ICONS = { Stethoscope, Cog, Laptop, Briefcase, Scale, Palette, Wrench, HeartHandshake };
const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
const btnPrimary = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
const btnGhost = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const draftKey = (userId, attempt) => `ns_interest_quiz_draft_${userId || 'guest'}_${attempt}`;

function Bar({ value, tone = 'bg-emerald-500' }) {
  return <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${value}%` }} /></div>;
}

function Results({ result, level, lang, onRetake, onNavigate, savedAt, marks = 0 }) {
  const ur = lang === 'ur';
  const [matches, setMatches] = useState([]);
  useEffect(() => {
    fetch('/api/career-ai/matches', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMatches(Array.isArray(d?.data) ? d.data.slice(0, 3) : []))
      .catch(() => setMatches([]));
  }, []);
  const group = recommendationGroup(level);
  const recs = RECOMMENDATIONS[group];
  const top = result.ranked.slice(0, 3);
  const navLabel = (id) => (ur ? NAV_ITEMS[id]?.labelUr : NAV_ITEMS[id]?.label) || id;
  const allowed = (id) => !level || isPageAllowedForLevel(id, level);
  return (
    <div className="space-y-6">
      <section className={`${card} p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{ur ? 'آپ کا کلسٹر' : 'Your career cluster'}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              {ur ? RIASEC_TYPES[result.code[0]].ur : RIASEC_TYPES[result.code[0]].en}
              <span className="ml-2 text-base font-medium text-slate-500" data-no-translate>({result.code[0]})</span>
            </h2>
            <p className="text-xs text-slate-500">{ur ? 'کوڈ' : 'Code'} <span data-no-translate>{result.code}</span> — {ur ? 'چھ ہالینڈ کلسٹرز میں سے ایک' : 'one of the six Holland clusters'}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {result.code.split('').map((l) => (ur ? RIASEC_TYPES[l].ur : RIASEC_TYPES[l].en)).join(' · ')}
            </p>
            {savedAt && <p className="mt-1 text-xs text-slate-500">{ur ? 'محفوظ کیا گیا' : 'Saved'} {new Date(savedAt).toLocaleDateString()}</p>}
          </div>
          <button type="button" onClick={onRetake} className={btnGhost}><RotateCcw className="w-4 h-4" />{ur ? 'دوبارہ دیں' : 'Retake quiz'}</button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{ur ? RIASEC_TYPES[result.code[0]].descUr : RIASEC_TYPES[result.code[0]].desc}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {Object.entries(result.riasecPct).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1"><span className="font-medium text-slate-700 dark:text-slate-200">{ur ? RIASEC_TYPES[k].ur : RIASEC_TYPES[k].en} ({k})</span><span className="text-slate-500">{v}%</span></div>
              <Bar value={v} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {ur ? 'آپ کے لیے موزوں شعبے' : 'Fields that suit you'}{level ? <span className="font-normal text-slate-500"> — {ur ? 'برائے' : 'for'} {levelLabel(level, lang)}</span> : null}
        </h2>
        {top.map((areaId, i) => {
          const area = AREAS[areaId];
          const Icon = ICONS[area.icon] || Sparkles;
          const rec = recs[areaId];
          const links = rec.links.filter(allowed);
          return (
            <article key={areaId} className={`${card} p-5 space-y-3 ${i === 0 ? 'ring-2 ring-emerald-500' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{i + 1}. {ur ? area.ur : area.en}</p>
                    <span className="text-xs font-medium text-slate-500">{result.areaPct[areaId]}% {ur ? 'مطابقت' : 'match'}</span>
                  </div>
                  <div className="mt-1.5"><Bar value={result.areaPct[areaId]} /></div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{rec.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{rec.text}</p>
              </div>
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map((id) => (
                    <button key={id} type="button" onClick={() => onNavigate?.(id)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                      {navLabel(id)} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className={`${card} p-5 space-y-3`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{ur ? 'تمام شعبے' : 'All study areas'}</h2>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {result.ranked.map((a) => (
            <div key={a}>
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-700 dark:text-slate-200">{ur ? AREAS[a].ur : AREAS[a].en}</span><span className="text-slate-500">{result.areaPct[a]}%</span></div>
              <Bar value={result.areaPct[a]} tone="bg-blue-500" />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {marks > 0
            ? (ur ? `یہ کیریئر آپ کے ${RIASEC_TYPES[result.code[0]].ur} نتیجے اور ${marks}% نمبروں کو ملا کر بنے ہیں۔` : `These careers combine your ${RIASEC_TYPES[result.code[0]].en} result with your ${marks}% marks.`)
            : (ur ? 'نمبر پروفائل میں شامل کریں تاکہ یہ نتیجہ نمبروں کے ساتھ ملایا جا سکے۔' : 'Add your marks on your profile so this result is combined with your academic marks.')}
        </p>
        {matches.length > 0 && (
          <ul className="space-y-2">
            {matches.map((m, i) => (
              <li key={m.career?.id || i} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{i + 1}. {m.career?.title}</span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 shrink-0">{m.score}%</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('dashboard')} className={btnPrimary}>{ur ? 'ڈیش بورڈ پر جائیں' : 'Continue to dashboard'}<ArrowRight className="w-4 h-4" /></button>
          {allowed('careerAi') && <button type="button" onClick={() => onNavigate?.('careerAi')} className={btnGhost}><Sparkles className="w-4 h-4" />{ur ? 'میرے کیریئر میچز دیکھیں' : 'See my career matches'}</button>}
        </div>
      </section>
    </div>
  );
}

/** Interest quiz: a unique mix of statements + subject questions for each student. */
export function QuizTab({ profile, onUpdateProfile, onNavigate, lang = 'en' }) {
  const ur = lang === 'ur';
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const level = profile?.education?.level || null;
  const [attempt, setAttempt] = useState(0);
  const [pack, setPack] = useState(() => buildPersonalQuiz(userId, 0));
  const steps = useMemo(() => pack.riasec.slice(0, 30).map((q) => ({ kind: 'riasec', q })), [pack]);
  const [phase, setPhase] = useState('loading'); // loading | intro | quiz | result
  const [step, setStep] = useState(0);
  const [riasecAnswers, setRiasecAnswers] = useState({});
  const [subjectAnswers, setSubjectAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Show the last saved result if there is one.
  useEffect(() => {
    let alive = true;
    fetch('/api/quiz-results', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => {
        if (!alive) return;
        const rows = d.data || [];
        setAttempt(rows.length);
        const last = rows.find((x) => x.fullScores?.result) || rows[0];
        let startNow = false;
        try { startNow = sessionStorage.getItem('ns_start_quiz') === '1'; sessionStorage.removeItem('ns_start_quiz'); } catch { /* ignore */ }
        if (startNow) {
          setAttempt(rows.length);
          setPhase('intro');
          setTimeout(() => {
            const next = buildPersonalQuiz(userId, rows.length);
            setPack(next);
            setRiasecAnswers({});
            setSubjectAnswers({});
            setStep(0);
            setPhase('quiz');
          }, 0);
        } else if (last?.fullScores?.result) { setResult(last.fullScores.result); setSavedAt(last.date); setPhase('result'); }
        else setPhase('intro');
      })
      .catch(() => alive && setPhase('intro'));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (phase !== 'quiz') return;
    try { localStorage.setItem(draftKey(userId, attempt), JSON.stringify({ step, riasec: riasecAnswers, subject: subjectAnswers })); } catch { /* ignore */ }
  }, [phase, step, riasecAnswers, subjectAnswers, userId, attempt]);

  const current = steps[step];
  const answered = current?.kind === 'riasec' ? riasecAnswers[current.q.id] != null : current ? subjectAnswers[current.q.id] != null : false;
  const doneCount = Object.keys(riasecAnswers).length + Object.keys(subjectAnswers).length;
  const pct = Math.round((doneCount / Math.max(steps.length, 1)) * 100);

  const beginQuiz = (nextAttempt = attempt) => {
    const next = buildPersonalQuiz(userId, nextAttempt);
    setPack(next);
    setRiasecAnswers({});
    setSubjectAnswers({});
    setStep(0);
    setError('');
    setPhase('quiz');
    try { localStorage.removeItem(draftKey(userId, nextAttempt)); } catch { /* ignore */ }
  };

  const answer = (value) => {
    if (current.kind === 'riasec') setRiasecAnswers((a) => ({ ...a, [current.q.id]: value }));
    else setSubjectAnswers((a) => ({ ...a, [current.q.id]: value }));
    // move on automatically
    setTimeout(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 180);
  };

  const finish = async () => {
    const missing = steps.findIndex((st) => (st.kind === 'riasec' ? riasecAnswers[st.q.id] == null : subjectAnswers[st.q.id] == null));
    if (missing >= 0) { setStep(missing); setError(ur ? 'براہ کرم تمام سوالات کے جواب دیں۔' : 'Please answer every question — this one was skipped.'); return; }
    setError('');
    const r = scoreQuiz(riasecAnswers, {}, pack.riasec.slice(0, 30), []);
    setResult(r); setPhase('result'); setSaving(true);
    const topArea = AREAS[r.ranked[0]].en;
    const rec = RECOMMENDATIONS[recommendationGroup(level)][r.ranked[0]];
    const interest = `${r.code} - ${r.code.split('').map((l) => RIASEC_TYPES[l].en).join(', ')}`;
    try {
      await fetch('/api/quiz-results', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: r.code,
          topTrait: `${RIASEC_TYPES[r.code[0]].en} · ${topArea}`,
          streamRecommendation: rec.title,
          fullScores: { version: 2, level, seed: pack.seed, result: r, answers: { riasec: riasecAnswers, subject: subjectAnswers } },
        }),
      });
      onUpdateProfile?.({ topRiasecCluster: interest });
      setAttempt((n) => n + 1);
      setSavedAt(new Date().toISOString());
      try { localStorage.removeItem(draftKey(userId, attempt)); } catch { /* ignore */ }
    } catch { setError(ur ? 'نتیجہ محفوظ نہیں ہو سکا۔' : 'Your result could not be saved. It is shown below — try again later.'); }
    finally { setSaving(false); }
  };

  const restart = () => beginQuiz(attempt);

  return (
    <div className="space-y-6 w-full">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white inline-flex items-center gap-2"><ListChecks className="w-6 h-6 text-emerald-600" />{ur ? 'دلچسپی کوئز' : 'Interest quiz'}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ur ? '30 سوالات — ہالینڈ کے چھ کیریئر کلسٹرز میں سے آپ کا کلسٹر۔ نتیجہ نمبروں کے ساتھ ملا کر کیریئر تجویز کرتا ہے۔' : '30 questions. You are mapped to one of Holland’s six career clusters, then combined with your marks.'}</p>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}

      {phase === 'loading' ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : phase === 'intro' ? (
        <section className={`${card} p-6 sm:p-8 space-y-5`}>
          <div className="grid sm:grid-cols-3 gap-4">
            {[[ListChecks, ur ? '30 سوالات' : '30 questions', ur ? 'ہر کلسٹر کے 5 سوال — Realistic سے Conventional' : 'Five questions for each cluster, from Realistic to Conventional'],
              [Clock, ur ? 'تقریباً 5 منٹ' : 'About 5 minutes', ur ? 'نتیجہ پروفائل میں محفوظ ہوتا ہے' : 'Your result is saved on your profile'],
              [Sparkles, ur ? 'ذاتی رہنمائی' : 'Personal next steps', level ? `${ur ? 'برائے' : 'For'} ${levelLabel(level, lang)}` : (ur ? 'آپ کی جماعت کے مطابق' : 'Matched to your class')]].map(([I, t, d]) => (
              <div key={t} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
                <I className="w-5 h-5 text-emerald-600" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{t}</p>
                <p className="mt-0.5 text-xs text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{ur ? 'کوئی جواب صحیح یا غلط نہیں — وہی چنیں جو آپ کے بارے میں سچ ہو۔' : 'There are no right or wrong answers — choose what is true for you, not what others expect.'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => beginQuiz(attempt)} className={btnPrimary}>{ur ? 'کوئز شروع کریں' : 'Start the quiz'}<ChevronRight className="w-4 h-4" /></button>
            {profile?.topRiasecCluster && <button type="button" onClick={() => beginQuiz(attempt)} className={btnGhost}><RotateCcw className="w-4 h-4" />{ur ? 'دلچسپی تبدیل کریں' : 'Change my interest'}</button>}
          </div>
        </section>
      ) : phase === 'quiz' ? (
        <section className={`${card} p-5 sm:p-8 space-y-6`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{ur ? 'ہالینڈ RIASEC' : 'Holland RIASEC'}</span>
              <span>{ur ? 'سوال' : 'Question'} {step + 1} / {steps.length}</span>
            </div>
            <Bar value={pct} />
          </div>

          {current.kind === 'riasec' ? (
            <div className="space-y-5">
              <p className="text-lg font-semibold text-slate-900 dark:text-white leading-snug">{ur ? current.q.textUr : current.q.textEn}</p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="How much do you agree?">
                {LIKERT.map((o) => {
                  const sel = riasecAnswers[current.q.id] === o.value;
                  return (
                    <button key={o.value} type="button" role="radio" aria-checked={sel} onClick={() => answer(o.value)}
                      className={`h-12 sm:h-16 px-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${sel ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      {ur ? o.ur : o.en}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-lg font-semibold text-slate-900 dark:text-white leading-snug">{ur ? current.q.ur : current.q.en}</p>
              <div className="grid sm:grid-cols-2 gap-2" role="radiogroup">
                {current.q.options.map((o, i) => {
                  const sel = subjectAnswers[current.q.id] === i;
                  return (
                    <button key={i} type="button" role="radio" aria-checked={sel} onClick={() => answer(i)}
                      className={`min-h-12 px-4 py-2.5 rounded-xl border text-sm text-start cursor-pointer transition-colors flex items-center gap-2 ${sel ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      {sel && <CheckCircle2 className="w-4 h-4 shrink-0" />}<span>{ur ? o.ur : o.en}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={btnGhost}><ChevronLeft className="w-4 h-4" />{ur ? 'پچھلا' : 'Back'}</button>
            {step === steps.length - 1 ? (
              <button type="button" onClick={finish} disabled={!answered || saving} className={btnPrimary}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}{ur ? 'نتیجہ دیکھیں' : 'See my result'}<CheckCircle2 className="w-4 h-4" /></button>
            ) : (
              <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={!answered} className={btnPrimary}>{ur ? 'اگلا' : 'Next'}<ChevronRight className="w-4 h-4" /></button>
            )}
          </div>
        </section>
      ) : result && (
        <Results result={result} level={level} lang={lang} onRetake={restart} onNavigate={onNavigate} savedAt={savedAt}
          marks={Math.max(Number(profile?.marks?.matricPct) || 0, Number(profile?.marks?.fscPct) || 0)} />
      )}
    </div>
  );
}

export default QuizTab;

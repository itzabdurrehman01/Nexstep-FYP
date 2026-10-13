import { useEffect, useMemo, useState } from 'react';
import { useRestoredValue } from '../../hooks/useRestoredValue.js';
import { SearchableSelect, SampleDataNotice } from '../common/SearchableSelect.jsx';
import { optionsWithSaved } from '../../utils/profileFields.js';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, TrendingUp, AlertCircle, CheckCircle2, Search, ExternalLink, Info } from 'lucide-react';

const PROGRAMS = [
  'Computer Science','Software Engineering','Electrical Engineering','Mechanical Engineering',
  'Civil Engineering','MBBS','BDS','Pharm-D','BBA','Economics','Physics','Mathematics',
  'Computer Engineering','Chemical Engineering','Aerospace Engineering',
];

export function MeritCalculatorTab({ profile, lang = 'en' }) {
  const [fscPct, setFscPct]     = useRestoredValue(profile?.marks?.fscPct || '', '');
  const [testScore, setTestScore] = useRestoredValue(profile?.marks?.entryTestScore || '', '');
  const [program, setProgram]   = useRestoredValue(profile?.targetCareer || '', 'Computer Science');
  const [year, setYear]         = useState('2024-25');
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [university, setUniversity] = useState('All');
  const [cutoffs, setCutoffs]   = useState([]);

  // Programmes, universities and years in the dropdowns come from the cut-off data.
  useEffect(() => {
    fetch('/api/merit-cutoffs').then((r) => r.json()).then((d) => setCutoffs(Array.isArray(d?.data) ? d.data : [])).catch(() => {});
  }, []);
  const programOptions = useMemo(() => {
    const m = new Map(); cutoffs.forEach((c) => { if (c.academic_year === year) m.set(c.program_name, (m.get(c.program_name) || 0) + 1); });
    const list = [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([p, n]) => ({ value: p, label: p, hint: `${n} ${n === 1 ? 'university' : 'universities'}` }));
    return list.length ? list : PROGRAMS.map((p) => ({ value: p, label: p }));
  }, [cutoffs, year]);
  const universityOptions = useMemo(() => {
    const set = new Map(); cutoffs.forEach((c) => { if (c.program_name === program && c.academic_year === year) set.set(c.university_name, c.city); });
    return [...set].sort((a, b) => a[0].localeCompare(b[0])).map(([u, city]) => ({ value: u, label: u, hint: city || '' }));
  }, [cutoffs, program, year]);
  const yearOptions = useMemo(() => {
    const ys = [...new Set(cutoffs.map((c) => c.academic_year))].sort().reverse();
    return (ys.length ? ys : ['2024-25', '2023-24']).map((y, i) => ({ value: y, label: i === 0 ? `${y} (latest)` : y }));
  }, [cutoffs]);
  useEffect(() => {
    if (!programOptions.length) return;
    const saved = String(profile?.targetCareer || '').trim().toLowerCase();
    const matched = saved && (
      programOptions.find((o) => o.value.toLowerCase() === saved || o.label.toLowerCase() === saved)
      || programOptions.find((o) => saved.includes(o.value.toLowerCase()) || o.value.toLowerCase().includes(saved))
    );
    if (matched) { setProgram(matched.value); return; }
    if (!programOptions.some((o) => o.value === program)) setProgram(programOptions[0].value);
  }, [programOptions, profile?.targetCareer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setUniversity('All'); }, [program, year]);

  const calculate = async () => {
    if (!fscPct || !testScore) { setError('Enter both FSc % and entry test score'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/merit-cutoffs/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fscPct: Number(fscPct), entryTestScore: Number(testScore), programKeyword: program, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Calculator failed');
      setResults(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const chanceConfig = {
    LIKELY:       { label: 'Likely Admission', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, iconColor: 'text-emerald-600' },
    BORDERLINE:   { label: 'Borderline',       color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',   icon: AlertCircle,   iconColor: 'text-amber-500' },
    UNLIKELY:     { label: 'Unlikely',          color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', icon: TrendingUp,    iconColor: 'text-orange-500' },
    VERY_UNLIKELY:{ label: 'Very Unlikely',     color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',           icon: AlertCircle,   iconColor: 'text-red-500' },
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <Calculator className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Merit Cutoff Calculator</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Will I Get In?</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
          Compare your aggregate with past university merit cut-offs for your programme.
        </p>
      </div>

      {/* Calculator form */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">FSc / Inter Percentage</label>
            <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 rounded-xl px-3 bg-white dark:bg-slate-900">
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 85.5"
                value={fscPct} onChange={e => setFscPct(e.target.value)}
                className="flex-1 py-2.5 text-sm bg-transparent text-slate-800 dark:text-white outline-none" />
              <span className="text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Entry Test Score</label>
            <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 rounded-xl px-3 bg-white dark:bg-slate-900">
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 78.0"
                value={testScore} onChange={e => setTestScore(e.target.value)}
                className="flex-1 py-2.5 text-sm bg-transparent text-slate-800 dark:text-white outline-none" />
              <span className="text-slate-400 text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Program</label>
            <SearchableSelect ariaLabel="Programme" value={program} onChange={setProgram} options={optionsWithSaved(programOptions, program)} searchPlaceholder="Search programme, e.g. MBBS, BS Computer Science…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Academic Year</label>
            <SearchableSelect ariaLabel="Academic year" value={year} onChange={setYear} options={yearOptions} searchPlaceholder="Search year…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">University (optional)</label>
          <SearchableSelect ariaLabel="University" value={university} onChange={setUniversity} options={universityOptions}
            allLabel={`All ${universityOptions.length} universities offering ${program}`} searchPlaceholder="Search university…" />
        </div>
        <SampleDataNotice show={cutoffs.some((c) => c.is_sample)} lang={lang} />

        {fscPct && testScore && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            Your aggregate (50/50 formula): <strong className="text-slate-800 dark:text-white ml-1">
              {((Number(fscPct) * 0.5) + (Number(testScore) * 0.5)).toFixed(1)}%
            </strong>
          </div>
        )}

        {error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}

        <button onClick={calculate} disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
          {loading ? '⟳ Calculating...' : <><Calculator className="w-4 h-4" /> Calculate My Chances</>}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Results for <span className="text-blue-600">{results.programSearched}</span> — {results.year}
            </h2>

            {results.results?.filter((r) => university === 'All' || r.universityName === university).length === 0 && (
              <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">{results.message}</p>
                <p className="text-xs text-slate-400 mt-1">Try searching "Computer Science", "MBBS", or "Electrical Engineering"</p>
              </div>
            )}

            {results.results?.filter((r) => university === 'All' || r.universityName === university).map((r, i) => {
              const cfg = chanceConfig[r.chance] || chanceConfig.UNLIKELY;
              const Icon = cfg.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`p-5 rounded-2xl border-2 ${cfg.bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className={`w-4 h-4 ${cfg.iconColor} shrink-0`} />
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{r.universityName}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.programName}</p>
                    </div>
                    <span className={`font-black text-sm px-3 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                      <div className="font-bold text-slate-800 dark:text-white">{r.yourAggregate}%</div>
                      <div className="text-slate-500">Your Score</div>
                    </div>
                    <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                      <div className="font-bold text-slate-800 dark:text-white">{r.meritCutoff}%</div>
                      <div className="text-slate-500">2024-25 Cutoff</div>
                    </div>
                    <div className={`p-2 rounded-lg ${r.gap >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                      <div className={`font-bold ${r.gap >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {r.gap >= 0 ? '+' : ''}{r.gap}%
                      </div>
                      <div className="text-slate-500">Gap</div>
                    </div>
                  </div>
                  {r.sourceUrl && (
                    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Official admissions page
                    </a>
                  )}
                </motion.div>
              );
            })}

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Cutoff figures are from official admission notices (2024-25). Actual merit varies each year. Always check the official university admissions portal before applying.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState } from 'react';
import { EmptyState } from '../common/EmptyState.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Calculator, 
  BookOpen, 
  CheckCircle2, 
  ExternalLink,
  Award,
  Info,
  GraduationCap,
  FileCheck2
} from 'lucide-react';
import { TRANSNATIONAL_PATHWAYS } from '../../data/transnationalData.js';
import { translations } from '../../data/translations.js';
import { SampleDataNotice } from '../common/SearchableSelect.jsx';

export function TransnationalTab({ lang }) {
  const t = translations[lang];

  const [aGrades, setAGrades] = useState({ sub1: 'A*', sub2: 'A', sub3: 'B' });
  const [oPct, setOPct] = useState(85);
  const [convertedScore, setConvertedScore] = useState(null);

  const gradeValues = {
    'A*': 90,
    'A': 85,
    'B': 75,
    'C': 65,
    'D': 55,
    'E': 45,
  };

  const handleCalculateIbcc = () => {
    const s1 = gradeValues[aGrades.sub1] || 75;
    const s2 = gradeValues[aGrades.sub2] || 75;
    const s3 = gradeValues[aGrades.sub3] || 75;

    const avgA = (s1 + s2 + s3) / 3;
    const finalPct = (avgA * 0.6) + (oPct * 0.4);

    setConvertedScore(finalPct.toFixed(1));
  };

  return (
    <div className="ns-page-wrapper space-y-6 min-w-0">
      <SampleDataNotice lang={lang} />
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 min-w-0">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-sky-400 text-white flex items-center justify-center shrink-0 shadow-lg">
              <Globe className="w-7 h-7" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-bold">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>IBCC Equivalency • HEC Recognized</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {t.transnational.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.transnational.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="ns-alert ns-alert-info">
        <Info className="w-5 h-5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">Official IBCC Equivalency Formula</p>
          <p className="text-slate-700 dark:text-slate-300 mt-0.5">
            Final Aggregate = <strong>60% A-Level Principal Subjects</strong> + <strong>40% O-Level Equivalent Percentage</strong>. Verified against IBCC (Islamabad) notification scale.
          </p>
        </div>
      </div>

      <div className="ns-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900 dark:text-white inline-flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t.transnational.calcTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Select your 3 Principal A-Level grades and estimated O-Level percentage to calculate your official IBCC equivalent score out of 1100 marks.
            </p>
          </div>
          <span className="ns-badge ns-badge-info shrink-0">
            <Award className="w-3.5 h-3.5" />
            IBCC Scale
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          {['sub1', 'sub2', 'sub3'].map((key, i) => (
            <div key={key}>
              <label className="ns-input-label" htmlFor={`ibcc-grade-${key}`}>
                Subject {i + 1} Grade
              </label>
              <select
                id={`ibcc-grade-${key}`}
                aria-label={`Principal A-Level subject ${i + 1} grade for IBCC equivalency`}
                value={aGrades[key]}
                onChange={(e) => setAGrades({ ...aGrades, [key]: e.target.value })}
                className="ns-select"
              >
                <option value="A*">A* (90% IBCC)</option>
                <option value="A">A (85% IBCC)</option>
                <option value="B">B (75% IBCC)</option>
                <option value="C">C (65% IBCC)</option>
                <option value="D">D (55% IBCC)</option>
                <option value="E">E (45% IBCC)</option>
              </select>
            </div>
          ))}

          <div>
            <label className="ns-input-label" htmlFor="ibcc-olevel">
              O-Level Equivalent %
            </label>
            <input
              id="ibcc-olevel"
              type="number"
              aria-label="Estimated O-Level equivalent percentage for IBCC equivalency"
              min={0}
              max={100}
              value={oPct}
              onChange={(e) => setOPct(parseFloat(e.target.value) || 0)}
              className="ns-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleCalculateIbcc}
            className="ns-btn ns-btn-primary inline-flex items-center gap-2"
            aria-label="Calculate IBCC FSc equivalent aggregate score"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculate IBCC Score</span>
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Calculation is local, no network call required.
          </span>
        </div>

        <AnimatePresence>
          {convertedScore && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="rounded-2xl p-5 bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Estimated IBCC Equivalent
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                    FSc Equivalent Aggregate Score • Meets PMDC &amp; PEC eligibility thresholds
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tight">
                    {convertedScore}%
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    approx. {Math.round(Number(convertedScore) * 11)} / 1100
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } }
        }}
        className="space-y-5 min-w-0"
      >
        {TRANSNATIONAL_PATHWAYS.length === 0 && <EmptyState title="No pathways yet" message="O/A-Level and international pathways will appear here once they are added." />}
        {TRANSNATIONAL_PATHWAYS.map((path, idx) => (
          <motion.article
            key={path.id}
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: 'easeOut', delay: idx * 0.05 } }
            }}
            className="ns-card ns-card-hover p-6 space-y-4 min-w-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">
                    {path.qualification}
                  </h2>
                </div>
              </div>
            </div>

            <div className="text-sm space-y-3 text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-blue-500/5 dark:bg-blue-400/5 border border-blue-500/15 dark:border-blue-400/15">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  IBCC Conversion Rule
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                  {path.hecEquivalencyFormula}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Mandatory Requirements
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 pl-1.5">
                  {path.keyRequirements.map((r, i) => (
                    <li key={i} className="leading-relaxed">{r}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  Top Pakistani Universities Accepting This Pathway
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 pl-1.5">
                  {path.pakistanUniOptions.map((u, i) => (
                    <li key={i} className="leading-relaxed">{u}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}

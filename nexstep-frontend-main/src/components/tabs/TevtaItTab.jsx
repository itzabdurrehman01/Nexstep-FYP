import React, { useState } from 'react';
import { EmptyState } from '../common/EmptyState.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Laptop, 
  CheckCircle2, 
  ExternalLink, 
  Award, 
  DollarSign, 
  Clock,
  HardHat,
  Building2,
  Plane
} from 'lucide-react';
import { TEVTA_COURSES, FREE_IT_COURSES } from '../../data/tevtaAndItData.js';
import { translations } from '../../data/translations.js';
import { SampleDataNotice } from '../common/SearchableSelect.jsx';

export function TevtaItTab({ lang }) {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState('tevta');

  return (
    <div className="ns-page-wrapper space-y-6 min-w-0">
      <SampleDataNotice lang={lang} />
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                <HardHat className="w-7 h-7" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>TEVTA Punjab • NAVTTC • Govt of Pakistan</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {t.tevtaIt.title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.tevtaIt.subtitle}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0" role="tablist" aria-label="TEVTA or Free IT certificates view">
              <button
                role="tab"
                aria-selected={activeTab === 'tevta'}
                onClick={() => setActiveTab('tevta')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  activeTab === 'tevta'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4" />
                {t.tevtaIt.tevtaTab}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'freeIt'}
                onClick={() => setActiveTab('freeIt')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  activeTab === 'freeIt'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Laptop className="w-4 h-4" />
                {t.tevtaIt.itCertTab}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tevta' ? (
          <motion.div
            key="tevta-view"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0"
          >
            {TEVTA_COURSES.length === 0 && <EmptyState className="md:col-span-2" title="No TEVTA courses yet" message="Technical and vocational courses will appear here once they are added." />}
            {TEVTA_COURSES.map((course, idx) => (
              <motion.article
                key={course.id}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut', delay: idx * 0.04 } }
                }}
                className="ns-card ns-card-hover p-5 space-y-4 flex flex-col justify-between min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <span className="ns-badge ns-badge-warning">{course.field}</span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">
                        {course.title}
                      </h3>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="truncate">{course.institute}</span>
                      </div>
                    </div>
                    <span className="ns-badge ns-badge-primary shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {course.durationMonths} Months
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {course.description}
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Min Entry:</span>
                      <span className="font-semibold text-right truncate">{course.minQualification}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Target Profession:</span>
                      <span className="font-semibold text-right truncate">{course.targetCareer}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 shrink-0">
                        <Plane className="w-3.5 h-3.5" /> Overseas Demand:
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-right">Gulf &amp; EU Visa Eligible</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Starting Salary:</span>
                      <span className="font-bold text-right truncate">PKR 60k – 180k / mo</span>
                    </div>
                    {course.monthlyStipendPkr && (
                      <div className="flex justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 shrink-0">
                          <DollarSign className="w-3.5 h-3.5" /> Govt Stipend:
                        </span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400 text-right truncate">
                          PKR {course.monthlyStipendPkr.toLocaleString()}/mo (FREE)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
                    PBTE &amp; TEVTA Institutes Nationwide
                  </span>
                  <span className="ns-badge ns-badge-success shrink-0">
                    <Award className="w-3.5 h-3.5" />
                    Govt Certified
                  </span>
                </div>
              </motion.article>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="freeit-view"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0"
          >
            {FREE_IT_COURSES.length === 0 && <EmptyState className="md:col-span-2" title="No IT certifications yet" message="Free IT and digital-skills programmes will appear here once they are added." />}
            {FREE_IT_COURSES.map((cert, idx) => (
              <motion.article
                key={cert.id}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut', delay: idx * 0.04 } }
                }}
                className="ns-card ns-card-hover p-5 space-y-4 flex flex-col justify-between min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <span className="ns-badge ns-badge-success">
                        <CheckCircle2 className="w-3 h-3" />
                        {t.tevtaIt.freeBadge}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">
                        {cert.title}
                      </h3>
                      <div className="text-sm text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 min-w-0">
                        <Award className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span className="truncate">{cert.provider}</span>
                      </div>
                    </div>
                    <span className="ns-badge ns-badge-info shrink-0">{cert.level}</span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {cert.description}
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2 text-sm">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Skills Taught</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{cert.skillFocus}</span>
                    </div>
                    <div className="flex justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5" /> Duration:
                      </span>
                      <span className="font-semibold text-right truncate">~{cert.durationHrs} Hours • Self-Paced</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Certificate:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-right truncate">{cert.certificateType}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    100% Free Access
                  </span>
                  <a
                    href={cert.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Start learning ${cert.title} on the official portal`}
                    className="ns-btn ns-btn-primary ns-btn-sm inline-flex items-center gap-1.5"
                  >
                    <span>Start Learning</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

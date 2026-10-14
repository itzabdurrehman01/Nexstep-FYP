import React, { useState } from 'react';
import { EmptyState } from '../common/EmptyState.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  TrendingUp, 
  Search, 
  GraduationCap, 
  DollarSign, 
  CheckCircle2,
  ArrowRightLeft,
  Grid,
  BookOpen,
  Award
} from 'lucide-react';
import { CAREERS_DATA } from '../../data/careersData.js';
import { translations } from '../../data/translations.js';
import { CareerComparisonTool } from '../career/CareerComparisonTool.jsx';
import { SampleDataNotice } from '../common/SearchableSelect.jsx';
import { trackCareerSearch, trackUsage } from '../../utils/usageTracker.js';

const FREE_CERTS = [
  { provider: 'DigiSkills.pk', title: 'Freelancing', url: 'https://digiskills.pk' },
  { provider: 'Google Career Certificates', title: 'Data Analytics', url: 'https://grow.google/certificates/' },
  { provider: 'Coursera', title: 'Audit a course in your field', url: 'https://www.coursera.org' },
];

const POSTGRAD = [
  { degree: 'MS / MPhil', who: 'Same field as your bachelor degree', test: 'GAT General, usually 50%', scholarship: 'HEC need-based and university research awards' },
  { degree: 'MBA', who: 'Students moving into management', test: 'University test or GAT', scholarship: 'University merit waiver and HEC need-based aid' },
  { degree: 'LLM', who: 'Law graduates', test: 'University law admission test where required', scholarship: 'University law scholarships and HEC need-based aid' },
];

function UniversityStudentPanel({ profile, careers }) {
  const degree = profile?.education?.stream || profile?.preferredStream || profile?.education?.levelLabel || 'your degree';
  const needle = String(degree).toLowerCase();
  const matches = careers.filter((career) => {
    const hay = `${career.title} ${career.streamRequired} ${career.category || ''}`.toLowerCase();
    return needle.split(/\s+/).filter((w) => w.length > 3).some((w) => hay.includes(w));
  }).slice(0, 2);
  const shown = matches.length ? matches : careers.slice(0, 2);
  return (
    <section className="ns-card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">For students already in a degree</h2>
        <p className="text-xs text-slate-500 mt-1">Mapped from {degree}. Job titles, pay, and sectors use the stored sample set.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {shown.map((career) => (
          <article key={career.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{career.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">Jobs: {(career.jobTitles || []).slice(0, 4).join(', ')}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Salary: {career.avgSalaryPkr}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Hiring sector: {career.category || career.demandLevel || 'See career page'}</p>
          </article>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Free certificates</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {FREE_CERTS.map((cert) => (
            <li key={cert.provider}>
              <a className="text-emerald-700 dark:text-emerald-400 font-semibold" href={cert.url} target="_blank" rel="noreferrer">{cert.provider}</a>
              <span className="text-slate-600 dark:text-slate-300"> — {cert.title}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {POSTGRAD.map((path) => (
          <article key={path.degree} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{path.degree}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{path.who}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{path.test}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{path.scholarship}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DegreeCareerTab({ profile, lang }) {
  const t = translations[lang];
  const [viewMode, setViewMode] = useState('compare');
  const [search, setSearch] = useState('');

  const filtered = CAREERS_DATA.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.titleUr.includes(q) ||
      c.streamRequired.toLowerCase().includes(q) ||
      c.jobTitles.some(j => j.toLowerCase().includes(q))
    );
  });

  return (
    <div className="ns-page-wrapper space-y-6 min-w-0">
      <SampleDataNotice lang={lang} />
      <UniversityStudentPanel profile={profile} careers={CAREERS_DATA} />
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-5 min-w-0">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                <Briefcase className="w-7 h-7" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{CAREERS_DATA.length} Degrees • {CAREERS_DATA.reduce((acc, c) => acc + (c.jobTitles?.length || 0), 0)}+ Career Paths</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {lang === 'ur' ? 'ڈگری سے کیریئر' : 'Degree to Career'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {lang === 'ur' ? 'اپنی ڈگری سے جڑے کیریئر کے راستے دریافت کریں۔' : 'See which careers each degree leads to, with typical job titles and growth outlook.'}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0" role="tablist" aria-label="View mode: compare or directory">
              <button
                role="tab"
                aria-selected={viewMode === 'compare'}
                onClick={() => setViewMode('compare')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  viewMode === 'compare'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Career Comparison Tool
              </button>
              <button
                role="tab"
                aria-selected={viewMode === 'directory'}
                onClick={() => setViewMode('directory')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  viewMode === 'directory'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
                All Careers Directory
              </button>
            </div>
          </div>

          <AnimatePresence>
            {viewMode === 'directory' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="relative"
              >
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  role="searchbox"
                  aria-label="Search careers by degree, job title, or required stream"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); trackCareerSearch(e.target.value); }}
                  placeholder="Search by degree name, job title, or stream..."
                  className="ns-input pl-11"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'compare' ? (
          <motion.div
            key="compare-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <CareerComparisonTool lang={lang} />
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="dir-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32 }}
          >
            <div className="ns-empty">
              <div className="ns-empty-icon">
                <GraduationCap className="w-9 h-9" strokeWidth={1.8} />
              </div>
              <h3 className="ns-empty-title">No matching degrees or careers</h3>
              <p className="ns-empty-desc">
                Try searching a broader keyword like "engineering", "medical", "commerce", or clear the search box.
              </p>
              <div className="ns-empty-actions">
                <button onClick={() => setSearch('')} className="ns-btn ns-btn-secondary ns-btn-sm">
                  Clear Search
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dir-grid"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0"
          >
            {filtered.length === 0 && <EmptyState className="md:col-span-2 lg:col-span-3" title="No careers yet" message="Degree and career information will appear here once careers are added." />}
            {filtered.map((car, idx) => (
              <motion.article
                key={car.id}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut', delay: idx * 0.035 } }
                }}
                className="ns-card ns-card-hover p-5 space-y-4 flex flex-col justify-between min-w-0"
                onClick={() => trackUsage('career_search', car.id, car.title)}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">
                        {lang === 'ur' ? car.titleUr : car.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-black">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        {car.streamRequired}
                      </span>
                    </div>
                    <span className={`ns-badge shrink-0 ${
                      car.demandLevel === 'Very High' || car.demandLevel === 'High'
                        ? 'ns-badge-success'
                        : car.demandLevel === 'Medium'
                          ? 'ns-badge-warning'
                          : 'ns-badge-subtle'
                    }`}>
                      <TrendingUp className="w-3 h-3" />
                      {car.demandLevel} Demand
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {car.description}
                  </p>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2.5 text-sm">
                    <div className="space-y-1.5 min-w-0">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Job Roles in Industry</span>
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {car.jobTitles.slice(0, 4).map((j, i) => (
                          <span key={i} className="ns-badge ns-badge-subtle truncate">
                            {j}
                          </span>
                        ))}
                        {car.jobTitles.length > 4 && (
                          <span className="ns-badge ns-badge-subtle">+{car.jobTitles.length - 4}</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Starting PKR:
                      </span>
                      <strong className="font-black text-emerald-700 dark:text-emerald-400 truncate">{car.avgSalaryPkr}</strong>
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Top Universities</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {(car.topUniversities || []).join(', ') || 'See Universities tab'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DegreeCareerTab;

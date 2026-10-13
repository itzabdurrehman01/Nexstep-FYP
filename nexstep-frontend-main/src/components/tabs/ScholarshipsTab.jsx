import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  Award,
  Filter,
  Search,
  Bookmark,
  AlertTriangle,
  PiggyBank
} from 'lucide-react';
import { SCHOLARSHIPS_DATA } from '../../data/scholarshipsData.js';
import { translations } from '../../data/translations.js';
import { SearchableSelect, SampleDataNotice } from '../common/SearchableSelect.jsx';
import { matchesStream, profileStream } from '../../utils/streamMatch.js';
import { useRestoredValue } from '../../hooks/useRestoredValue.js';
import { normalizeProvince } from '../../utils/profileFields.js';

const toScholarship = (scholarship, index) => ({
  ...scholarship,
  id: scholarship?.id ?? `scholarship-${index}`,
  title: scholarship?.title || scholarship?.name || 'Scholarship opportunity',
  provider: scholarship?.provider || 'NexStep partner',
  category: scholarship?.category || 'Merit-Based',
  province: scholarship?.province || 'Pakistan',
  description: scholarship?.description || 'See the official portal for eligibility and application details.',
  awardAmountPkr: scholarship?.awardAmountPkr || scholarship?.amountPkr || 'Award not listed',
  maxFamilyIncomePkr: Number(scholarship?.maxFamilyIncomePkr) || 0,
  minAcademicPct: Number(scholarship?.minAcademicPct) || 0,
  eligibleGrades: Array.isArray(scholarship?.eligibleGrades) ? scholarship.eligibleGrades : [],
  applicationUrl: scholarship?.applicationUrl || scholarship?.officialUrl || scholarship?.application_url || scholarship?.official_url || 'https://www.hec.gov.pk/english/scholarshipsgrants/Pages/default.aspx',
  eligibilityScore: Number(scholarship?.eligibilityScore) || 0,
  eligibility: scholarship?.eligibility || '',
});

export function ScholarshipsTab({ profile = {}, lang }) {
  const t = translations[lang] || translations.en;

  const [selectedProvince, setSelectedProvince] = useRestoredValue(normalizeProvince(profile?.province), 'All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [allScholarships, setAllScholarships] = useState(SCHOLARSHIPS_DATA.map(toScholarship));
  const [search, setSearch] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // Ranked once for this student's income, marks and level; filters below run in the browser.
  useEffect(() => {
    setFetchError(null);
    fetch('/api/scholarships/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyMonthlyIncomePkr: profile?.familyMonthlyIncomePkr || profile?.income,
        academicPct: profile?.marks?.fscPct || profile?.marks?.matricPct,
        province: profile?.province || '',
        gradeLevel: profile?.gradeLevel,
        stream: profile?.education?.stream || profile?.preferredStream || '',
      }),
    })
      .then(res => res.json())
      .then(resData => { if (Array.isArray(resData?.data)) setAllScholarships(resData.data.map(toScholarship)); })
      .catch(() => setFetchError('Could not load scholarships right now. Please try again later.'));
  }, [profile?.familyMonthlyIncomePkr, profile?.province, profile?.gradeLevel, profile?.marks?.fscPct, profile?.marks?.matricPct, profile?.preferredStream, profile?.education?.stream]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNational = (p) => /federal|all provinces|all pakistan/i.test(p || '');
  const studentStream = profileStream(profile);
  const scholarships = useMemo(() => {
    const base = allScholarships.filter((sch) => {
      if (selectedProvince !== 'All' && !(sch.province || '').toLowerCase().includes(selectedProvince.toLowerCase()) && !isNational(sch.province)) return false;
      if (selectedCategory !== 'All' && (sch.category || '') !== selectedCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return `${sch.title} ${sch.provider} ${sch.description || ''}`.toLowerCase().includes(q);
      }
      return true;
    });
    if (!studentStream) return base;
    const matched = base.filter((sch) => matchesStream(`${sch.title} ${sch.provider} ${sch.description || ''} ${sch.category || ''}`, studentStream));
    return matched.length ? matched : base;
  }, [allScholarships, selectedProvince, selectedCategory, search, studentStream]);

  // Dropdown options are built from the scholarships themselves.
  const provinceOptions = useMemo(() => {
    const set = new Set();
    allScholarships.forEach((s) => String(s.province || '').split(/\s*\/\s*/).forEach((p) => { if (p && !isNational(p)) set.add(p.trim()); }));
    return [...set].sort().map((p) => ({ value: p, label: p, hint: `${allScholarships.filter((s) => (s.province || '').includes(p)).length} + national schemes` }));
  }, [allScholarships]);
  const categoryOptions = useMemo(() => {
    const m = new Map();
    allScholarships.forEach((s) => { if (s.category) m.set(s.category, (m.get(s.category) || 0) + 1); });
    return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([c, n]) => ({ value: c, label: c, hint: `${n}` }));
  }, [allScholarships]);
  const scholarshipOptions = useMemo(() => allScholarships.map((s) => ({ value: s.id, label: s.title, hint: [s.provider, s.province].filter(Boolean).join(' · ') })), [allScholarships]);

  useEffect(() => {
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.data)) {
          setBookmarkedIds(data.data.map(b => b.id));
        }
      })
      .catch(err => console.log(err));
  }, []);

  const handleBookmark = (sch) => {
    const isBookmarked = bookmarkedIds.includes(sch.id);
    if (isBookmarked) {
      setBookmarkedIds(prev => prev.filter(id => id !== sch.id));
      fetch(`/api/bookmarks/${sch.id}`, { method: 'DELETE' }).catch(e => console.error(e));
    } else {
      setBookmarkedIds(prev => [...prev, sch.id]);
      fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sch.id,
          type: 'scholarship',
          title: sch.title,
          provider: sch.provider,
          officialUrl: sch.applicationUrl
        })
      }).catch(e => console.error(e));
    }
  };

  return (
    <div className="ns-page-wrapper space-y-6 min-w-0">
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                <Award className="w-7 h-7" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>{scholarships.length} Matched Scholarships</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {t.scholarships?.title || 'Scholarships Directory'}
                </h1>
                {studentStream && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Prioritised for your stream: {studentStream}</p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {t.scholarships?.subtitle || 'Matched to your household income, academic marks, and province — for Pakistani students'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div>
              <label className="ns-input-label" htmlFor="sch-search">{lang === 'ur' ? 'تلاش' : 'Search scholarships'}</label>
              <input id="sch-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="ns-input"
                placeholder="e.g. HEC, PEEF, need-based, Chevening" />
            </div>
            <div>
              <label className="ns-input-label" htmlFor="sch-jump">{lang === 'ur' ? 'اسکالرشپ منتخب کریں' : 'Find a scholarship'}</label>
              <SearchableSelect id="sch-jump" value="" options={scholarshipOptions}
                onChange={(id) => { const x = allScholarships.find((s) => s.id === id); if (x) { setSelectedProvince('All'); setSelectedCategory('All'); setSearch(x.title); } }}
                placeholder={`Search all ${allScholarships.length} scholarships…`} searchPlaceholder="Type a scholarship name…" />
            </div>
          </div>
          <SampleDataNotice show={allScholarships.some((s) => s.isSample)} lang={lang} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
            <div>
              <label className="ns-input-label" htmlFor="sch-province">{lang === 'ur' ? 'صوبہ / علاقہ' : 'Province / Region'}</label>
              <SearchableSelect id="sch-province" ariaLabel="Filter scholarships by province or region" value={selectedProvince} onChange={setSelectedProvince}
                options={provinceOptions} allLabel="All provinces" searchPlaceholder="Search province / region…" />
            </div>

            <div>
              <label className="ns-input-label" htmlFor="sch-category">Category</label>
              <SearchableSelect id="sch-category" ariaLabel="Filter scholarships by category" value={selectedCategory} onChange={setSelectedCategory}
                options={categoryOptions} allLabel="All categories" searchPlaceholder="Search category…" />
            </div>

            <div>
              <label className="ns-input-label">Household Income Match</label>
              <div className="ns-select pointer-events-none flex items-center" aria-hidden="false">
                <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="ml-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  PKR {(Number(profile.familyMonthlyIncomePkr) || 0).toLocaleString()} / month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {fetchError && (
          <motion.div
            key="sch-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="ns-alert ns-alert-info"
            role="status"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{fetchError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {scholarships.length === 0 ? (
          <motion.div
            key="sch-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32 }}
          >
            <div className="ns-empty">
              <div className="ns-empty-icon">
                <GraduationCap className="w-9 h-9" strokeWidth={1.8} />
              </div>
              <h3 className="ns-empty-title">No scholarships match your profile</h3>
              <p className="ns-empty-desc">
                Try switching to "All Provinces" or "All Categories" to see more federal and nationwide opportunities.
              </p>
              <div className="ns-empty-actions">
                <button
                  onClick={() => { setSelectedProvince('All'); setSelectedCategory('All'); }}
                  className="ns-btn ns-btn-secondary ns-btn-sm"
                >
                  Expand Filters
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sch-grid"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0"
          >
            {scholarships.map(toScholarship).map((sch, idx) => {
              const isBookmarked = bookmarkedIds.includes(sch.id);
              const isEligible = sch.eligibilityScore >= 80;
              return (
                <motion.article
                  key={sch.id}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut', delay: idx * 0.04 } }
                  }}
                  className="ns-card ns-card-hover p-5 space-y-4 flex flex-col justify-between min-w-0"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`ns-badge ${
                            sch.category === 'Need-Based' ? 'ns-badge-warning' :
                            sch.category === 'Merit-Based' ? 'ns-badge-match' :
                            sch.category === 'Federal' ? 'ns-badge-info' : 'ns-badge-ai'
                          }`}>
                            {sch.category}
                          </span>
                          {sch.eligibility && (
                            <span className={`ns-badge ${isEligible ? 'ns-badge-success' : 'ns-badge-warning'}`}>
                              {sch.eligibility}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">
                          {sch.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{sch.provider}</span>
                          <span className="ns-badge ns-badge-match">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{sch.sourceName || 'National Scholarship Fund'} • {sch.verificationStatus || 'VERIFIED'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleBookmark(sch)}
                          aria-label={isBookmarked ? "Remove from saved bookmarks" : "Save bookmark"}
                          aria-pressed={isBookmarked}
                          className={`p-1.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                            isBookmarked
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
                          }`}
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {sch.description}
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Award Value:</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400 truncate">{sch.awardAmountPkr}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Max Household Income:</span>
                        <span className="font-semibold truncate">PKR {sch.maxFamilyIncomePkr.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Min Marks Needed:</span>
                        <span className="font-semibold">{sch.minAcademicPct}%</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 shrink-0">
                          <Calendar className="w-3.5 h-3.5" /> Deadline:
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 truncate">{sch.deadlineNote || (sch.deadline ? new Date(sch.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Rolling / see website')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
                      Eligible: {sch.eligibleGrades ? sch.eligibleGrades.join(', ') : 'All Students'}
                    </span>
                    <a
                      href={sch.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Apply for ${sch.title} on the official portal`}
                      className="ns-btn ns-btn-primary ns-btn-sm inline-flex items-center gap-1.5"
                    >
                      <span>Apply Now</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

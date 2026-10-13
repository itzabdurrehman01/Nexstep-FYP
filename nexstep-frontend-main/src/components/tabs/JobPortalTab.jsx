import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  Calendar, 
  Search, 
  CheckCircle2, 
  Bookmark, 
  ArrowRight,
  Clock,
  ExternalLink,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  BriefcaseBusiness
} from 'lucide-react';
import { JOBS_INTERNSHIPS_DATA } from '../../data/mockFullAppData.js';
import { SearchableSelect, SampleDataNotice } from '../common/SearchableSelect.jsx';
import { JobListingSkeleton } from '../common/Skeletons.jsx';

const toJobListing = (job, index) => {
  const rawSkills = Array.isArray(job?.required_skills)
    ? job.required_skills
    : Array.isArray(job?.requiredSkills)
      ? job.requiredSkills
      : Array.isArray(job?.requirements)
        ? job.requirements
        : Array.isArray(job?.qualifications)
          ? job.qualifications
          : Array.isArray(job?.skills)
            ? job.skills
            : typeof job?.skills === 'string'
              ? job.skills.split(',').map((s) => s.trim()).filter(Boolean)
              : typeof job?.requirements === 'string'
                ? job.requirements.split(',').map((s) => s.trim()).filter(Boolean)
                : [];

  const minSalary = job?.salary_min ?? job?.salaryMin;
  const maxSalary = job?.salary_max ?? job?.salaryMax;

  const salaryDisplay =
    job?.stipendSalary ||
    (minSalary
      ? `PKR ${Number(minSalary).toLocaleString()}${
          maxSalary ? ' - ' + Number(maxSalary).toLocaleString() : ''
        } / mo`
      : null) ||
    job?.salary ||
    job?.salaryRange ||
    job?.compensation ||
    'Competitive market salary';

  return {
    ...job,
    id: job?.id ?? `job-${index}`,
    title: job?.title || 'Career opportunity',
    company: job?.company || job?.organization || 'NexStep partner',
    type: job?.type || job?.employmentType || 'Full-Time',
    location: job?.location || (job?.city ? `${job.city}, Pakistan` : 'Pakistan'),
    stipendSalary: salaryDisplay,
    description: job?.description || 'Open opportunity details are available through the official listing.',
    requirements: rawSkills.length > 0 ? rawSkills : ['Communication', 'Teamwork', 'Problem Solving'],
    applyUrl: job?.applyUrl || job?.applicationUrl || job?.applyLink || 'https://njp.gov.pk',
  };
};

export function JobPortalTab({ profile, lang = 'en' }) {
  const [filterType, setFilterType] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState(JOBS_INTERNSHIPS_DATA);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchJobsData = () => {
    setIsLoading(true);
    setFetchError(null);
    Promise.all([
      fetch('/api/jobs').then(res => res.json()).catch(() => null),
      fetch('/api/applications').then(res => res.json()).catch(() => null),
      fetch('/api/bookmarks').then(res => res.json()).catch(() => null)
    ]).then(([resData, appsData, bmsData]) => {
      if (Array.isArray(resData?.data) && resData.data.length > 0) {
        setJobs(resData.data.map(toJobListing));
      }
      if (Array.isArray(appsData?.data)) {
        setAppliedJobIds(appsData.data.map(a => a.targetId || a.id));
      }
      if (Array.isArray(bmsData?.data)) {
        setSavedJobIds(bmsData.data.map(b => b.id));
      }
    }).catch((e) => {
      setFetchError('Could not load job listings right now. Please try again later.');
    }).finally(() => {
      setTimeout(() => setIsLoading(false), 600);
    });
  };

  useEffect(() => {
    fetchJobsData();
  }, []);

  const listings = useMemo(() => jobs.map(toJobListing), [jobs]);
  const cityOf = (j) => String(j.city || j.location || '').split('/')[0].trim();
  const filtered = listings.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || j.type === filterType;
    const matchesCity = filterCity === 'All' || cityOf(j).toLowerCase() === filterCity.toLowerCase();
    return matchesSearch && matchesType && matchesCity;
  });
  // Dropdown options from the listings themselves
  const typeOptions = useMemo(() => [...new Set(listings.map(j => j.type).filter(Boolean))].sort(), [listings]);
  const cityOptions = useMemo(() => {
    const m = new Map(); listings.forEach(j => { const c = cityOf(j); if (c) m.set(c, (m.get(c) || 0) + 1); });
    return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([c, n]) => ({ value: c, label: c, hint: `${n} ${n === 1 ? 'job' : 'jobs'}` }));
  }, [listings]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = (job) => {
    if (!appliedJobIds.includes(job.id)) {
      setAppliedJobIds(prev => [...prev, job.id]);
      fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: job.id,
          title: job.title,
          targetName: job.company,
          type: 'Job / Internship',
          officialUrl: job.officialUrl
        })
      }).catch(e => console.error(e));
    }
  };

  const handleToggleSave = (job) => {
    if (savedJobIds.includes(job.id)) {
      setSavedJobIds(prev => prev.filter(i => i !== job.id));
      fetch(`/api/bookmarks/${job.id}`, { method: 'DELETE' }).catch(e => console.error(e));
    } else {
      setSavedJobIds(prev => [...prev, job.id]);
      fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          type: 'job',
          title: job.title,
          provider: job.company,
          officialUrl: job.officialUrl
        })
      }).catch(e => console.error(e));
    }
  };

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading job listings">
        <JobListingSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="ns-page-wrapper space-y-6 min-w-0">
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <BriefcaseBusiness className="w-7 h-7" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{jobs.length} Live Opportunities</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                Graduate Job &amp; Internship Opportunities
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Top Tech, Finance &amp; Engineering roles tailored for fresh graduates
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchJobsData}
              className="ns-btn ns-btn-secondary ns-btn-sm flex items-center gap-1.5"
              title="Refresh job listings"
              aria-label="Refresh job listings"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <SearchableSelect className="w-44" ariaLabel="Job type" value={filterType} onChange={setFilterType} options={typeOptions} allLabel="All types" searchPlaceholder="Search type…" />
            <SearchableSelect className="w-48" ariaLabel="City" value={filterCity} onChange={setFilterCity} options={cityOptions} allLabel="All cities" searchPlaceholder="Search city…" />
          </div>
        </div>
      </div>

      <SampleDataNotice show={listings.some(j => j.isSample)} />

      <AnimatePresence mode="wait">
        {fetchError && (
          <motion.div
            key="job-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="ns-alert ns-alert-warning"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">{fetchError}</p>
            </div>
            <button
              onClick={fetchJobsData}
              className="ns-btn ns-btn-secondary ns-btn-sm shrink-0"
              aria-label="Retry loading jobs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          role="searchbox"
          aria-label="Search jobs, internships, companies, or technologies"
          placeholder="Search jobs, internships, companies, or technologies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ns-input pl-11"
        />
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="jobs-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="ns-empty">
              <div className="ns-empty-icon">
                <Briefcase className="w-9 h-9" strokeWidth={1.8} />
              </div>
              <h3 className="ns-empty-title">No matching opportunities found</h3>
              <p className="ns-empty-desc">
                Try broadening your search term, switching the job type filter, or refreshing live listings.
              </p>
              <div className="ns-empty-actions">
                <button onClick={() => { setSearchTerm(''); setFilterType('All'); setFilterCity('All'); }} className="ns-btn ns-btn-secondary ns-btn-sm">
                  Clear Filters
                </button>
                <button onClick={fetchJobsData} className="ns-btn ns-btn-primary ns-btn-sm">
                  <RefreshCw className="w-4 h-4" />
                  Refresh Listings
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="jobs-grid"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } }
            }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0"
          >
            {filtered.map((job, idx) => {
              const isApplied = appliedJobIds.includes(job.id);
              const isSaved = savedJobIds.includes(job.id);

              return (
                <motion.article
                  key={job.id}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut', delay: idx * 0.04 } }
                  }}
                  className="ns-card ns-card-hover p-6 space-y-4 flex flex-col justify-between min-w-0"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <span className="inline-flex ns-badge ns-badge-info">{job.type}</span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight truncate">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 min-w-0">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{job.company}</span>
                          </div>
                          <span className="ns-badge ns-badge-match">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{job.sourceName || 'Pakistan National Career Registry'} • {job.verificationStatus || 'VERIFIED'}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSave(job)}
                        aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
                        aria-pressed={isSaved}
                        className={`p-2 rounded-xl border transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                          isSaved
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-500'
                        }`}
                      >
                        <Bookmark className="w-4.5 h-4.5 fill-current" />
                      </button>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 min-w-0">
                        <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white min-w-0">
                        <DollarSign className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span className="truncate">{job.stipendSalary}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Key Requirements</span>
                      <div className="flex flex-wrap gap-1.5">
                        {job.requirements.slice(0, 5).map((req, reqIdx) => (
                          <span key={reqIdx} className="ns-badge ns-badge-subtle">
                            {req}
                          </span>
                        ))}
                        {job.requirements.length > 5 && (
                          <span className="ns-badge ns-badge-subtle">+{job.requirements.length - 5} more</span>
                        )}
                        {job.requirements.length === 0 && (
                          <span className="ns-badge ns-badge-subtle">See official listing for requirements</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    {job.officialUrl ? (
                      <a
                        href={job.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View official listing for ${job.title}`}
                        className="ns-btn ns-btn-ghost ns-btn-sm inline-flex items-center gap-1.5"
                      >
                        <span>Official Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        Apply before: {job.deadline || 'Rolling basis'}
                      </span>
                    )}

                    <button
                      onClick={() => handleApply(job)}
                      disabled={isApplied}
                      aria-label={isApplied ? `Application submitted for ${job.title}` : `Quick apply to ${job.title} with resume`}
                      className={`ns-btn ns-btn-sm inline-flex items-center gap-1.5 ${
                        isApplied ? 'ns-btn-secondary' : 'ns-btn-primary'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Application Submitted</span>
                        </>
                      ) : (
                        <>
                          <span>Quick Apply with Resume</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
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

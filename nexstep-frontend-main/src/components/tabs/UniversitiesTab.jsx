import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Search, 
  Filter, 
  MapPin, 
  ExternalLink, 
  Layers, 
  Check, 
  X,
  Bookmark,
  Award,
  DollarSign,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  Globe
} from 'lucide-react';
import { UNIVERSITIES_DATA } from '../../data/universitiesData.js';
import { translations } from '../../data/translations.js';
import { tr } from '../../utils/translator.js';
import { SearchableSelect, SampleDataNotice } from '../common/SearchableSelect.jsx';
import { CityMap } from '../career/CityMap.jsx';
import { matchesStream, profileStream } from '../../utils/streamMatch.js';
import { useRestoredValue } from '../../hooks/useRestoredValue.js';
import { trackUsage } from '../../utils/usageTracker.js';

const toUniversity = (university, index) => ({
  ...university,
  id: university?.id ?? `university-${index}`,
  name: university?.name || 'University listing',
  city: university?.city || 'Pakistan',
  province: university?.province || '',
  type: university?.type || 'Recognized',
  hecRankTier: university?.hecRankTier || university?.tier || 'Recognized',
  annualFeePkr: Number(university?.annualFeePkr) || 0,
  lastMeritCutoffPct: Number(university?.lastMeritCutoffPct) || 0,
  websiteUrl: university?.websiteUrl || university?.admissionsUrl || university?.officialWebsite || university?.official_website || university?.official_url || 'https://www.hec.gov.pk/english/universities/pages/recognised.aspx',
  programs: Array.isArray(university?.programs) ? university.programs : [],
  hasHostel: Boolean(university?.hasHostel),
});

export function UniversitiesTab({ profile, lang }) {
  const t = translations[lang] || translations.en;

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useRestoredValue('', 'All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');
  const [maxFee, setMaxFee] = useState(1500000);
  const [allUnis, setAllUnis] = useState(UNIVERSITIES_DATA.map(toUniversity));
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareLimitWarning, setCompareLimitWarning] = useState(false);

  // Load every university once; filters below run instantly in the browser.
  useEffect(() => {
    setFetchError(null);
    fetch('/api/universities?limit=100', { credentials: 'include' })
      .then(res => res.json())
      .then(resData => { if (Array.isArray(resData?.data)) setAllUnis(resData.data.map(toUniversity)); })
      .catch(() => setFetchError('Could not load universities right now. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const studentStream = profileStream(profile);
  const unis = useMemo(() => {
    const base = allUnis.filter(u => {
      if (selectedCity !== 'All' && u.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      if (selectedType !== 'All' && u.type.toLowerCase() !== selectedType.toLowerCase()) return false;
      if (selectedTier !== 'All' && u.hecRankTier.toLowerCase() !== selectedTier.toLowerCase()) return false;
      if (u.annualFeePkr && u.annualFeePkr > maxFee) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || (u.shortName || '').toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q) || (u.programs ?? []).some(p => p.toLowerCase().includes(q));
      }
      return true;
    });
    if (!studentStream) return base;
    const matched = base.filter((u) => matchesStream(`${u.name} ${(u.programs || []).join(' ')} ${u.description || ''}`, studentStream));
    return matched.length ? matched : base;
  }, [allUnis, search, selectedCity, selectedType, selectedTier, maxFee, studentStream]);

  const recommended = useMemo(() => {
    const marks = Number(profile?.marks?.fscPct || profile?.marks?.matricPct || 0);
    const budget = Number(profile?.budgetAnnualPkr || 0);
    const city = String(profile?.city || '').toLowerCase();
    return [...allUnis]
      .filter((u) => !budget || !u.annualFeePkr || u.annualFeePkr <= budget)
      .filter((u) => !marks || !u.lastMeritCutoffPct || marks + 8 >= u.lastMeritCutoffPct)
      .sort((a, b) => (city && a.city.toLowerCase() === city ? -1 : 0) - (city && b.city.toLowerCase() === city ? -1 : 0))
      .slice(0, 3);
  }, [allUnis, profile?.marks?.fscPct, profile?.marks?.matricPct, profile?.budgetAnnualPkr, profile?.city]);

  // Dropdown options come from the data itself (with counts).
  const countBy = (key) => allUnis.reduce((m, u) => { const k = u[key]; if (k) m.set(k, (m.get(k) || 0) + 1); return m; }, new Map());
  const cityOptions = useMemo(() => [...countBy('city')].sort((a, b) => a[0].localeCompare(b[0])).map(([c, n]) => ({ value: c, label: tr(c, lang), hint: `${n} ${n === 1 ? 'university' : 'universities'}` })), [allUnis, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const city = String(profile?.city || '').trim();
    if (!city || !cityOptions.length) return;
    const hit = cityOptions.find((o) => o.value.toLowerCase() === city.toLowerCase());
    if (hit) setSelectedCity(hit.value);
  }, [cityOptions, profile?.city]); // eslint-disable-line react-hooks/exhaustive-deps
  const typeOptions = useMemo(() => [...countBy('type')].map(([c, n]) => ({ value: c, label: tr(c, lang), hint: `${n}` })), [allUnis, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const tierOptions = useMemo(() => [...countBy('hecRankTier')].map(([c, n]) => ({ value: c, label: c, hint: `${n}` })), [allUnis]); // eslint-disable-line react-hooks/exhaustive-deps
  const uniOptions = useMemo(() => allUnis.map(u => ({ value: u.id, label: u.name, hint: [u.city, u.type, u.annualFeePkr ? `PKR ${(u.annualFeePkr / 1000).toFixed(0)}k/yr` : null].filter(Boolean).join(' · ') })), [allUnis]);

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

  const handleBookmark = (uni) => {
    const isBookmarked = bookmarkedIds.includes(uni.id);
    if (isBookmarked) {
      setBookmarkedIds(prev => prev.filter(id => id !== uni.id));
      fetch(`/api/bookmarks/${uni.id}`, { method: 'DELETE' }).catch(e => console.error(e));
    } else {
      setBookmarkedIds(prev => [...prev, uni.id]);
      trackUsage('university_view', uni.id, uni.name);
      fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uni.id,
          type: 'university',
          title: uni.name,
          city: uni.city,
          officialUrl: uni.websiteUrl
        })
      }).catch(e => console.error(e));
    }
  };

  const toggleCompare = (uni) => {
    if (compareList.some(item => item.id === uni.id)) {
      setCompareList(compareList.filter(item => item.id !== uni.id));
      setCompareLimitWarning(false);
    } else {
      if (compareList.length < 3) {
        trackUsage('university_view', uni.id, uni.name);
        setCompareList([...compareList, uni]);
        setCompareLimitWarning(false);
      } else {
        setCompareLimitWarning(true);
        setTimeout(() => setCompareLimitWarning(false), 4000);
      }
    }
  };

  const [viewMode, setViewMode] = useState('grid');

  return (
    <div className="ns-page-wrapper space-y-6 min-w-0">
      <div className="relative overflow-hidden ns-card p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl ns-accent-glow-right" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="relative z-10 space-y-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                <GraduationCap className="w-7 h-7" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>HEC Recognized • {unis.length} Institutes</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {t.universities.title}
                </h1>
                {studentStream && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Showing programmes related to {studentStream}</p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Filter Pakistani universities by HEC rank tier, annual fee budget, city, and offered programs
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700" role="tablist" aria-label="University view mode">
                <button
                  role="tab"
                  aria-selected={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Grid View
                </button>
                <button
                  role="tab"
                  aria-selected={viewMode === 'map'}
                  onClick={() => setViewMode('map')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                    viewMode === 'map'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>City Map</span>
                </button>
              </div>

              {compareList.length > 0 && (
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="ns-btn ns-btn-primary ns-btn-sm inline-flex items-center gap-1.5"
                  aria-label={`Compare ${compareList.length} selected universities`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{t.universities.compareBtn} ({compareList.length})</span>
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {compareLimitWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="ns-alert ns-alert-warning">
                  <Layers className="w-5 h-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">
                      You can compare up to <strong>3 universities</strong> at a time. Remove one from your selection to add another.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 min-w-0">
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                role="searchbox"
                aria-label="Search universities by name, short code, city or program"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.universities.searchPlaceholder}
                className="ns-input pl-11"
              />
            </div>

            <div>
              <label className="ns-input-label sr-only" htmlFor="uni-city-filter">City Filter</label>
              <SearchableSelect id="uni-city-filter" ariaLabel="Filter by city" value={selectedCity} onChange={setSelectedCity}
                options={cityOptions} allLabel={tr("All Cities", lang)} searchPlaceholder="Search city…" />
            </div>

            <div>
              <label className="ns-input-label sr-only" htmlFor="uni-type-filter">Sector Filter</label>
              <SearchableSelect id="uni-type-filter" ariaLabel="Filter by sector type" value={selectedType} onChange={setSelectedType}
                options={typeOptions} allLabel={tr("All Sectors", lang)} searchPlaceholder="Search sector…" />
            </div>

            <div>
              <label className="ns-input-label sr-only" htmlFor="uni-tier-filter">HEC Tier Filter</label>
              <SearchableSelect id="uni-tier-filter" ariaLabel="Filter by HEC rank tier" value={selectedTier} onChange={setSelectedTier}
                options={tierOptions} allLabel={tr("All Tiers", lang)} searchPlaceholder="Search tier…" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5" htmlFor="uni-compare-pick">Compare universities (up to 3)</label>
              <SearchableSelect id="uni-compare-pick" value="" options={uniOptions.filter(o => !compareList.some(c => c.id === o.value))}
                onChange={(id) => { const u = allUnis.find(x => x.id === id); if (u) toggleCompare(u); }}
                placeholder={compareList.length ? `${compareList.length} selected — add another…` : 'Pick a university to compare…'} searchPlaceholder="Search by name, city…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5" htmlFor="uni-jump">Find a university</label>
              <SearchableSelect id="uni-jump" value="" options={uniOptions}
                onChange={(id) => { const u = allUnis.find(x => x.id === id); if (u) { setSelectedCity('All'); setSelectedType('All'); setSelectedTier('All'); setMaxFee(2000000); setSearch(u.name); } }}
                placeholder={`Search all ${allUnis.length} universities…`} searchPlaceholder="Type a university name…" />
            </div>
          </div>
          <SampleDataNotice show={allUnis.some(u => u.isSample)} lang={lang} />

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-2 min-w-0">
              <DollarSign className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="truncate">
                {t.universities.filterFee}: <strong className="text-emerald-700 dark:text-emerald-400 font-black">PKR {maxFee.toLocaleString()}</strong>
              </span>
            </div>
            <input
              type="range"
              aria-label="Maximum annual fee budget"
              min={40000}
              max={2000000}
              step={50000}
              value={maxFee}
              onChange={(e) => setMaxFee(parseInt(e.target.value, 10))}
              className="w-full max-w-xs accent-emerald-600 h-2"
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {fetchError && (
          <motion.div
            key="uni-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="ns-alert ns-alert-info"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{fetchError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'map' && (
        <CityMap universities={unis} studentCity={profile?.city || ''} lang={lang} />
      )}

      {viewMode === 'grid' && <AnimatePresence mode="wait">
        {loading && allUnis.length === 0 ? (
          <div key="uni-loading" className="py-16 text-center text-sm text-slate-500">Loading universities…</div>
        ) : unis.length === 0 ? (
          <motion.div
            key="uni-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32 }}
          >
            <div className="ns-empty">
              <div className="ns-empty-icon">
                <Building2 className="w-9 h-9" strokeWidth={1.8} />
              </div>
              <h3 className="ns-empty-title">No universities match your filters</h3>
              <p className="ns-empty-desc">
                Try expanding your budget slider, selecting a different city, or clearing the search box.
              </p>
              <div className="ns-empty-actions">
                <button
                  onClick={() => { setSearch(''); setSelectedCity('All'); setSelectedType('All'); setSelectedTier('All'); setMaxFee(1500000); }}
                  className="ns-btn ns-btn-secondary ns-btn-sm"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="uni-grid"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0"
          >
            {recommended.length > 0 && (
              <div className="md:col-span-2 lg:col-span-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-900">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Matched to your marks, budget, and city</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{recommended.map((u) => `${u.name} (${u.city})`).join(' · ')}</p>
              </div>
            )}
            {unis.map(toUniversity).map((uni, idx) => {
              const isSelectedForCompare = compareList.some(item => item.id === uni.id);
              const isBookmarked = bookmarkedIds.includes(uni.id);

              return (
                <motion.article
                  key={uni.id}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut', delay: idx * 0.035 } }
                  }}
                  className="ns-card ns-card-hover p-5 flex flex-col justify-between space-y-4 min-w-0"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white leading-snug truncate">{uni.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 min-w-0">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate">{uni.city}{uni.province ? `, ${uni.province}` : ''}</span>
                          </div>
                          <span className="ns-badge ns-badge-match">
                            <Check className="w-3 h-3 shrink-0" />
                            <span className="truncate">{uni.sourceName || 'HEC Pakistan Recognized'} • {uni.isSample ? 'SAMPLE' : 'VERIFIED'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleBookmark(uni)}
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
                        <span className={`ns-badge ${uni.type === 'Public' ? 'ns-badge-info' : 'ns-badge-ai'}`}>
                          {uni.type}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider block">
                          {t.universities?.meritCutoff || 'Merit Cutoff'}
                        </span>
                        <strong className="text-emerald-700 dark:text-emerald-400 text-base">{uni.lastMeritCutoffPct}%</strong>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider block">
                          {t.universities?.annualFee || 'Annual Fee'}
                        </span>
                        <strong className="text-slate-900 dark:text-white text-base">PKR {(uni.annualFeePkr / 1000).toFixed(0)}k/yr</strong>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider block">HEC ranking</span>
                        <strong className="text-slate-900 dark:text-white text-sm">{uni.hecRankTier}</strong>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider block">Hostel</span>
                        <strong className="text-slate-900 dark:text-white text-sm">{uni.hasHostel ? 'Available' : 'Not listed'}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Popular Programs</div>
                      <div className="flex flex-wrap gap-1.5">
                        {uni.programs.slice(0, 4).map((prog, progIdx) => (
                          <span key={progIdx} className="ns-badge ns-badge-subtle truncate">
                            {prog}
                          </span>
                        ))}
                        {uni.programs.length > 4 && (
                          <span className="ns-badge ns-badge-subtle">+{uni.programs.length - 4}</span>
                        )}
                        {uni.programs.length === 0 && (
                          <span className="ns-badge ns-badge-subtle">See official portal for programs</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => toggleCompare(uni)}
                      aria-pressed={isSelectedForCompare}
                      aria-label={isSelectedForCompare ? `Remove ${uni.name} from compare list` : `Add ${uni.name} to compare list`}
                      className={`ns-btn ns-btn-sm inline-flex items-center gap-1.5 ${
                        isSelectedForCompare ? 'ns-btn-primary' : 'ns-btn-secondary'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isSelectedForCompare ? 'Selected' : 'Compare'}</span>
                    </button>

                    <a
                      href={uni.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackUsage('university_view', uni.id, uni.name)}
                      aria-label={`Visit ${uni.name} official admissions portal`}
                      className="ns-btn ns-btn-ghost ns-btn-sm inline-flex items-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>}

      <AnimatePresence>
        {showCompareModal && (
          <motion.div
            key="compare-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCompareModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="ns-card max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
            >
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                    <Layers className="w-3.5 h-3.5" />
                    Side-by-Side Comparison
                  </div>
                  <h2 id="compare-modal-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    University Comparison
                  </h2>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  aria-label="Close comparison modal"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                {compareList.map((uni) => (
                  <div key={uni.id} className="ns-card p-4 space-y-3 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{uni.name}</h3>
                    <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">City:</span><span className="font-semibold truncate">{uni.city}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">Sector:</span><span className="font-semibold">{uni.type}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">HEC Rank:</span><span className="font-semibold truncate">{uni.hecRankTier}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">Annual Fee:</span><span className="font-bold truncate">PKR {uni.annualFeePkr.toLocaleString()}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">Merit Cutoff:</span><span className="font-bold text-emerald-700 dark:text-emerald-400">{uni.lastMeritCutoffPct}%</span></div>
                      <div className="flex justify-between gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">Hostel:</span><span className="font-semibold">{uni.hasHostel ? 'Available' : 'No'}</span></div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider block">Programs Offered</span>
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 text-sm space-y-0.5 pl-1">
                        {uni.programs.map((p, pIdx) => (
                          <li key={pIdx} className="truncate">{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

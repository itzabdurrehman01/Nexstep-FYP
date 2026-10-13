import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { ArrowRightLeft as ArrowRightLeftIcon } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  GraduationCap, 
  ArrowRightLeft, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Clock, 
  ShieldCheck, 
  Brain, 
  Code2, 
  Layers, 
  Download,
  Zap,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { tr } from '../../utils/translator.js';
import { CAREERS_DATA } from '../../data/careersData.js';
import { SearchableSelect } from '../common/SearchableSelect.jsx';

/**
 * CAREER_COMPARISON_DATA — derived from the canonical CAREERS_DATA.
 *
 * Only careers that have comparison chart fields (shortName, color, skillsRadar
 * etc.) are included. car-6 (Pharmacy) and car-8 (TEVTA) are excluded because
 * they intentionally don't have comparison metrics yet.
 *
 * Field mapping:
 *   avgStartingSalaryPkr → avgSalaryPkrMonth   (alias for backward compat)
 *   avgSeniorSalaryPkr   → avgSalaryPkrSenior  (alias for backward compat)
 *   All other comparison fields come directly from CAREERS_DATA.
 */
export const CAREER_COMPARISON_DATA = CAREERS_DATA
  .filter(c => c.shortName) // only careers with comparison chart fields
  .map(c => ({
    // stable identity
    id:           c.id,
    title:        c.title,
    shortName:    c.shortName,
    category:     c.category,
    color:        c.color,
    bgColor:      c.bgColor,
    streamRequired: c.streamRequired,

    // salary — canonical names + legacy aliases used by CareerComparisonTool
    avgStartingSalaryPkr: c.avgSalaryPkrMonth,   // alias
    avgMidSalaryPkr:      c.avgMidSalaryPkr,
    avgSeniorSalaryPkr:   c.avgSalaryPkrSenior,  // alias
    avgLeadSalaryPkr:     c.avgLeadSalaryPkr,

    // chart metrics
    remoteWorkPct:        c.remoteWorkPct,
    fiveYrGrowthPct:      c.fiveYrGrowthPct,
    automationResistance: c.automationResistance,
    globalMobilityScore:  c.globalMobilityScore,
    entryTestDifficulty:  c.entryTestDifficulty,
    tuitionCostPkr:       c.tuitionCostPkr,
    avgTimeRoIYrs:        c.avgTimeRoIYrs,
    workLifeBalanceScore: c.workLifeBalanceScore,
    skillsRadar:          c.skillsRadar,
    technicalSkills:      c.technicalSkills,
    softSkills:           c.softSkills,
    pros:                 c.pros,
    cons:                 c.cons,
  }));

export function CareerComparisonTool(props) {
  if (CAREER_COMPARISON_DATA.length < 2) {
    return (
      <EmptyState
        icon={ArrowRightLeftIcon}
        title="No careers to compare yet"
        message="Career comparison needs at least two careers with salary and growth data. Careers will appear here once they are added."
      />
    );
  }
  return <CareerComparisonToolInner {...props} />;
}

function CareerComparisonToolInner({ lang = 'en' }) {
  const [careerAId, setCareerAId] = useState("car-1"); // Software & AI Engineering
  const [careerBId, setCareerBId] = useState("car-2"); // Medicine & Surgery
  const [currencyUSD, setCurrencyUSD] = useState(false);
  const [activeTab, setActiveTab] = useState("charts"); // 'charts' | 'matrix' | 'aiVerdict'
  const [aiVerdict, setAiVerdict] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Selected Career Objects
  const careerA = useMemo(() => {
    return CAREER_COMPARISON_DATA.find(c => c.id === careerAId) || CAREER_COMPARISON_DATA[0];
  }, [careerAId]);

  const careerB = useMemo(() => {
    return CAREER_COMPARISON_DATA.find(c => c.id === careerBId) || CAREER_COMPARISON_DATA[1];
  }, [careerBId]);

  // Swap Careers Handler
  const handleSwap = () => {
    const temp = careerAId;
    setCareerAId(careerBId);
    setCareerBId(temp);
  };

  // Convert PKR to USD (Approx Rate 1 USD = 280 PKR)
  const formatSalary = (pkrVal) => {
    if (currencyUSD) {
      const annualUsd = Math.round((pkrVal * 12) / 280);
      return `$${annualUsd.toLocaleString()} / yr`;
    }
    return `PKR ${pkrVal.toLocaleString()} / mo`;
  };

  // Preset Pair Selection
  const presets = [
    { label: 'AI Engineering vs Medicine', a: 'car-1', b: 'car-2' },
    { label: 'Data Science vs CA/Finance', a: 'car-3', b: 'car-5' },
    { label: 'Software vs UI/UX Design', a: 'car-1', b: 'car-7' },
    { label: 'Electrical Eng. vs Medicine', a: 'car-4', b: 'car-2' }
  ];

  // Recharts Salary Data
  const salaryChartData = [
    {
      stage: 'Entry (0-2 yrs)',
      [careerA.shortName]: currencyUSD ? Math.round((careerA.avgStartingSalaryPkr * 12) / 280) : careerA.avgStartingSalaryPkr,
      [careerB.shortName]: currencyUSD ? Math.round((careerB.avgStartingSalaryPkr * 12) / 280) : careerB.avgStartingSalaryPkr,
    },
    {
      stage: 'Mid (3-5 yrs)',
      [careerA.shortName]: currencyUSD ? Math.round((careerA.avgMidSalaryPkr * 12) / 280) : careerA.avgMidSalaryPkr,
      [careerB.shortName]: currencyUSD ? Math.round((careerB.avgMidSalaryPkr * 12) / 280) : careerB.avgMidSalaryPkr,
    },
    {
      stage: 'Senior (6-10 yrs)',
      [careerA.shortName]: currencyUSD ? Math.round((careerA.avgSeniorSalaryPkr * 12) / 280) : careerA.avgSeniorSalaryPkr,
      [careerB.shortName]: currencyUSD ? Math.round((careerB.avgSeniorSalaryPkr * 12) / 280) : careerB.avgSeniorSalaryPkr,
    },
    {
      stage: 'Executive / Lead',
      [careerA.shortName]: currencyUSD ? Math.round((careerA.avgLeadSalaryPkr * 12) / 280) : careerA.avgLeadSalaryPkr,
      [careerB.shortName]: currencyUSD ? Math.round((careerB.avgLeadSalaryPkr * 12) / 280) : careerB.avgLeadSalaryPkr,
    }
  ];

  // Recharts Combined Radar Skill Data
  const radarChartData = useMemo(() => {
    return careerA.skillsRadar.map((item, idx) => {
      const matchB = careerB.skillsRadar[idx] || { score: 50 };
      return {
        subject: item.subject,
        [careerA.shortName]: item.score,
        [careerB.shortName]: matchB.score,
      };
    });
  }, [careerA, careerB]);

  const [aiError, setAiError] = useState(null);
  const { user, openSignIn } = useAuth();

  // AI Verdict — calls /api/career/explain for BOTH careers, combines results
  const handleGenerateAiVerdict = async () => {
    if (!user) {
      setAiError('Please sign in to generate an AI verdict.');
      openSignIn();
      return;
    }
    setIsGeneratingAi(true);
    setAiError(null);
    setAiVerdict(null);

    try {
      // Run both career explanations in parallel
      const [resA, resB] = await Promise.all([
        fetch('/api/career/explain', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            careerId:    careerA.id,
            careerTitle: careerA.title,
            matchScore:  careerA.avgStartingSalaryPkr ? 75 : 70,
            factors:     {},
            explanation: {},
            profile:     null,
          }),
        }).then(r => r.json()),
        fetch('/api/career/explain', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            careerId:    careerB.id,
            careerTitle: careerB.title,
            matchScore:  careerB.avgStartingSalaryPkr ? 75 : 70,
            factors:     {},
            explanation: {},
            profile:     null,
          }),
        }).then(r => r.json()),
      ]);

      setAiVerdict({
        summary: `Comparing ${careerA.title} and ${careerB.title} reveals two distinct career vectors tailored for different strengths and contexts.`,
        idealForA:       resA.whyThisCareer     || `${careerA.title} suits students with strong analytical and technical interests.`,
        pathAHighlights: resA.nextSteps          || [`Complete relevant entry tests`, `Build core technical skills`, `Apply to top universities`],
        idealForB:       resB.whyThisCareer     || `${careerB.title} suits students with strong interpersonal and scientific aptitude.`,
        pathBHighlights: resB.nextSteps          || [`Prepare for admission requirements`, `Develop specialised knowledge`, `Build practical experience`],
        alternativesA:   resA.alternativeCareers || [],
        alternativesB:   resB.alternativeCareers || [],
        timeA:           resA.estimatedTimeToEntry || '',
        timeB:           resB.estimatedTimeToEntry || '',
        pakistanA:       resA.pakistanSpecificAdvice || '',
        pakistanB:       resB.pakistanSpecificAdvice || '',
      });
      setActiveTab('aiVerdict');
    } catch (err) {
      setAiError('AI comparison failed. Please ensure you are logged in and try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="ns-hero text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Interactive Career Match Engine
            </span>

            {/* Currency Switcher Toggle */}
            <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-300 px-2">Display Salary In:</span>
              <button
                onClick={() => setCurrencyUSD(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  !currencyUSD ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                PKR / Month
              </button>
              <button
                onClick={() => setCurrencyUSD(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currencyUSD ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD / Year
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Career Comparison & Growth Visualizer
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Compare salary trajectories, technical skill requirements, market growth projections, and remote work potential side-by-side to make data-backed academic decisions.
            </p>
          </div>

          {/* Quick Presets Pills */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-bold mr-1">Popular Comparisons:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setCareerAId(p.a);
                  setCareerBId(p.b);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  careerAId === p.a && careerBId === p.b
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dual Selector & Snapshot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Career Path A Dropdown Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/40 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              Career Path A
            </span>
            <span className="text-xs font-bold text-slate-400">{careerA.category}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              Select Primary Career:
            </label>
            <SearchableSelect ariaLabel="Career" value={careerAId} onChange={setCareerAId}
              options={CAREER_COMPARISON_DATA.filter((c) => c.id !== careerBId).map((c) => ({ value: c.id, label: c.title, hint: c.category }))}
              searchPlaceholder="Search careers…" />
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Starting Salary:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                {formatSalary(careerA.avgStartingSalaryPkr)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">5-Yr Market Demand:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                +{careerA.fiveYrGrowthPct}% Growth
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Remote Work Potential:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                {careerA.remoteWorkPct}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Required Stream:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right text-[11px]">
                {careerA.streamRequired}
              </span>
            </div>
          </div>
        </div>

        {/* Swap Control Center */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center py-2">
          <button
            onClick={handleSwap}
            className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-emerald-400 border border-slate-700 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer group"
            title="Swap Career A and Career B"
          >
            <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
          </button>
          <span className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-widest">VS</span>
        </div>

        {/* Career Path B Dropdown Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/40 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider">
              Career Path B
            </span>
            <span className="text-xs font-bold text-slate-400">{careerB.category}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              Select Secondary Career:
            </label>
            <SearchableSelect ariaLabel="Career" value={careerBId} onChange={setCareerBId}
              options={CAREER_COMPARISON_DATA.filter((c) => c.id !== careerAId).map((c) => ({ value: c.id, label: c.title, hint: c.category }))}
              searchPlaceholder="Search careers…" />
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Starting Salary:</span>
              <span className="font-extrabold text-amber-700 dark:text-amber-400">
                {formatSalary(careerB.avgStartingSalaryPkr)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">5-Yr Market Demand:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                +{careerB.fiveYrGrowthPct}% Growth
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Remote Work Potential:</span>
              <span className="font-extrabold text-amber-700 dark:text-amber-400">
                {careerB.remoteWorkPct}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60 dark:border-amber-900/60">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Required Stream:</span>
              <span className="font-bold text-slate-900 dark:text-white text-right text-[11px]">
                {careerB.streamRequired}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'charts'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Interactive Data Charts</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Side-by-Side Matrix & Skills</span>
          </button>

          <button
            onClick={handleGenerateAiVerdict}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'aiVerdict'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI Advisor Recommendation</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE CHARTS */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Chart 1: Salary Progression Bar Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <span>Salary Trajectory Comparison</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comparing estimated monthly/annual earnings from entry level to senior executive roles
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  {careerA.shortName}
                </span>
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  {careerB.shortName}
                </span>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryChartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickFormatter={(val) => currencyUSD ? `$${val / 1000}k` : `${val / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [currencyUSD ? `$${value.toLocaleString()}` : `PKR ${value.toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', color: '#fff', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey={careerA.shortName} fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey={careerB.shortName} fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid of 2 Secondary Charts: Radar Skills & Market Index */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Radar Skill Profile */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-500" />
                  <span>Competency & Skill Radar</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comparing required strengths across 6 core technical & intellectual dimensions
                </p>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name={careerA.shortName} dataKey={careerA.shortName} stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                    <Radar name={careerB.shortName} dataKey={careerB.shortName} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Market Growth & Automation Resilience Metrics */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-500" />
                  <span>Market Growth & AI Resilience Index</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Key indicators evaluating future stability, automation risk, and global mobility
                </p>
              </div>

              {/* Progress Bars Breakdown */}
              <div className="space-y-4">
                {/* 5-Year Job Growth */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">5-Year Job Demand Growth</span>
                    <span className="text-slate-900 dark:text-white">
                      {careerA.shortName}: <strong className="text-emerald-600">+{careerA.fiveYrGrowthPct}%</strong> vs {careerB.shortName}: <strong className="text-amber-600">+{careerB.fiveYrGrowthPct}%</strong>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${careerA.fiveYrGrowthPct * 2}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${careerB.fiveYrGrowthPct * 2}%` }} className="bg-amber-500 h-full opacity-60" />
                  </div>
                </div>

                {/* Remote Work Potential */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">Remote Work & Freelancing Index</span>
                    <span className="text-slate-900 dark:text-white">
                      {careerA.shortName}: <strong className="text-emerald-600">{careerA.remoteWorkPct}%</strong> vs {careerB.shortName}: <strong className="text-amber-600">{careerB.remoteWorkPct}%</strong>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${careerA.remoteWorkPct}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${careerB.remoteWorkPct}%` }} className="bg-amber-500 h-full opacity-60" />
                  </div>
                </div>

                {/* AI Automation Resistance */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">AI Replacement Resistance</span>
                    <span className="text-slate-900 dark:text-white">
                      {careerA.shortName}: <strong className="text-emerald-600">{careerA.automationResistance}%</strong> vs {careerB.shortName}: <strong className="text-amber-600">{careerB.automationResistance}%</strong>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${careerA.automationResistance}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${careerB.automationResistance}%` }} className="bg-amber-500 h-full opacity-60" />
                  </div>
                </div>

                {/* Global Migration Ease */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">Overseas Visa & Migration Rating</span>
                    <span className="text-slate-900 dark:text-white">
                      {careerA.shortName}: <strong className="text-emerald-600">{careerA.globalMobilityScore}/100</strong> vs {careerB.shortName}: <strong className="text-amber-600">{careerB.globalMobilityScore}/100</strong>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${careerA.globalMobilityScore}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${careerB.globalMobilityScore}%` }} className="bg-amber-500 h-full opacity-60" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIDE-BY-SIDE MATRIX & SKILLS */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Detailed Metric Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 overflow-x-auto">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="w-5 h-5 text-amber-500" />
              <span>Full Attribute Comparison Matrix</span>
            </h3>

            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="p-3 w-1/3">Feature / Parameter</th>
                  <th className="p-3 w-1/3 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl">
                    {careerA.title}
                  </th>
                  <th className="p-3 w-1/3 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 rounded-t-xl">
                    {careerB.title}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Required FSc / Stream</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-emerald-50/20 dark:bg-emerald-950/10">{careerA.streamRequired}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-amber-50/20 dark:bg-amber-950/10">{careerB.streamRequired}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Starting Monthly Salary (PKR)</td>
                  <td className="p-3 font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{formatSalary(careerA.avgStartingSalaryPkr)}</td>
                  <td className="p-3 font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">{formatSalary(careerB.avgStartingSalaryPkr)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Senior Level Salary (PKR)</td>
                  <td className="p-3 font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{formatSalary(careerA.avgSeniorSalaryPkr)}</td>
                  <td className="p-3 font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">{formatSalary(careerB.avgSeniorSalaryPkr)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Avg Tuition Cost (4-5 Yrs)</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-emerald-50/20 dark:bg-emerald-950/10">PKR {careerA.tuitionCostPkr}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-amber-50/20 dark:bg-amber-950/10">PKR {careerB.tuitionCostPkr}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Degree Time-to-ROI</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-emerald-50/20 dark:bg-emerald-950/10">{careerA.avgTimeRoIYrs} Years</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-amber-50/20 dark:bg-amber-950/10">{careerB.avgTimeRoIYrs} Years</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Work-Life Balance Rating</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-emerald-50/20 dark:bg-emerald-950/10">{careerA.workLifeBalanceScore} / 10</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white bg-amber-50/20 dark:bg-amber-950/10">{careerB.workLifeBalanceScore} / 10</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Remote & USD Earning</td>
                  <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{careerA.remoteWorkPct}% Flexibility</td>
                  <td className="p-3 font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">{careerB.remoteWorkPct}% Flexibility</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Technical Skills & Tools Pill Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skills Path A */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-500/30 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-sm">
                <Code2 className="w-5 h-5" />
                <span>Core Technical Tools: {careerA.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {careerA.technicalSkills.map((sk, i) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    {sk}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-500">Key Advantages:</span>
                <ul className="space-y-1.5">
                  {careerA.pros.map((p, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Skills Path B */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-500/30 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 font-extrabold text-sm">
                <Code2 className="w-5 h-5" />
                <span>Core Technical Tools: {careerB.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {careerB.technicalSkills.map((sk, i) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-500" />
                    {sk}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-500">Key Advantages:</span>
                <ul className="space-y-1.5">
                  {careerB.pros.map((p, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI ADVISOR VERDICT */}
      {activeTab === 'aiVerdict' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Gemini AI Career Advisor Synthesis
              </h2>
              <p className="text-xs text-slate-500">
                Personalized decision framework analyzing your academic fit between {careerA.title} and {careerB.title}
              </p>
            </div>
          </div>

          {isGeneratingAi ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Synthesizing career comparison using Gemini AI…</p>
            </div>
          ) : aiError ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{aiError}</p>
              <button onClick={handleGenerateAiVerdict}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer">
                Retry
              </button>
            </div>
          ) : aiVerdict ? (
            <div className="space-y-6">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                {aiVerdict.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Path A Fit */}
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Choose {careerA.title} If:</span>
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {aiVerdict.idealForA}
                  </p>
                  <ul className="space-y-1.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-900">
                    {aiVerdict.pathAHighlights.map((h, idx) => (
                      <li key={idx} className="text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2 font-medium">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Path B Fit */}
                <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3">
                  <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Choose {careerB.title} If:</span>
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {aiVerdict.idealForB}
                  </p>
                  <ul className="space-y-1.5 pt-2 border-t border-amber-200/80 dark:border-amber-900">
                    {aiVerdict.pathBHighlights.map((h, idx) => (
                      <li key={idx} className="text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2 font-medium">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default CareerComparisonTool;

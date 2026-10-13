import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Compass, 
  Bot, 
  ArrowRightLeft, 
  GraduationCap, 
  FileText, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Play, 
  HelpCircle, 
  Zap, 
  Award,
  Mic,
  TrendingUp,
  Building2,
  Sliders
} from 'lucide-react';
import { translations } from '../../data/translations.js';

export function GuidedTourModal({ isOpen, onClose, onNavigateTab, lang = 'en' }) {
  const t = translations[lang] || translations.en;
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps = [
    {
      id: 'welcome',
      tabId: 'dashboard',
      title: 'Welcome to NexStep AI',
      subtitle: 'Pakistan\'s Premier AI Career & Education Guidance Portal',
      icon: Compass,
      color: 'bg-emerald-600 ',
      badge: 'Getting Started',
      description: 'NexStep AI empowers Pakistani students after Grade 8, Matric, FSc, and Graduation with personalized career roadmaps, university matchers, and job market intelligence.',
      keyFeatures: [
        'Tailored guidance for Pre-Medical, Pre-Engineering, ICS & Humanities',
        '120+ Pakistani Universities & Merit Calculator',
        '30+ AI Tools, Skill Gap Analyzers & Scholarship Trackers'
      ],
      actionLabel: 'Explore Dashboard'
    },
    {
      id: 'aiCounselor',
      tabId: 'voiceAssistant',
      title: 'Bilingual AI Voice Assistant & Counselor',
      subtitle: 'Conversational Career Guidance in English & Urdu',
      icon: Mic,
      color: 'bg-emerald-600 ',
      badge: 'Gemini 3.6 AI',
      description: 'Speak or text naturally with NexStep AI in both English and Urdu (اردو). Get instant advice on entry tests (MDCAT, ECAT, NUST), subject selection, and career prospects with live speech synthesis.',
      keyFeatures: [
        'Web Speech API with live audio waveform spectrum visualizer',
        'Bilingual Gemini 3.6 Flash reasoning model',
        'Hands-free continuous voice counseling mode'
      ],
      actionLabel: 'Try Voice Assistant'
    },
    {
      id: 'careerCompare',
      tabId: 'careerComparison',
      title: 'Interactive Career Comparison Tool',
      subtitle: 'Side-by-Side Salary, Skill & Growth Analysis',
      icon: ArrowRightLeft,
      color: 'bg-emerald-700 ',
      badge: 'Visual Analytics',
      description: 'Compare any two career fields side-by-side! Analyze starting monthly salaries in PKR, top hiring companies in Pakistan, required skill matrix overlaps, and 5-year growth projections.',
      keyFeatures: [
        'Radar chart skill overlap comparison',
        'Monthly starting salary trajectories in PKR',
        'Demand level ratings & top Pakistani hiring hubs'
      ],
      actionLabel: 'Compare Careers'
    },
    {
      id: 'fscStream',
      tabId: 'fscMapper',
      title: 'FSc Stream & University Matcher',
      subtitle: 'From Matric Group to University Admissions',
      icon: GraduationCap,
      color: 'bg-emerald-600 ',
      badge: 'Academic Pathways',
      description: 'Discover every university degree unlocked by your FSc or ICS stream. Calculate aggregate scores, view last year cutoff percentages, and explore alternative career pivots.',
      keyFeatures: [
        'Pre-Medical to IT / CS conversion eligibility rules',
        'NUST, FAST, LUMS, GIKI, NUST, UET & AKU merit thresholds',
        'Scholarships & financial aid eligibility checkers'
      ],
      actionLabel: 'View Stream Mapper'
    },
    {
      id: 'resumeAts',
      tabId: 'resume',
      title: 'AI Resume ATS & Mock Interview',
      subtitle: 'Job-Ready Preparation for Pakistani Students',
      icon: FileText,
      color: 'bg-emerald-600 ',
      badge: 'Career Readiness',
      description: 'Upload your CV for instant ATS compatibility scoring, keyword gap recommendations, and practice simulated voice interviews tailored to tech, medical, and business roles in Pakistan.',
      keyFeatures: [
        'Real-time ATS score out of 100 with improvement tips',
        'Role-specific AI Mock Interview with real-time feedback',
        'TEVTA, NAVTTC & Google certification recommendations'
      ],
      actionLabel: 'Check Resume ATS'
    },
    {
      id: 'quickLauncher',
      tabId: 'dashboard',
      title: 'Command Palette & Mobile Quick Dock',
      subtitle: 'Instant Access to All 30 Portal Modules',
      icon: Search,
      color: 'ns-hero ',
      badge: 'Pro Navigation',
      description: 'Press Ctrl + K anywhere to open the global Command Palette search, or use the mobile bottom navigation dock with simulated haptic tactile feedback.',
      keyFeatures: [
        'Global shortcut (Ctrl+K or Cmd+K) for lightning search',
        'Tactile haptic & sound simulation on mobile bottom dock',
        'Dark Mode & Urdu language switchers'
      ],
      actionLabel: 'Finish Tour'
    }
  ];

  const step = tourSteps[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('nexstep_guided_tour_completed', 'true');
    onClose();
  };

  const handleTryFeature = () => {
    if (step.tabId && onNavigateTab) {
      onNavigateTab(step.tabId);
    }
    handleNext();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl max-h-[calc(100dvh-2rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Top Decorative Header Banner */}
          <div className="relative p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-3">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  {step.badge}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Step {currentStep + 1} of {tourSteps.length}
                </span>
              </div>

              <button
                onClick={handleComplete}
                className="ns-icon-btn"
                title="Skip Guided Tour"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 relative z-10 pt-1">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <StepIcon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-tight">
                  {step.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {step.subtitle}
                </p>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full bg-emerald-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {step.description}
            </p>

            {/* Highlights List */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                Key Highlights
              </h4>
              <ul className="space-y-2">
                {step.keyFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Step Indicators */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {tourSteps.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? 'w-8 bg-emerald-600 dark:bg-emerald-400'
                      : 'w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                  }`}
                  title={s.title}
                />
              ))}
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {step.tabId && (
                <button
                  onClick={handleTryFeature}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>{step.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default GuidedTourModal;

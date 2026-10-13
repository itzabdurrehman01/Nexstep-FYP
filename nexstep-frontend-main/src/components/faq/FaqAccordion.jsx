import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Sparkles, 
  GraduationCap, 
  Award, 
  DollarSign, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  Layers, 
  SlidersHorizontal,
  ArrowRight,
  Send,
  Zap,
  BookOpen,
  Briefcase
} from 'lucide-react';
import { tr } from '../../utils/translator.js';

export function FaqAccordion({ lang = 'en', onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openIndex, setOpenIndex] = useState(0); // Open first by default
  const [openIndices, setOpenIndices] = useState([0]); // Set for multi-open or expand all
  const [feedbackState, setFeedbackState] = useState({});

  const categories = [
    { id: 'all', label: 'All Questions', icon: Layers },
    { id: 'ai', label: 'AI Intelligence & Engine', icon: Sparkles },
    { id: 'academics', label: 'Academic Merit & Streams', icon: GraduationCap },
    { id: 'scholarships', label: 'Scholarships & Grants', icon: Award },
    { id: 'pricing', label: 'Subscriptions & Pricing', icon: DollarSign },
    { id: 'career', label: 'Career Roadmaps & ATS', icon: Briefcase }
  ];

  const faqData = [
    {
      id: 1,
      category: 'ai',
      question: 'How does the NexStep AI Engine predict university admission chances?',
      answer: 'The NexStep AI Engine synthesizes 3 years of historical HEC, NTS, MDCAT, and ECAT merit cutoff trends alongside your Matric/FSc percentages. Using weighted aggregate algorithms, it calculates your precise admission likelihood (High, Target, Reach) across 180+ Pakistani public and private universities.'
    },
    {
      id: 2,
      category: 'ai',
      question: 'What is the Holland RIASEC Personality Quiz used for?',
      answer: 'The Holland RIASEC Quiz measures six primary personality dimensions: Realistic, Investigative, Artistic, Social, Enterprising, and Conventional. NexStep maps your unique Holland profile code to 250+ career clusters to recommend fields where you are statistically most likely to thrive.'
    },
    {
      id: 3,
      category: 'academics',
      question: 'How are BISE Federal, Punjab, and Sindh board marks normalized?',
      answer: 'NexStep applies standardized HEC-approved weightage formulas (typically 10% Matric, 40% FSc/Inter, and 50% Entry Test) to calculate uniform merit scores across FBISE, BISE Rawalpindi, BISE Lahore, BISE Karachi, and AKU-EB examination systems.'
    },
    {
      id: 4,
      category: 'academics',
      question: 'What is the IBCC Equivalency calculation for Cambridge O/A-Levels?',
      answer: 'Inter Board Coordination Commission (IBCC) conversion rules map letter grades to percentages: A* = 90%, A = 85%, B = 75%, C = 65%, D = 55%, E = 45%. NexStep automates this conversion so O/A-Level students can instantly evaluate their eligibility for HEC universities.'
    },
    {
      id: 5,
      category: 'academics',
      question: 'Can I switch streams from FSc Pre-Medical to ICS / Artificial Intelligence?',
      answer: 'Yes! Under updated HEC rules, Pre-Medical students can transition into Computer Science, AI, and Software Engineering by clearing a zero-semester deficiency Math course or taking the Additional Mathematics board examination.'
    },
    {
      id: 6,
      category: 'scholarships',
      question: 'How does the Ehsaas and PEEF Need-Based Scholarship Matcher work?',
      answer: 'When you complete your financial profile (monthly family income, annual budget capacity, region), NexStep filters 120+ active national and provincial grants (Ehsaas Undergraduate, PEEF, HEC Need-Based, BEEF, and Sindh Endowment Funds) to highlight grants where you meet 100% of eligibility criteria.'
    },
    {
      id: 7,
      category: 'scholarships',
      question: 'Are there partial tuition waiver scholarships for Transnational and Study Abroad programs?',
      answer: 'Yes. NexStep includes 45+ international partial tuition waivers for UK, European, Turkish, Chinese, and UAE partner universities that accept Pakistani students with 70%+ academic aggregate.'
    },
    {
      id: 8,
      category: 'pricing',
      question: 'What is included in the NexStep Free Tier versus the Pro Student Pass?',
      answer: 'The Free Tier gives access to basic university search, stream mapping, and scholarship listings. The Pro Pass (PKR 2,500/year) unlocks unlimited AI Resume ATS Scoring, AI Mock Interview sessions with live audio feedback, 1-on-1 Certified Counselor booking, and real-time merit predictors.'
    },
    {
      id: 9,
      category: 'pricing',
      question: 'How can high schools and colleges obtain Institutional Counselor Access?',
      answer: 'Schools and colleges can purchase an Institutional Pass to equip their career counseling department with bulk student diagnostic dashboards, automated progress tracking, and custom parent report generators.'
    },
    {
      id: 10,
      category: 'career',
      question: 'How does the AI Resume ATS Scanner score my CV?',
      answer: 'The NexStep AI ATS Scanner parses your resume against industry job descriptions (e.g., Full-Stack Web Dev, Data Analyst, Biomedical Technician). It evaluates keyword density, formatting readability, action verb usage, and missing technical skills to give an instant match score.'
    },
    {
      id: 11,
      category: 'career',
      question: 'What happens during an AI Mock Interview session?',
      answer: 'Our AI Interview Coach simulates a realistic video/audio job or university admission interview. It poses domain-specific questions, listens to your answers, and delivers immediate feedback on communication clarity, technical depth, and confidence.'
    }
  ];

  // Filtered FAQ items based on category and search query
  const filteredFaqs = useMemo(() => {
    return faqData.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleAccordion = (index) => {
    if (openIndices.includes(index)) {
      setOpenIndices(openIndices.filter(i => i !== index));
    } else {
      setOpenIndices([...openIndices, index]);
    }
  };

  const handleExpandAll = () => {
    if (openIndices.length === filteredFaqs.length) {
      setOpenIndices([]);
    } else {
      setOpenIndices(filteredFaqs.map((_, i) => i));
    }
  };

  const handleFeedback = (faqId, isPositive) => {
    setFeedbackState(prev => ({
      ...prev,
      [faqId]: isPositive ? 'yes' : 'no'
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* FAQ Banner Header */}
      <div className="ns-hero text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Knowledge Base & Support
              </span>
              <span className="text-slate-400 text-xs">| Instant Platform Guidance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Frequently Asked Questions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Find instant, comprehensive answers about NexStep AI career guidance, university merit calculations, scholarships, and subscription features.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 shrink-0">
            <div className="text-right">
              <div className="text-[11px] font-extrabold uppercase text-slate-400">Total FAQs Available</div>
              <div className="text-xl font-black text-emerald-400">{faqData.length} Guides</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Live Search Bar inside Header */}
        <div className="mt-6 pt-6 border-t border-slate-800 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search questions, e.g. scholarship, merit, admission"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/90 text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-emerald-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-10 text-xs font-bold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs & Expand Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleExpandAll}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer self-end sm:self-auto"
        >
          {openIndices.length === filteredFaqs.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Accordion FAQ List Container */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 shadow-xs">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              No matching questions found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any FAQs matching "{searchQuery}". Try searching with different keywords or browse by category.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs cursor-pointer inline-block"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isOpen = openIndices.includes(index);
            const userFeedback = feedbackState[faq.id];

            return (
              <div
                key={faq.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Accordion Toggle Header */}
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                      isOpen
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      Q{index + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                      {faq.question}
                    </span>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 mt-0.5"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                {/* Collapsible Content with Motion Height Animation */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                        <p className="leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                          {faq.answer}
                        </p>

                        {/* Interactive Feedback Bar */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-400 font-bold">Was this answer helpful to you?</span>
                          
                          <div className="flex items-center gap-2">
                            {userFeedback ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Thank you for your feedback!
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleFeedback(faq.id, true)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <ThumbsUp className="w-3 h-3 text-emerald-500" />
                                  <span>Yes</span>
                                </button>
                                <button
                                  onClick={() => handleFeedback(faq.id, false)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <ThumbsDown className="w-3 h-3 text-slate-400" />
                                  <span>No</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Support Desk CTA Footer */}
      <div className=" ns-hero text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-extrabold text-white flex items-center justify-center sm:justify-start gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Have a specific question not listed here?</span>
          </h3>
          <p className="text-xs text-slate-400">
            Chat with the 24/7 NexStep AI Student Assistant or submit a inquiry directly to our counseling team.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { if (onNavigate) onNavigate('aiChatbot'); }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span>Ask AI Assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default FaqAccordion;

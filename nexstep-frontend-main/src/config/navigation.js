/**
 * navigation.js — the single source of truth for in-app navigation.
 *
 * Used by the desktop Sidebar, the mobile "More" drawer and the command palette,
 * so every page is defined exactly once (label, icon, description, roles).
 */
import {
  LayoutDashboard, Sparkles, ListChecks, Route, Target, GitCompareArrows,
  Building2, GraduationCap, Calculator, ClipboardList, Layers, School, Globe2,
  Briefcase, BookOpen, Wrench, FileText, Mic, Bot, AudioLines,
  Users, UserRound, BarChart3, CalendarDays, Settings, LifeBuoy,
  Crown, UserCog, Compass,
} from 'lucide-react';

/** Every navigable page, defined once. */
export const NAV_ITEMS = {
  pathway:         { label: 'My Pathway',         labelUr: 'میرا راستہ',           icon: Compass,         desc: 'Your class, options and next steps' },
  dashboard:       { label: 'Dashboard',          labelUr: 'ڈیش بورڈ',            icon: LayoutDashboard, desc: 'Your overview and next steps' },
  analytics:       { label: 'Analytics',          labelUr: 'تجزیات',              icon: BarChart3,       desc: 'Progress, scores and activity' },
  calendarNotif:   { label: 'Calendar',           labelUr: 'کیلنڈر',              icon: CalendarDays,    desc: 'Deadlines and notifications' },

  careerAi:        { label: 'Career AI',          labelUr: 'کیریئر اے آئی',        icon: Sparkles,        desc: 'Personalised career matches' },
  quiz:            { label: 'Interest Quiz',      labelUr: 'دلچسپی کوئز',          icon: ListChecks,      desc: 'RIASEC interest assessment' },
  careerRoadmap:   { label: 'Roadmap',            labelUr: 'روڈ میپ',              icon: Route,           desc: 'Milestones towards your goal' },
  skillGap:        { label: 'Skill Gap',          labelUr: 'مہارتوں کا فرق',        icon: Target,          desc: 'Skills to build next' },
  degreeCareer:    { label: 'Degree to Career',   labelUr: 'ڈگری سے کیریئر',       icon: GitCompareArrows, desc: 'Compare degrees and careers' },

  universities:    { label: 'Universities',       labelUr: 'یونیورسٹیاں',          icon: Building2,       desc: 'Search and compare institutions' },
  scholarships:    { label: 'Scholarships',       labelUr: 'اسکالرشپس',            icon: GraduationCap,   desc: 'Funding opportunities' },
  meritCalculator: { label: 'Merit Calculator',   labelUr: 'میرٹ کیلکولیٹر',       icon: Calculator,      desc: 'Estimate your aggregate' },
  entryTestPrep:   { label: 'Entry Test Prep',    labelUr: 'انٹری ٹیسٹ تیاری',      icon: ClipboardList,   desc: 'MDCAT, ECAT, NET practice' },
  fscMapper:       { label: 'Stream Mapper',      labelUr: 'سٹریم میپر',           icon: Layers,          desc: 'Choose your FSc / board stream' },
  grade8Matric:    { label: 'Grade 8 & Matric',   labelUr: 'گریڈ 8 اور میٹرک',     icon: School,          desc: 'Early subject guidance' },
  transnational:   { label: 'Study Abroad',       labelUr: 'بیرون ملک تعلیم',       icon: Globe2,          desc: 'Transnational pathways' },

  jobs:            { label: 'Jobs & Internships', labelUr: 'نوکریاں اور انٹرن شپ',  icon: Briefcase,       desc: 'Openings that match you' },
  courses:         { label: 'Courses',            labelUr: 'کورسز',                icon: BookOpen,        desc: 'Courses and certifications' },
  tevtaIt:         { label: 'TEVTA & IT',         labelUr: 'ٹیوٹا اور آئی ٹی',      icon: Wrench,          desc: 'Vocational and free IT courses' },
  resume:          { label: 'Resume Builder',     labelUr: 'ریزیومے بلڈر',          icon: FileText,        desc: 'Build an ATS-friendly resume' },
  mockInterview:   { label: 'Mock Interview',     labelUr: 'پریکٹس انٹرویو',        icon: Mic,             desc: 'Practise with AI feedback' },

  aiChatbot:       { label: 'AI Counselor',       labelUr: 'اے آئی مشیر',           icon: Bot,             desc: 'Chat about studies and careers' },
  voiceAssistant:  { label: 'Voice Assistant',    labelUr: 'وائس اسسٹنٹ',          icon: AudioLines,      desc: 'Talk in English or Urdu' },

  community:       { label: 'Community',          labelUr: 'کمیونٹی',              icon: Users,           desc: 'Questions and discussions' },
  mentorship:      { label: 'Mentorship',         labelUr: 'رہنمائی',              icon: UserRound,       desc: 'Book time with mentors' },

  mentorPortal:    { label: 'Mentor Workspace',   labelUr: 'مینٹور ورک اسپیس',      icon: UserCog,         desc: 'Your mentees and sessions', roles: ['MENTOR'] },

  onboarding:      { label: 'Profile',            labelUr: 'پروفائل',              icon: UserRound,       desc: 'Your academic profile' },
  settings:        { label: 'Settings',           labelUr: 'ترتیبات',              icon: Settings,        desc: 'Account, theme and language' },
  helpCenter:      { label: 'Help Center',        labelUr: 'مدد',                  icon: LifeBuoy,        desc: 'FAQs and support' },
  pricing:         { label: 'Upgrade',            labelUr: 'اپ گریڈ',              icon: Crown,           desc: 'Plans and pricing' },
};

/** Sidebar sections per role. Each page appears in exactly one section. */
const GROUPS_BY_ROLE = {
  STUDENT: [
    { id: 'overview',  title: 'Overview',        titleUr: 'جائزہ',        items: ['dashboard', 'pathway', 'analytics', 'calendarNotif'] },
    { id: 'career',    title: 'Career',          titleUr: 'کیریئر',       items: ['careerAi', 'quiz', 'careerRoadmap', 'skillGap', 'degreeCareer'] },
    { id: 'education', title: 'Education',       titleUr: 'تعلیم',        items: ['universities', 'scholarships', 'meritCalculator', 'entryTestPrep', 'fscMapper', 'grade8Matric', 'transnational'] },
    { id: 'skills',    title: 'Skills & Jobs',   titleUr: 'مہارتیں اور نوکریاں', items: ['jobs', 'courses', 'tevtaIt', 'resume', 'mockInterview'] },
    { id: 'assist',    title: 'AI Assistants',   titleUr: 'اے آئی معاون', items: ['aiChatbot', 'voiceAssistant'] },
    { id: 'people',    title: 'Community',       titleUr: 'کمیونٹی',      items: ['community', 'mentorship'] },
  ],
  // Mentors only see mentor pages (matches MENTOR_ALLOWED_PATHS in App.jsx).
  MENTOR: [
    { id: 'workspace', title: 'Workspace',       titleUr: 'ورک اسپیس',    items: ['mentorPortal', 'calendarNotif'] },
    { id: 'people',    title: 'Community',       titleUr: 'کمیونٹی',      items: ['community', 'aiChatbot'] },
  ],
};

/** Account links shown in the sidebar footer (not repeated in the sections). */
export const ACCOUNT_ITEMS = ['onboarding', 'settings', 'helpCenter'];

export const normaliseRole = (role) => {
  const r = String(role || 'STUDENT').toUpperCase();
  return GROUPS_BY_ROLE[r] ? r : 'STUDENT';
};

const canSee = (item, role) => !item.roles || item.roles.includes(role);

import { isPageAllowedForLevel } from './educationLevels.js';

const toEntry = (id, role) => {
  const item = NAV_ITEMS[id];
  if (!item || !canSee(item, role)) return null;
  return { id, ...item };
};

/** Sidebar sections with resolved items for a role (students: only pages for their class / level). */
export function getNavGroups(role, level = null) {
  const r = normaliseRole(role);
  return GROUPS_BY_ROLE[r]
    .map((g) => ({
      ...g,
      items: g.items
        .filter((id) => r !== 'STUDENT' || isPageAllowedForLevel(id, level))
        .map((id) => toEntry(id, r))
        .filter(Boolean),
    }))
    .filter((g) => g.items.length > 0);
}

/** Account entries for a role (students also see Profile). */
export function getAccountItems(role) {
  const r = normaliseRole(role);
  const ids = r === 'STUDENT' ? ACCOUNT_ITEMS : ACCOUNT_ITEMS.filter((id) => id !== 'onboarding');
  return ids.map((id) => toEntry(id, r)).filter(Boolean);
}

/** Flat, de-duplicated list of every page a role can open (with its section name). */
export function getAllNavItems(role, level = null) {
  const seen = new Set();
  const out = [];
  for (const g of getNavGroups(role, level)) {
    for (const item of g.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({ ...item, category: g.title, categoryUr: g.titleUr });
    }
  }
  for (const item of getAccountItems(role)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({ ...item, category: 'Account', categoryUr: 'اکاؤنٹ' });
  }
  return out;
}

export const navLabel = (item, lang) => (lang === 'ur' && item.labelUr ? item.labelUr : item.label);

/**
 * Same pages, groups and bottom bar as the website
 * (navigation.js + MobileBottomNav.jsx). Screen ids are the phone routes.
 */
import type { LucideIcon } from 'lucide-react-native';
import {
  AudioLines, BarChart3, BookOpen, Bot, Briefcase, Building2, Calculator, Calendar,
  ClipboardList, Compass, Crown, FileText, GraduationCap, Globe, Home, Layers,
  LifeBuoy, ListChecks, Mic, Route, School, Settings, Sparkles, Target, UserCog,
  UserRound, Users, Wrench,
} from 'lucide-react-native';
import { isPageAllowed, LEVEL_PRIMARY_TAB, type EducationLevel } from './access';

export type NavItem = {
  id: string;
  label: string;
  labelUr: string;
  short: string;
  shortUr: string;
  desc: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: Record<string, NavItem> = {
  home: { id: 'home', label: 'Dashboard', labelUr: 'ڈیش بورڈ', short: 'Home', shortUr: 'ہوم', desc: 'Your overview and next steps', icon: Home },
  pathway: { id: 'pathway', label: 'My Pathway', labelUr: 'میرا راستہ', short: 'Pathway', shortUr: 'راستہ', desc: 'Your class, options and next steps', icon: Compass },
  analytics: { id: 'analytics', label: 'Analytics', labelUr: 'تجزیات', short: 'Stats', shortUr: 'تجزیات', desc: 'Progress, scores and activity', icon: BarChart3 },
  calendarNotif: { id: 'calendarNotif', label: 'Calendar', labelUr: 'کیلنڈر', short: 'Calendar', shortUr: 'کیلنڈر', desc: 'Deadlines and notifications', icon: Calendar },
  career: { id: 'career', label: 'Career AI', labelUr: 'کیریئر اے آئی', short: 'Career', shortUr: 'کیریئر', desc: 'Personalised career matches', icon: Sparkles },
  quiz: { id: 'quiz', label: 'Interest Quiz', labelUr: 'دلچسپی کوئز', short: 'Quiz', shortUr: 'کوئز', desc: 'RIASEC interest assessment', icon: ListChecks },
  roadmap: { id: 'roadmap', label: 'Roadmap', labelUr: 'روڈ میپ', short: 'Roadmap', shortUr: 'روڈ میپ', desc: 'Milestones towards your goal', icon: Route },
  skillGap: { id: 'skillGap', label: 'Skill Gap', labelUr: 'مہارتوں کا فرق', short: 'Skills', shortUr: 'مہارتیں', desc: 'Skills to build next', icon: Target },
  degreeCareer: { id: 'degreeCareer', label: 'Degree to Career', labelUr: 'ڈگری سے کیریئر', short: 'Degrees', shortUr: 'ڈگری', desc: 'Compare degrees and careers', icon: GraduationCap },
  universities: { id: 'universities', label: 'Universities', labelUr: 'یونیورسٹیاں', short: 'Unis', shortUr: 'یونیورسٹی', desc: 'Search and compare institutions', icon: Building2 },
  scholarships: { id: 'scholarships', label: 'Scholarships', labelUr: 'اسکالرشپس', short: 'Aid', shortUr: 'اسکالرشپ', desc: 'Funding opportunities', icon: GraduationCap },
  meritCalculator: { id: 'meritCalculator', label: 'Merit Calculator', labelUr: 'میرٹ کیلکولیٹر', short: 'Merit', shortUr: 'میرٹ', desc: 'Estimate your aggregate', icon: Calculator },
  entryTestPrep: { id: 'entryTestPrep', label: 'Entry Test Prep', labelUr: 'انٹری ٹیسٹ تیاری', short: 'Tests', shortUr: 'ٹیسٹ', desc: 'MDCAT, ECAT, NET practice', icon: ClipboardList },
  fscMapper: { id: 'fscMapper', label: 'Stream Mapper', labelUr: 'سٹریم میپر', short: 'Streams', shortUr: 'سٹریم', desc: 'Choose your FSc / board stream', icon: Layers },
  grade8Matric: { id: 'grade8Matric', label: 'Grade 8 & Matric', labelUr: 'گریڈ 8 اور میٹرک', short: 'Matric', shortUr: 'میٹرک', desc: 'Early subject guidance', icon: School },
  transnational: { id: 'transnational', label: 'Study Abroad', labelUr: 'بیرون ملک تعلیم', short: 'Abroad', shortUr: 'بیرون', desc: 'Transnational pathways', icon: Globe },
  jobs: { id: 'jobs', label: 'Jobs & Internships', labelUr: 'نوکریاں اور انٹرن شپ', short: 'Jobs', shortUr: 'نوکریاں', desc: 'Openings that match you', icon: Briefcase },
  courses: { id: 'courses', label: 'Courses', labelUr: 'کورسز', short: 'Courses', shortUr: 'کورسز', desc: 'Courses and certifications', icon: BookOpen },
  tevtaIt: { id: 'tevtaIt', label: 'TEVTA & IT', labelUr: 'ٹیوٹا اور آئی ٹی', short: 'TEVTA', shortUr: 'ٹیوٹا', desc: 'Vocational and free IT courses', icon: Wrench },
  resume: { id: 'resume', label: 'Resume Builder', labelUr: 'ریزیومے بلڈر', short: 'Resume', shortUr: 'ریزیومے', desc: 'Build an ATS-friendly resume', icon: FileText },
  mockInterview: { id: 'mockInterview', label: 'Mock Interview', labelUr: 'پریکٹس انٹرویو', short: 'Interview', shortUr: 'انٹرویو', desc: 'Practise with AI feedback', icon: Mic },
  chatbot: { id: 'chatbot', label: 'AI Counselor', labelUr: 'اے آئی مشیر', short: 'AI Chat', shortUr: 'اے آئی', desc: 'Chat about studies and careers', icon: Bot },
  voiceAssistant: { id: 'voiceAssistant', label: 'Voice Assistant', labelUr: 'وائس اسسٹنٹ', short: 'Voice', shortUr: 'آواز', desc: 'Talk in English or Urdu', icon: AudioLines },
  community: { id: 'community', label: 'Community', labelUr: 'کمیونٹی', short: 'Community', shortUr: 'کمیونٹی', desc: 'Questions and discussions', icon: Users },
  mentorship: { id: 'mentorship', label: 'Mentorship', labelUr: 'رہنمائی', short: 'Mentors', shortUr: 'رہنمائی', desc: 'Book time with mentors', icon: UserRound },
  mentorPortal: { id: 'mentorPortal', label: 'Mentor Workspace', labelUr: 'مینٹور ورک اسپیس', short: 'Mentees', shortUr: 'طلبہ', desc: 'Your mentees and sessions', icon: UserCog },
  onboarding: { id: 'onboarding', label: 'Profile', labelUr: 'پروفائل', short: 'Profile', shortUr: 'پروفائل', desc: 'Your academic profile', icon: UserRound },
  settings: { id: 'settings', label: 'Settings', labelUr: 'ترتیبات', short: 'Settings', shortUr: 'ترتیبات', desc: 'Account, theme and language', icon: Settings },
  helpCenter: { id: 'helpCenter', label: 'Help Center', labelUr: 'مدد', short: 'Help', shortUr: 'مدد', desc: 'FAQs and support', icon: LifeBuoy },
  pricing: { id: 'pricing', label: 'Upgrade', labelUr: 'اپ گریڈ', short: 'Upgrade', shortUr: 'اپ گریڈ', desc: 'Plans and pricing', icon: Crown },
  admin: { id: 'admin', label: 'Admin', labelUr: 'ایڈمن', short: 'Admin', shortUr: 'ایڈمن', desc: 'Platform administration', icon: Settings },
};

type Group = { id: string; title: string; titleUr: string; items: string[] };

const STUDENT_GROUPS: Group[] = [
  { id: 'overview', title: 'Overview', titleUr: 'جائزہ', items: ['home', 'pathway', 'analytics', 'calendarNotif'] },
  { id: 'career', title: 'Career', titleUr: 'کیریئر', items: ['career', 'quiz', 'roadmap', 'skillGap', 'degreeCareer'] },
  { id: 'education', title: 'Education', titleUr: 'تعلیم', items: ['universities', 'scholarships', 'meritCalculator', 'entryTestPrep', 'fscMapper', 'grade8Matric', 'transnational'] },
  { id: 'skills', title: 'Skills & Jobs', titleUr: 'مہارتیں اور نوکریاں', items: ['jobs', 'courses', 'tevtaIt', 'resume', 'mockInterview'] },
  { id: 'assist', title: 'AI Assistants', titleUr: 'اے آئی معاون', items: ['chatbot', 'voiceAssistant'] },
  { id: 'people', title: 'Community', titleUr: 'کمیونٹی', items: ['community', 'mentorship'] },
];

const MENTOR_GROUPS: Group[] = [
  { id: 'workspace', title: 'Workspace', titleUr: 'ورک اسپیس', items: ['mentorPortal', 'calendarNotif'] },
  { id: 'people', title: 'Community', titleUr: 'کمیونٹی', items: ['community', 'chatbot'] },
];

function roleKey(role: string) {
  return role.toUpperCase() === 'MENTOR' ? 'MENTOR' : 'STUDENT';
}

function groupsFor(role: string): Group[] {
  return roleKey(role) === 'MENTOR' ? MENTOR_GROUPS : STUDENT_GROUPS;
}

function accountIds(role: string) {
  return roleKey(role) === 'MENTOR' ? ['settings', 'helpCenter'] : ['onboarding', 'settings', 'helpCenter'];
}

function visibleItem(id: string, role: string, level?: string | null) {
  const item = NAV_ITEMS[id];
  if (!item || !isPageAllowed(id, role, level)) return null;
  return item;
}

export function labelOf(item: NavItem, language: string) {
  return language === 'ur' ? item.labelUr : item.label;
}

export function shortOf(item: NavItem, language: string) {
  return language === 'ur' ? item.shortUr : item.short;
}

export function primaryTabs(role: string, level?: string | null): NavItem[] {
  const r = roleKey(role);
  const ids = r === 'MENTOR'
    ? ['mentorPortal', 'calendarNotif', 'community', 'chatbot']
    : ['home', 'pathway', (level && level in LEVEL_PRIMARY_TAB ? LEVEL_PRIMARY_TAB[level as EducationLevel] : 'career'), 'chatbot'];
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id) || !NAV_ITEMS[id]) return false;
    seen.add(id);
    return true;
  }).map((id) => NAV_ITEMS[id]);
}

export function menuGroups(role: string, level: string | null | undefined, query: string, language: string) {
  const q = query.trim().toLowerCase();
  const sections = [
    ...groupsFor(role),
    { id: 'account', title: 'Account', titleUr: 'اکاؤنٹ', items: accountIds(role) },
  ];
  const built = sections.map((group) => ({
    id: group.id,
    title: language === 'ur' ? group.titleUr : group.title,
    items: group.items.map((id) => visibleItem(id, role, level)).filter((item): item is NavItem => Boolean(item)),
  })).filter((group) => group.items.length > 0);

  if (!q) return built;
  const matches = built.flatMap((group) => group.items).filter((item) =>
    [item.label, item.labelUr, item.desc, item.short].some((value) => value.toLowerCase().includes(q)),
  );
  return [{ id: 'results', title: language === 'ur' ? 'نتائج' : 'Results', items: matches }];
}

export function toolsForLevel(level?: string | null) {
  return STUDENT_GROUPS.flatMap((group) => group.items)
    .filter((id) => id !== 'home' && id !== 'pathway')
    .map((id) => visibleItem(id, 'STUDENT', level))
    .filter((item): item is NavItem => Boolean(item));
}

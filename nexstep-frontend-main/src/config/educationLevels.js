/**
 * educationLevels.js — Pakistani education levels used across the student portal.
 * Must match EDUCATION_LEVELS in backend/src/routes/education.routes.ts.
 */
import { BookOpen, School, GraduationCap, Wrench, Building2 } from 'lucide-react';

export const LEVELS = [
  { id: 'class8',     label: 'Class 8',            labelUr: 'جماعت ہشتم',      short: 'Class 8',   sub: 'Middle school',                    subUr: 'مڈل اسکول',                icon: BookOpen,
    streams: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical'] },
  { id: 'class9',     label: 'Class 9',            labelUr: 'جماعت نہم',       short: 'Class 9',   sub: 'Matric Part I / O-Levels',         subUr: 'میٹرک حصہ اول / او لیول',   icon: School,
    streams: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical', 'O-Levels'] },
  { id: 'class10',    label: 'Class 10',           labelUr: 'جماعت دہم',       short: 'Class 10',  sub: 'Matric Part II / O-Levels',        subUr: 'میٹرک حصہ دوم / او لیول',   icon: School,
    streams: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical', 'O-Levels'] },
  { id: 'class11',    label: 'Class 11',           labelUr: 'گیارہویں جماعت',   short: '1st Year',  sub: 'Inter Part I (1st year) / AS-Level', subUr: 'انٹر حصہ اول / اے ایس لیول', icon: GraduationCap,
    streams: ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'] },
  { id: 'class12',    label: 'Class 12',           labelUr: 'بارہویں جماعت',    short: '2nd Year',  sub: 'Inter Part II (2nd year) / A-Level', subUr: 'انٹر حصہ دوم / اے لیول',   icon: GraduationCap,
    streams: ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'] },
  { id: 'dae',        label: 'DAE / Polytechnic',  labelUr: 'ڈی اے ای / پولی ٹیکنک', short: 'DAE',    sub: '3-year diploma of associate engineer', subUr: 'تین سالہ ڈپلومہ',     icon: Wrench,
    streams: ['Civil', 'Electrical', 'Mechanical', 'Computer / IT', 'Electronics'] },
  { id: 'university', label: 'University',         labelUr: 'یونیورسٹی',        short: 'University', sub: 'BS / undergraduate degree',       subUr: 'بی ایس / انڈرگریجویٹ',     icon: Building2,
    streams: ['Computer Science', 'Engineering', 'Medical / Health', 'Business', 'Arts / Social Sciences'] },
];

export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

const EXTRA_STREAMS = {
  class8: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical'],
  dae: ['Civil', 'Electrical', 'Mechanical', 'Computer / IT', 'Electronics'],
  university: ['Computer Science', 'Engineering', 'Medical / Health', 'Business', 'Arts / Social Sciences'],
};

/** Streams / subjects a student can pick on the profile for their class. */
export function streamsForLevel(level) {
  const listed = LEVEL_BY_ID[level]?.streams;
  if (listed?.length) return listed;
  return EXTRA_STREAMS[level] || ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'DAE (Diploma)', 'A-Levels'];
}
export const levelLabel = (id, lang = 'en') => {
  const l = LEVEL_BY_ID[id];
  if (!l) return '';
  return lang === 'ur' ? l.labelUr : l.label;
};

/** Pages every student sees, whatever their level (the interest quiz is for everyone, DAE included). */
const COMMON = ['dashboard', 'pathway', 'quiz', 'calendarNotif', 'scholarships', 'courses', 'aiChatbot', 'voiceAssistant', 'community', 'mentorship'];

/** Extra pages that make sense at each level (Pakistani system). */
const BY_LEVEL = {
  class8:     ['grade8Matric'],
  class9:     ['careerAi', 'grade8Matric', 'degreeCareer', 'tevtaIt'],
  class10:    ['careerAi', 'grade8Matric', 'fscMapper', 'degreeCareer', 'tevtaIt'],
  class11:    ['careerAi', 'careerRoadmap', 'fscMapper', 'degreeCareer', 'universities', 'meritCalculator', 'entryTestPrep', 'transnational', 'analytics'],
  class12:    ['careerAi', 'careerRoadmap', 'fscMapper', 'degreeCareer', 'universities', 'meritCalculator', 'entryTestPrep', 'transnational', 'analytics'],
  dae:        ['careerAi', 'careerRoadmap', 'skillGap', 'universities', 'meritCalculator', 'jobs', 'tevtaIt', 'resume', 'mockInterview', 'analytics'],
  university: ['careerAi', 'careerRoadmap', 'skillGap', 'jobs', 'resume', 'mockInterview', 'universities', 'transnational', 'analytics'],
};

/** Account pages are always allowed. */
const ALWAYS = ['onboarding', 'settings', 'helpCenter', 'pricing', 'roleSelect', 'auth', 'landing'];

export function pagesForLevel(level) {
  if (!LEVEL_BY_ID[level]) return null; // no level yet → no filtering
  return new Set([...COMMON, ...BY_LEVEL[level], ...ALWAYS]);
}

export function isPageAllowedForLevel(pageId, level) {
  const pages = pagesForLevel(level);
  return !pages || pages.has(pageId);
}

/** Mobile bottom bar: the fourth tab is the most useful tool at each level. */
export const LEVEL_PRIMARY_TAB = {
  class8: 'quiz', class9: 'quiz', class10: 'fscMapper', class11: 'universities', class12: 'entryTestPrep', dae: 'jobs', university: 'jobs',
};

/** Profile helper: the student's level id, or null. */
export const profileLevel = (profile) => profile?.education?.level || null;

const STREAM_ALIASES = {
  'pre_medical': 'FSc Pre-Medical',
  'pre-medical': 'FSc Pre-Medical',
  'pre medical': 'FSc Pre-Medical',
  'fsc pre-medical': 'FSc Pre-Medical',
  'fsc pre medical': 'FSc Pre-Medical',
  'pre_engineering': 'FSc Pre-Engineering',
  'pre-engineering': 'FSc Pre-Engineering',
  'pre engineering': 'FSc Pre-Engineering',
  'fsc pre-engineering': 'FSc Pre-Engineering',
  'ics (comp sci)': 'ICS',
  'ics (computer science)': 'ICS',
  'ics (computer sci)': 'ICS',
  'commerce': 'ICom',
  'icom (commerce)': 'ICom',
  'i.com': 'ICom',
  'i.com (commerce)': 'ICom',
  'arts': 'FA / Humanities',
  'arts/fa': 'FA / Humanities',
  'arts / fa': 'FA / Humanities',
  fa: 'FA / Humanities',
  'humanities': 'Humanities / Arts',
  'science_bio': 'Science (Biology)',
  'science (biology)': 'Science (Biology)',
  'science_cs': 'Science (Computer Science)',
  'science (computer)': 'Science (Computer Science)',
  'science (computer science)': 'Science (Computer Science)',
  'science (computer group)': 'Science (Computer Science)',
};

export function normalizeStream(value) {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  if (!raw) return '';
  return STREAM_ALIASES[raw.toLowerCase()] || raw;
}

/** Stream saved at role-select / education, used everywhere on profile. */
export const profileStream = (profile) =>
  normalizeStream(profile?.education?.stream || profile?.preferredStream || profile?.stream || '');

/** Institute / school name from education or the settings profile field. */
export const profileInstitution = (profile) =>
  profile?.education?.institution || profile?.institution || '';

/** Options for the profile stream dropdown, keeping a saved custom value visible. */
export function streamOptionsForProfile(profile) {
  const level = profile?.education?.level;
  const listed = streamsForLevel(level);
  const saved = profileStream(profile);
  const values = saved && !listed.includes(saved) && !listed.some((s) => s.toLowerCase() === saved.toLowerCase())
    ? [saved, ...listed]
    : listed;
  return values.map((s) => ({ value: s, label: s }));
}

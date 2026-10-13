/**
 * Which screens a student sees, matching the website's educationLevels.js.
 * Mentors only see the mentor workspace and the few tools the website allows them.
 * Clerk ADMIN users use the student portal here, same as getUserRole() on the website.
 */

export type EducationLevel = 'class8' | 'class9' | 'class10' | 'class11' | 'class12' | 'dae' | 'university';

export const LEVELS: { id: EducationLevel; label: string; labelUr: string; sub: string; streams: string[] }[] = [
  { id: 'class8', label: 'Class 8', labelUr: 'جماعت ہشتم', sub: 'Middle school', streams: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical'] },
  { id: 'class9', label: 'Class 9', labelUr: 'جماعت نہم', sub: 'Matric Part I / O-Levels', streams: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical', 'O-Levels'] },
  { id: 'class10', label: 'Class 10', labelUr: 'جماعت دہم', sub: 'Matric Part II / O-Levels', streams: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical', 'O-Levels'] },
  { id: 'class11', label: 'Class 11', labelUr: 'گیارہویں جماعت', sub: 'Inter Part I (1st year) / AS-Level', streams: ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'] },
  { id: 'class12', label: 'Class 12', labelUr: 'بارہویں جماعت', sub: 'Inter Part II (2nd year) / A-Level', streams: ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'] },
  { id: 'dae', label: 'DAE / Polytechnic', labelUr: 'ڈی اے ای / پولی ٹیکنک', sub: '3-year diploma of associate engineer', streams: ['Civil', 'Electrical', 'Mechanical', 'Computer / IT', 'Electronics'] },
  { id: 'university', label: 'University', labelUr: 'یونیورسٹی', sub: 'BS / undergraduate degree', streams: ['Computer Science', 'Engineering', 'Medical / Health', 'Business', 'Arts / Social Sciences'] },
];

export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((level) => [level.id, level]));

const EXTRA_STREAMS: Record<string, string[]> = {
  class8: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical'],
  dae: ['Civil', 'Electrical', 'Mechanical', 'Computer / IT', 'Electronics'],
  university: ['Computer Science', 'Engineering', 'Medical / Health', 'Business', 'Arts / Social Sciences'],
};

const STREAM_ALIASES: Record<string, string> = {
  'pre_medical': 'FSc Pre-Medical',
  'pre-medical': 'FSc Pre-Medical',
  'pre medical': 'FSc Pre-Medical',
  'pre_engineering': 'FSc Pre-Engineering',
  'pre-engineering': 'FSc Pre-Engineering',
  'ics (comp sci)': 'ICS',
  'ics (computer science)': 'ICS',
  'commerce': 'ICom',
  'icom (commerce)': 'ICom',
  'arts/fa': 'FA / Humanities',
  'arts': 'FA / Humanities',
  fa: 'FA / Humanities',
  'science_bio': 'Science (Biology)',
  'science (biology)': 'Science (Biology)',
  'science_cs': 'Science (Computer Science)',
  'science (computer)': 'Science (Computer Science)',
  'science (computer science)': 'Science (Computer Science)',
};

export function normalizeStream(value?: string | null) {
  if (!value) return '';
  const raw = String(value).trim();
  return STREAM_ALIASES[raw.toLowerCase()] || raw;
}

const PROVINCE_ALIASES: Record<string, string> = {
  punjab: 'Punjab',
  sindh: 'Sindh',
  kpk: 'KPK',
  kp: 'KPK',
  'khyber pakhtunkhwa': 'KPK',
  balochistan: 'Balochistan',
  islamabad: 'Islamabad',
  'ajk/gb': 'AJK/GB',
  ajk: 'AJK/GB',
  gb: 'AJK/GB',
};

export function normalizeProvince(value?: string | null) {
  if (!value) return '';
  const raw = String(value).trim();
  return PROVINCE_ALIASES[raw.toLowerCase()] || raw;
}

export function streamsForLevel(level?: string | null) {
  const listed = LEVEL_BY_ID[level || '']?.streams;
  if (listed?.length) return listed;
  return EXTRA_STREAMS[level || ''] || ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'];
}

const COMMON = [
  'home', 'pathway', 'quiz', 'calendarNotif', 'scholarships', 'courses',
  'chatbot', 'voiceAssistant', 'community', 'mentorship',
];

const BY_LEVEL: Record<EducationLevel, string[]> = {
  class8: ['grade8Matric'],
  class9: ['career', 'grade8Matric', 'degreeCareer', 'tevtaIt'],
  class10: ['career', 'grade8Matric', 'fscMapper', 'degreeCareer', 'tevtaIt'],
  class11: ['career', 'roadmap', 'fscMapper', 'degreeCareer', 'universities', 'meritCalculator', 'entryTestPrep', 'transnational', 'analytics'],
  class12: ['career', 'roadmap', 'fscMapper', 'degreeCareer', 'universities', 'meritCalculator', 'entryTestPrep', 'transnational', 'analytics'],
  dae: ['career', 'roadmap', 'skillGap', 'universities', 'meritCalculator', 'jobs', 'tevtaIt', 'resume', 'mockInterview', 'analytics'],
  university: ['career', 'roadmap', 'skillGap', 'jobs', 'resume', 'mockInterview', 'universities', 'transnational', 'analytics'],
};

export const LEVEL_PRIMARY_TAB: Record<EducationLevel, string> = {
  class8: 'quiz',
  class9: 'quiz',
  class10: 'fscMapper',
  class11: 'universities',
  class12: 'entryTestPrep',
  dae: 'jobs',
  university: 'jobs',
};

const ALWAYS = new Set(['onboarding', 'settings', 'helpCenter', 'pricing', 'profile', 'services', 'home', 'roleSelect']);

export function pagesForLevel(level?: string | null) {
  if (!level || !(level in BY_LEVEL)) return null;
  return new Set([...COMMON, ...BY_LEVEL[level as EducationLevel], ...ALWAYS]);
}

export function isPageAllowedForLevel(pageId: string, level?: string | null) {
  if (ALWAYS.has(pageId)) return true;
  const pages = pagesForLevel(level);
  return !pages || pages.has(pageId);
}

export const MENTOR_PAGES = new Set([
  'workspace', 'mentorPortal', 'calendarNotif', 'community', 'chatbot', 'settings', 'helpCenter', 'services',
]);

export function getAppRole(role?: string | null) {
  return String(role || 'STUDENT').trim().toUpperCase() === 'MENTOR' ? 'MENTOR' : 'STUDENT';
}

export function isPageAllowed(pageId: string, role: string, level?: string | null) {
  if (getAppRole(role) === 'MENTOR') return MENTOR_PAGES.has(pageId);
  return isPageAllowedForLevel(pageId, level);
}

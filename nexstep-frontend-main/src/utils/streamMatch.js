import { normalizeStream } from '../config/educationLevels.js';

/** Keywords used to show universities / scholarships that match a student's stream. */
const STREAM_KEYWORDS = {
  'Science (Biology)': ['biology', 'medical', 'science', 'pre-medical', 'mbbs', 'health'],
  'Science (Computer Science)': ['computer', 'software', 'it', 'ics', 'cs', 'programming'],
  'Humanities / Arts': ['arts', 'humanities', 'fa', 'law', 'media', 'social'],
  Technical: ['technical', 'dae', 'polytechnic', 'vocational', 'engineering'],
  'O-Levels': ['o-level', 'cambridge', 'gcse'],
  'FSc Pre-Medical': ['medical', 'mbbs', 'bds', 'pharmacy', 'nursing', 'biology', 'health', 'pre-medical', 'doctor'],
  'FSc Pre-Engineering': ['engineering', 'civil', 'mechanical', 'electrical', 'pre-engineering', 'physics'],
  ICS: ['computer', 'software', 'it', 'ics', 'cs', 'data', 'ai'],
  'ICS (Comp Sci)': ['computer', 'software', 'it', 'ics', 'cs', 'data', 'ai'],
  ICom: ['commerce', 'bba', 'accounting', 'business', 'icom', 'finance'],
  'ICOM (Commerce)': ['commerce', 'bba', 'accounting', 'business', 'icom', 'finance'],
  'FA / Humanities': ['arts', 'humanities', 'law', 'media', 'fa', 'social'],
  'Arts/FA': ['arts', 'humanities', 'law', 'media', 'fa'],
  'A-Levels': ['a-level', 'cambridge', 'as-level'],
  'DAE (Diploma)': ['dae', 'diploma', 'polytechnic', 'technical'],
  'Computer Science': ['computer', 'software', 'it', 'cs', 'ai'],
  Engineering: ['engineering', 'civil', 'mechanical', 'electrical'],
  'Medical / Health': ['medical', 'mbbs', 'health', 'pharmacy', 'nursing'],
  Business: ['business', 'bba', 'commerce', 'management', 'finance'],
  'Arts / Social Sciences': ['arts', 'social', 'media', 'law'],
};

export function streamKeywords(stream) {
  if (!stream) return [];
  const canon = normalizeStream(stream) || stream;
  if (STREAM_KEYWORDS[canon]) return STREAM_KEYWORDS[canon];
  if (STREAM_KEYWORDS[stream]) return STREAM_KEYWORDS[stream];
  return String(canon).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
}

export function matchesStream(text, stream) {
  const keys = streamKeywords(stream);
  if (!keys.length) return true;
  const hay = String(text || '').toLowerCase();
  return keys.some((k) => hay.includes(k));
}

export function profileStream(profile) {
  return normalizeStream(profile?.education?.stream || profile?.preferredStream || profile?.stream || '');
}

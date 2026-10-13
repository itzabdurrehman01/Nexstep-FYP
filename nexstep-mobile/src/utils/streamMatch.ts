import { normalizeStream } from '../config/access';

const STREAM_KEYWORDS: Record<string, string[]> = {
  'Science (Biology)': ['biology', 'medical', 'science', 'pre-medical', 'mbbs', 'health'],
  'Science (Computer Science)': ['computer', 'software', 'it', 'ics', 'cs', 'programming'],
  'Humanities / Arts': ['arts', 'humanities', 'fa', 'law', 'media', 'social'],
  Technical: ['technical', 'dae', 'polytechnic', 'vocational', 'engineering'],
  'FSc Pre-Medical': ['medical', 'mbbs', 'bds', 'pharmacy', 'nursing', 'biology', 'health', 'pre-medical'],
  'FSc Pre-Engineering': ['engineering', 'civil', 'mechanical', 'electrical', 'pre-engineering', 'physics'],
  ICS: ['computer', 'software', 'it', 'ics', 'cs', 'data', 'ai'],
  ICom: ['commerce', 'bba', 'accounting', 'business', 'icom', 'finance'],
  'FA / Humanities': ['arts', 'humanities', 'law', 'media', 'fa', 'social'],
  'A-Levels': ['a-level', 'cambridge'],
};

export function streamKeywords(stream?: string | null) {
  if (!stream) return [];
  const canon = normalizeStream(stream) || stream;
  if (STREAM_KEYWORDS[canon]) return STREAM_KEYWORDS[canon];
  if (STREAM_KEYWORDS[stream]) return STREAM_KEYWORDS[stream];
  return String(canon).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
}

export function matchesStream(text: string, stream?: string | null) {
  const keys = streamKeywords(stream);
  if (!keys.length) return true;
  const hay = String(text || '').toLowerCase();
  return keys.some((k) => hay.includes(k));
}

export function profileStream(profile: any) {
  return normalizeStream(profile?.education?.stream || profile?.preferredStream || '');
}

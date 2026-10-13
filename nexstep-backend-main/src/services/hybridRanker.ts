/**
 * backend/src/services/hybridRanker.ts
 *
 * Option C: Faithful TypeScript Port of ml/src/ranker.py and ml/src/eligibility.py.
 * Ensures identical multi-factor scoring logic, 6D RIASEC cosine similarity,
 * skill-match ratios, academic cutoffs, weight redistribution, and provenance confidence.
 */

export interface StudentInput {
  preferredStream?: string;
  stream?: string;
  marks?: { fscPct?: number; matricPct?: number };
  skills?: string[];
  riasecScores?: Record<string, number>;
  riasec?: Record<string, number>;
}

export interface CareerRecord {
  id?: string;
  title: string;
  category?: string;
  min_fsc_pct?: number;
  accepted_streams?: string[];
  requiredSkills?: string[];
  required_skills?: string[];
  riasec?: Record<string, number>;
  verification_status?: string;
  official_url?: string;
  source_url?: string;
  source_id?: string;
  publisher?: string;
  freshness_status?: string;
}

export interface FactorBreakdown {
  riasecFit: number;
  skillFit: number;
  academicFit: number;
  educationCompatibility: number;
  pakistaniRelevance: number;
  marketDemand: number | null;
  growth: number | null;
  sourceConfidence: number;
}

export interface EligibilityResult {
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'EXPLORATORY' | 'INSUFFICIENT_DATA';
  reasons: string[];
  blockingReasons: string[];
  missingRequirements: string[];
}

export interface RankerResult {
  careerId: string;
  title: string;
  score: number;
  eligibility: EligibilityResult;
  factors: FactorBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  whyRecommended: string[];
  limitations: string[];
  provenance: {
    sourceId: string;
    sourceUrl: string;
    officialUrl: string;
    publisher: string;
    verificationStatus: string;
    freshnessStatus: string;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  modelStatus: string;
  modelVersion: string;
}

const SKILL_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  postgres: 'postgresql',
  db: 'database',
  'react.js': 'react',
  reactjs: 'react',
  'node.js': 'node',
};

const RIASEC_DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'];

export function normalizeSkill(skill: string): string {
  if (!skill || typeof skill !== 'string') return '';
  const cleaned = skill.toLowerCase().trim().replace(/[^\w\s-]/g, '');
  return SKILL_ALIASES[cleaned] || cleaned;
}

export function normalizeSkillList(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of skills || []) {
    const norm = normalizeSkill(s);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  }
  return result;
}

export function extractRiasecVector(profileScores: Record<string, number> = {}): number[] {
  const vec = RIASEC_DIMENSIONS.map((dim) => {
    const val = Number(profileScores[dim] ?? profileScores[dim.toLowerCase()] ?? 0);
    return Math.max(0, val);
  });
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : [0, 0, 0, 0, 0, 0];
}

export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  if (norm1 === 0 || norm2 === 0) return 0;
  return Math.max(0, Math.min(1, dot / (norm1 * norm2)));
}

export function evaluateEligibility(student: StudentInput, career: CareerRecord): EligibilityResult {
  const reasons: string[] = [];
  const blockingReasons: string[] = [];
  const missingRequirements: string[] = [];

  const marks = student.marks || {};
  const fscPct = marks.fscPct;
  const matricPct = marks.matricPct;
  const stream = student.preferredStream || student.stream;

  if (fscPct === undefined && matricPct === undefined) {
    return {
      status: 'INSUFFICIENT_DATA',
      reasons: ['Student academic marks (FSc/Matric) are not provided.'],
      blockingReasons: [],
      missingRequirements: ['fscPct', 'matricPct'],
    };
  }

  const minFsc = career.min_fsc_pct ?? 50;
  const actualFsc = fscPct ?? matricPct ?? 0;

  if (actualFsc < minFsc) {
    blockingReasons.push(`FSc score (${actualFsc}%) is below the minimum required cutoff (${minFsc}%).`);
    missingRequirements.push(`FSc >= ${minFsc}%`);
  }

  const acceptedStreams = career.accepted_streams || [];
  if (acceptedStreams.length > 0 && stream && !acceptedStreams.includes(stream)) {
    if (stream === 'Arts' && (career.category || '').includes('Medical')) {
      blockingReasons.push(`Education stream '${stream}' is not eligible for '${career.category}'. Required: ${acceptedStreams.join(', ')}.`);
      missingRequirements.push(`Stream in ${acceptedStreams.join(', ')}`);
    } else {
      reasons.push(`Stream '${stream}' is non-standard for '${career.title}'. Marked as Exploratory.`);
    }
  }

  let status: 'ELIGIBLE' | 'INELIGIBLE' | 'EXPLORATORY' | 'INSUFFICIENT_DATA' = 'ELIGIBLE';
  if (blockingReasons.length > 0) {
    status = 'INELIGIBLE';
  } else if (reasons.length > 0) {
    status = 'EXPLORATORY';
  } else {
    reasons.push('Student meets academic cutoff and stream requirements.');
  }

  return { status, reasons, blockingReasons, missingRequirements };
}

export function rankCareerDynamic(student: StudentInput, career: CareerRecord): RankerResult {
  const eligibility = evaluateEligibility(student, career);

  // 1. RIASEC Vector Cosine Similarity
  const studentScores = student.riasecScores || student.riasec || {};
  const careerScores = career.riasec || {};
  const studentVec = extractRiasecVector(studentScores);
  const careerVec = extractRiasecVector(careerScores);
  const riasecSim = calculateCosineSimilarity(studentVec, careerVec);
  const riasecScore = Math.round(riasecSim * 1000) / 10;

  // 2. Skill Fit Ratio
  const studentSkills = normalizeSkillList(student.skills || []);
  const reqSkills = normalizeSkillList(career.requiredSkills || career.required_skills || []);
  const matchedSkills = reqSkills.filter((s) => studentSkills.includes(s));
  const missingSkills = reqSkills.filter((s) => !studentSkills.includes(s));

  const skillScore = reqSkills.length > 0
    ? Math.round((matchedSkills.length / reqSkills.length) * 1000) / 10
    : 70.0;

  // 3. Academic Stream & Cutoff Fit
  const fscPct = student.marks?.fscPct ?? 60;
  const minFsc = career.min_fsc_pct ?? 50;
  const academicScore = Math.min(100.0, Math.max(0.0, Number(fscPct - minFsc + 50)));

  // 4. Education Compatibility
  const stream = student.preferredStream || student.stream;
  const acceptedStreams = career.accepted_streams || [];
  let eduCompat = 100.0;
  if (acceptedStreams.length > 0 && stream && !acceptedStreams.includes(stream)) {
    eduCompat = stream === 'ICS' && (career.category || '').includes('Technology') ? 85.0 : 40.0;
  }

  // 5. Provenance Source Confidence
  const provStatus = career.verification_status || 'VERIFIED';
  const officialUrl = career.official_url || career.source_url || 'https://pbs.gov.pk';
  const sourceConfidence = provStatus === 'VERIFIED' && officialUrl ? 95.0 : 50.0;

  // Weighted sum with unavailable factor redistribution
  const availableFactors: Record<string, { score: number; weight: number }> = {
    riasecFit: { score: riasecScore, weight: 0.20 },
    skillFit: { score: skillScore, weight: 0.20 },
    academicFit: { score: academicScore, weight: 0.15 },
    educationCompatibility: { score: eduCompat, weight: 0.10 },
    pakistaniRelevance: { score: 85.0, weight: 0.10 },
    sourceConfidence: { score: sourceConfidence, weight: 0.10 },
  };

  const totalWeight = Object.values(availableFactors).reduce((sum, f) => sum + f.weight, 0);
  const weightedSum = Object.values(availableFactors).reduce((sum, f) => sum + f.score * f.weight, 0);
  const finalScore = Math.round((weightedSum / totalWeight) * 10) / 10;

  const whyRecommended: string[] = [];
  if (riasecScore >= 70) whyRecommended.push(`Strong RIASEC personality match (${riasecScore}% similarity).`);
  if (matchedSkills.length > 0) whyRecommended.push(`Matching skills: ${matchedSkills.join(', ')}.`);
  if (eligibility.status === 'ELIGIBLE') whyRecommended.push('Fully satisfies academic cutoff and stream prerequisites.');

  const limitations: string[] = ['Live job market demand signal unavailable in catalog dataset.'];
  if (eligibility.status === 'INELIGIBLE') {
    limitations.push(`Ineligible due to: ${eligibility.blockingReasons.join('; ')}`);
  }

  return {
    careerId: career.id || career.title,
    title: career.title,
    score: finalScore,
    eligibility,
    factors: {
      riasecFit: riasecScore,
      skillFit: skillScore,
      academicFit: academicScore,
      educationCompatibility: eduCompat,
      pakistaniRelevance: 85.0,
      marketDemand: null,
      growth: null,
      sourceConfidence,
    },
    matchedSkills,
    missingSkills,
    whyRecommended,
    limitations,
    provenance: {
      sourceId: career.source_id || 'hec-pbs-catalog',
      sourceUrl: officialUrl,
      officialUrl: officialUrl,
      publisher: career.publisher || 'Pakistan Bureau of Statistics',
      verificationStatus: provStatus,
      freshnessStatus: career.freshness_status || 'FRESH',
    },
    confidence: sourceConfidence > 80 && eligibility.status === 'ELIGIBLE' ? 'HIGH' : 'MEDIUM',
    modelStatus: 'BASELINE_ONLY',
    modelVersion: 'baseline-hybrid-1.0.0',
  };
}

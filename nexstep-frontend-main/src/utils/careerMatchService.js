/**
 * careerMatchService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic career match scoring engine.
 *
 * DESIGN PRINCIPLES:
 *  - No random numbers. Same input always produces same output.
 *  - Every score is explainable — the function returns factor breakdowns.
 *  - Architecture is intentionally swappable: replace `computeCareerMatch`
 *    with a Gemini API call later without touching any UI components.
 *
 * SCORING MODEL (total 100 points):
 *  ┌─────────────────────────────────┬────────┐
 *  │ Factor                          │ Weight │
 *  ├─────────────────────────────────┼────────┤
 *  │ RIASEC / Interest Alignment     │  30 pts│
 *  │ Academic Stream Compatibility   │  25 pts│
 *  │ Skills Already Possessed        │  25 pts│
 *  │ Academic Performance (marks)    │  10 pts│
 *  │ Base Career Demand Bonus        │   10 pts│
 *  └─────────────────────────────────┴────────┘
 */

import { CAREERS_DATA } from '../data/careersData.js';

// ─────────────────────────────────────────────────────────────────────────────
// RIASEC CODE → human-readable label
// ─────────────────────────────────────────────────────────────────────────────
export const RIASEC_LABELS = {
  R: 'Realistic (Hands-on / Technical)',
  I: 'Investigative (Analytical / Scientific)',
  A: 'Artistic (Creative / Expressive)',
  S: 'Social (People-Oriented / Helping)',
  E: 'Enterprising (Leadership / Business)',
  C: 'Conventional (Organized / Detail-Oriented)',
};

// ─────────────────────────────────────────────────────────────────────────────
// STREAM → compatible career ids lookup
// ─────────────────────────────────────────────────────────────────────────────
const STREAM_CAREER_COMPATIBILITY = {
  'Pre-Medical':             ['car-2', 'car-6'],
  'FSc Pre-Medical':         ['car-2', 'car-6'],
  'Pre-Engineering':         ['car-1', 'car-3', 'car-4'],
  'FSc Pre-Engineering':     ['car-1', 'car-3', 'car-4'],
  'ICS (Comp Sci)':          ['car-1', 'car-3'],
  'ICS':                     ['car-1', 'car-3'],
  'ICOM (Commerce)':         ['car-5'],
  'ICOM':                    ['car-5'],
  'Arts/FA':                 ['car-7'],
  'FA / Humanities':         ['car-7'],
  'DAE (Diploma)':           ['car-4', 'car-8'],
  'TEVTA Trade':             ['car-8'],
  'A-Levels':                ['car-1', 'car-2', 'car-3', 'car-4', 'car-5', 'car-7'],
  'Cambridge A-Levels':      ['car-1', 'car-2', 'car-3', 'car-4', 'car-5', 'car-7'],
};

// ─────────────────────────────────────────────────────────────────────────────
// RIASEC cluster → career ids affinity map
// ─────────────────────────────────────────────────────────────────────────────
const RIASEC_CAREER_AFFINITY = {
  I: ['car-1', 'car-2', 'car-3', 'car-4', 'car-6'],
  R: ['car-4', 'car-8', 'car-2'],
  A: ['car-7'],
  S: ['car-2', 'car-5'],
  E: ['car-5', 'car-7'],
  C: ['car-1', 'car-3', 'car-5'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Demand bonus map
// ─────────────────────────────────────────────────────────────────────────────
const DEMAND_BONUS = {
  'Very High': 10,
  'High':       7,
  'Moderate':   4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalise a skill string for fuzzy comparison
// ─────────────────────────────────────────────────────────────────────────────
function normaliseSkill(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Check whether a user skill overlaps with a required skill
function skillsOverlap(userSkill, requiredSkill) {
  const u = normaliseSkill(userSkill);
  const r = normaliseSkill(requiredSkill);
  if (u === r) return true;
  if (u.length >= 4 && r.includes(u)) return true;
  if (r.length >= 4 && u.includes(r)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract user skill names from various profile shapes
// Profile.skills can be:
//   - string[]               (simple list)
//   - { name, level }[]      (onboarding format)
// ─────────────────────────────────────────────────────────────────────────────
function extractUserSkillNames(profile) {
  const raw = profile?.skills;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(s => (typeof s === 'string' ? s : s?.name ?? '')).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract primary RIASEC code letters from profile
// topRiasecCluster e.g. "I - Investigative (Scientific / Analytical)"
// ─────────────────────────────────────────────────────────────────────────────
function extractRiasecCodes(profile) {
  const cluster = profile?.topRiasecCluster ?? '';
  // Match single uppercase letters that are valid RIASEC codes
  const found = cluster.match(/\b[RIASEC]\b/g) ?? [];
  return [...new Set(found)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract numeric marks from profile
// ─────────────────────────────────────────────────────────────────────────────
function extractMarks(profile) {
  const m = profile?.marks ?? {};
  return {
    matricPct:      Number(m.matricPct)      || 0,
    fscPct:         Number(m.fscPct)         || 0,
    entryTestScore: Number(m.entryTestScore) || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY FUNCTION — compute match for a single career against a profile
// Returns:
// {
//   careerId, careerTitle,
//   totalScore,          // 0-100
//   factors: {
//     riasecScore, streamScore, skillsScore, marksScore, demandScore
//   },
//   explanation: {
//     matchingSkills,    // skills user already has
//     missingSkills,     // skills user needs to develop
//     skillMatchPct,     // 0-100
//     riasecAlignment,   // string explanation
//     streamNote,        // string explanation
//     marksNote,         // string explanation
//     whySummary,        // 2-3 sentence narrative
//     strengthPoints,    // string[]
//     gapPoints,         // string[]
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export function computeCareerMatch(profile, career) {
  const userSkills   = extractUserSkillNames(profile);
  const riasecCodes  = extractRiasecCodes(profile);
  const marks        = extractMarks(profile);
  const stream       = profile?.preferredStream ?? '';
  const requiredSkills = career.requiredSkills ?? [];

  // ── Factor 1: RIASEC Alignment (30 pts) ──────────────────────────────────
  let riasecScore = 0;
  const careerRiasec = career.riasecMatch ?? [];
  const matchedCodes = riasecCodes.filter(c => careerRiasec.includes(c));
  // Each matched code adds proportional points, max 3 codes for full score
  riasecScore = Math.min(30, Math.round((matchedCodes.length / Math.max(careerRiasec.length, 1)) * 30));

  // If no RIASEC data yet, award half credit (profile incomplete)
  if (riasecCodes.length === 0) riasecScore = 12;

  let riasecAlignment = '';
  if (riasecCodes.length === 0) {
    riasecAlignment = 'RIASEC quiz not yet completed — take the quiz for a personalised match.';
  } else if (matchedCodes.length === 0) {
    riasecAlignment = `Your interest profile (${riasecCodes.join(', ')}) does not directly align with this career's primary codes (${careerRiasec.join(', ')}). Consider exploring more suitable paths.`;
  } else {
    const labels = matchedCodes.map(c => RIASEC_LABELS[c] ?? c).join(', ');
    riasecAlignment = `Your ${labels} traits align with this career's requirements.`;
  }

  // ── Factor 2: Academic Stream Compatibility (25 pts) ─────────────────────
  let streamScore = 0;
  const compatibleCareers = STREAM_CAREER_COMPATIBILITY[stream] ?? [];
  let streamNote = '';

  if (compatibleCareers.includes(career.id)) {
    streamScore = 25;
    streamNote = `Your stream (${stream}) is a strong match for ${career.title}.`;
  } else if (stream === '' || stream === 'Undecided') {
    streamScore = 10;
    streamNote = 'No stream selected yet. Update your profile to improve accuracy.';
  } else {
    // Partial credit — stream is not incompatible but not ideal
    streamScore = 8;
    streamNote = `Your current stream (${stream}) is not the primary pathway for ${career.title}, but it is not a barrier if you plan to bridge via electives or certifications.`;
  }

  // ── Factor 3: Skills Already Possessed (25 pts) ──────────────────────────
  const matchingSkills = [];
  const missingSkills  = [];

  for (const req of requiredSkills) {
    const hasIt = userSkills.some(us => skillsOverlap(us, req));
    if (hasIt) {
      matchingSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  }

  const skillMatchPct = requiredSkills.length > 0
    ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
    : 50; // default if no required skills defined

  // If user hasn't entered skills, award partial credit
  const skillsScore = userSkills.length === 0
    ? 10
    : Math.round((skillMatchPct / 100) * 25);

  // ── Factor 4: Academic Performance (10 pts) ──────────────────────────────
  const bestAcademicPct = Math.max(marks.fscPct, marks.matricPct);
  let marksScore = 0;
  let marksNote  = '';

  if (bestAcademicPct >= 85) {
    marksScore = 10;
    marksNote = `Your academic score (${bestAcademicPct}%) meets top-tier university entry thresholds.`;
  } else if (bestAcademicPct >= 70) {
    marksScore = 7;
    marksNote = `Your academic score (${bestAcademicPct}%) qualifies for most mid-tier programmes.`;
  } else if (bestAcademicPct >= 55) {
    marksScore = 4;
    marksNote = `Your academic score (${bestAcademicPct}%) may require additional preparation for competitive entry.`;
  } else if (bestAcademicPct > 0) {
    marksScore = 2;
    marksNote = `Your academic score (${bestAcademicPct}%) suggests focusing on bridging courses or vocational pathways first.`;
  } else {
    marksScore = 5; // no data — neutral
    marksNote = 'Academic marks not yet entered — update your profile for a more accurate score.';
  }

  // ── Factor 5: Demand Bonus (10 pts) ──────────────────────────────────────
  const demandScore = DEMAND_BONUS[career.demandLevel] ?? 5;

  // ── Total ─────────────────────────────────────────────────────────────────
  const totalScore = Math.min(100,
    riasecScore + streamScore + skillsScore + marksScore + demandScore
  );

  // ── WHY narrative ─────────────────────────────────────────────────────────
  const strengthPoints = [];
  const gapPoints      = [];

  if (matchedCodes.length > 0) {
    strengthPoints.push(`Your interest profile (${matchedCodes.map(c => RIASEC_LABELS[c]).join(', ')}) aligns with this career.`);
  }
  if (streamScore >= 20) {
    strengthPoints.push(`Your academic stream (${stream}) is the recommended pathway for this career.`);
  }
  if (matchingSkills.length > 0) {
    strengthPoints.push(`You already have ${matchingSkills.length} of ${requiredSkills.length} required skills: ${matchingSkills.slice(0, 3).join(', ')}${matchingSkills.length > 3 ? '...' : ''}.`);
  }
  if (bestAcademicPct >= 75) {
    strengthPoints.push(`Strong academic performance (${bestAcademicPct}%) supports entry to competitive programmes.`);
  }

  if (missingSkills.length > 0) {
    gapPoints.push(`You are missing ${missingSkills.length} key skill${missingSkills.length > 1 ? 's' : ''}: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '...' : ''}.`);
  }
  if (streamScore < 15 && stream) {
    gapPoints.push(`Your stream (${stream}) is not the primary pathway — consider supplementary courses.`);
  }
  if (riasecCodes.length > 0 && matchedCodes.length === 0) {
    gapPoints.push("Your interest profile does not directly match this career's RIASEC requirements.");
  }

  let whySummary = '';
  if (totalScore >= 80) {
    whySummary = `${career.title} is a strong fit for your profile. Your academic background, interests, and existing skills align well with this career's core requirements.`;
  } else if (totalScore >= 60) {
    whySummary = `${career.title} is a moderate match. You have some foundational alignment, but filling specific skill gaps will significantly improve your readiness.`;
  } else if (totalScore >= 40) {
    whySummary = `${career.title} is a possible path but requires significant preparation. Consider whether your interests and academic background can support the transition.`;
  } else {
    whySummary = `${career.title} has low alignment with your current profile. Completing the RIASEC quiz and updating your skills will give you a more accurate picture.`;
  }

  return {
    careerId:   career.id,
    careerTitle: career.title,
    totalScore,
    factors: {
      riasecScore,
      streamScore,
      skillsScore,
      marksScore,
      demandScore,
    },
    explanation: {
      matchingSkills,
      missingSkills,
      skillMatchPct,
      riasecAlignment,
      streamNote,
      marksNote,
      whySummary,
      strengthPoints,
      gapPoints,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: rank ALL careers for a given profile
// Returns CAREERS_DATA enriched with { matchResult } sorted by totalScore desc
// ─────────────────────────────────────────────────────────────────────────────
export function rankAllCareers(profile) {
  return CAREERS_DATA
    .map(career => ({
      ...career,
      matchResult: computeCareerMatch(profile, career),
    }))
    .sort((a, b) => b.matchResult.totalScore - a.matchResult.totalScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill gap summary for SkillGapTab
// Returns { currentSkills, missingSkills, skillMatchPct, priority[] }
// ─────────────────────────────────────────────────────────────────────────────
export function computeSkillGap(profile, career) {
  const result = computeCareerMatch(profile, career);
  const { matchingSkills, missingSkills, skillMatchPct } = result.explanation;

  // Priority: skills that appear early in requiredSkills list are higher priority
  const requiredSkills = career.requiredSkills ?? [];
  const prioritised = missingSkills.map((skill, idx) => ({
    skill,
    priority: idx < 3 ? 'High' : idx < 6 ? 'Medium' : 'Low',
    difficulty: estimateSkillDifficulty(skill),
  }));

  return {
    targetCareer:   career.title,
    currentSkills:  matchingSkills,
    missingSkills:  prioritised,
    skillMatchPct,
    totalRequired:  requiredSkills.length,
    totalHave:      matchingSkills.length,
  };
}

// Simple difficulty heuristic based on keywords
function estimateSkillDifficulty(skill) {
  const hard = ['machine learning', 'algorithm', 'calculus', 'system design', 'pharmacology', 'audit'];
  const med  = ['sql', 'git', 'react', 'python', 'excel', 'figma', 'research'];
  const s = skill.toLowerCase();
  if (hard.some(h => s.includes(h))) return 'Advanced';
  if (med.some(m => s.includes(m)))  return 'Intermediate';
  return 'Beginner';
}

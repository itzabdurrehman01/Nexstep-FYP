/**
 * roadmapService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Persistence abstraction for Career Roadmap state.
 *
 * CURRENT STORAGE: localStorage (no auth required).
 * FUTURE MIGRATION: Replace load/save/reset with authenticated API calls
 * (GET/PUT /api/roadmap) without changing any UI component code.
 *
 * DATA SHAPE:
 * {
 *   selectedCareerId: string,
 *   milestones: Milestone[],
 *   lastUpdated: ISO string,
 * }
 *
 * Milestone shape:
 * {
 *   id: number,
 *   title: string,
 *   period: string,
 *   status: 'completed' | 'current' | 'upcoming',
 *   tasks: Task[],
 * }
 *
 * Task shape:
 * { id: string, text: string, done: boolean }
 */

const STORAGE_KEY = 'nexstep_roadmap_v1';

function normalizeRoadmapState(value) {
  if (!value || !Array.isArray(value.milestones)) return null;

  return {
    ...value,
    milestones: value.milestones
      .filter(Boolean)
      .map((milestone) => ({
        ...milestone,
        tasks: Array.isArray(milestone.tasks) ? milestone.tasks.filter(Boolean) : [],
      })),
  };
}

// ── Default roadmap data keyed by career/stream ───────────────────────────────
// When a user selects a career the roadmap auto-populates with relevant milestones.
// Each career produces a tailored 4-milestone progression from current education
// through first job/internship.

const DEFAULT_ROADMAPS = {
  'car-1': {
    // Software & AI Engineering
    label: 'Software & AI Engineering',
    milestones: [
      {
        id: 1,
        title: 'Matric / O-Levels Foundation',
        period: 'Grade 9–10 · Foundation Stage',
        status: 'completed',
        tasks: [
          { id: 't1-1', text: 'Complete Matric in Science (Computer / Math)', done: true },
          { id: 't1-2', text: 'Score 75%+ in Matric BISE', done: true },
          { id: 't1-3', text: 'Choose ICS or Pre-Engineering stream for FSc', done: true },
        ],
      },
      {
        id: 2,
        title: 'FSc / ICS & Entry Test Preparation',
        period: 'Grade 11–12 · Currently Active',
        status: 'current',
        tasks: [
          { id: 't2-1', text: 'Complete ICS with 75%+ marks', done: false },
          { id: 't2-2', text: 'Prepare for NUST NET / FAST NTS-NAT entry tests', done: false },
          { id: 't2-3', text: 'Practice 5 NTS-NAT past papers (Physics, Math, English)', done: false },
          { id: 't2-4', text: 'Enroll in DigiSkills Python Starter course (free)', done: false },
          { id: 't2-5', text: 'Apply for Ehsaas / PEEF Undergraduate Scholarship', done: false },
        ],
      },
      {
        id: 3,
        title: 'University Admission & BS CS / SE Enrollment',
        period: 'Year 1–4 · Upcoming',
        status: 'upcoming',
        tasks: [
          { id: 't3-1', text: 'Secure seat at NUST, FAST-NUCES, Air Uni, or COMSATS', done: false },
          { id: 't3-2', text: 'Complete DS&A (Data Structures & Algorithms) coursework', done: false },
          { id: 't3-3', text: 'Build 2 personal projects on GitHub', done: false },
          { id: 't3-4', text: 'Learn React.js / Node.js for web development', done: false },
          { id: 't3-5', text: 'Complete Google Data Analytics Certificate (Coursera)', done: false },
        ],
      },
      {
        id: 4,
        title: 'Internship & Entry-Level Career Launch',
        period: 'Year 3–4 / Post-Graduation · Future Goal',
        status: 'upcoming',
        tasks: [
          { id: 't4-1', text: 'Apply for paid summer internship at Systems Ltd / Arbisoft / Afiniti', done: false },
          { id: 't4-2', text: 'Build portfolio with 3 production-quality projects', done: false },
          { id: 't4-3', text: 'Practice mock technical interviews on NexStep AI', done: false },
          { id: 't4-4', text: 'Secure first full-time Software / AI Engineer role (target: PKR 100k+/mo)', done: false },
        ],
      },
    ],
  },

  'car-2': {
    label: 'Medicine & Surgery (MBBS)',
    milestones: [
      {
        id: 1, title: 'Matric Foundation', period: 'Grade 9–10 · Completed', status: 'completed',
        tasks: [
          { id: 't1-1', text: 'Complete Matric in Science with Biology', done: true },
          { id: 't1-2', text: 'Score 85%+ for Pre-Medical eligibility', done: true },
          { id: 't1-3', text: 'Select FSc Pre-Medical stream', done: true },
        ],
      },
      {
        id: 2, title: 'FSc Pre-Medical & MDCAT Preparation', period: 'Grade 11–12 · Currently Active', status: 'current',
        tasks: [
          { id: 't2-1', text: 'Complete FSc Pre-Medical with 85%+ marks', done: false },
          { id: 't2-2', text: 'Register for UHS / DUHS / KMU MDCAT', done: false },
          { id: 't2-3', text: 'Complete 3,000+ MDCAT practice MCQs (Biology, Chemistry, Physics, English)', done: false },
          { id: 't2-4', text: 'Join a reputable MDCAT prep academy (KIPS / STEP)', done: false },
          { id: 't2-5', text: 'Apply for PEEF / Ehsaas scholarship for medical students', done: false },
        ],
      },
      {
        id: 3, title: 'MBBS Enrollment & Clinical Years', period: 'Year 1–5 · Upcoming', status: 'upcoming',
        tasks: [
          { id: 't3-1', text: 'Secure MBBS seat at KEMU, Aga Khan, Dow, or AIMC', done: false },
          { id: 't3-2', text: 'Complete pre-clinical years (Anatomy, Physiology, Biochemistry)', done: false },
          { id: 't3-3', text: 'Attend clinical rotations at teaching hospital', done: false },
          { id: 't3-4', text: 'Pass USMLE Step 1 foundation subjects for international pathway', done: false },
        ],
      },
      {
        id: 4, title: 'House Job & Specialisation', period: 'Year 6–7 · Future Goal', status: 'upcoming',
        tasks: [
          { id: 't4-1', text: 'Complete 1-year mandatory House Job at government hospital', done: false },
          { id: 't4-2', text: 'Apply for FCPS / MS specialisation programme', done: false },
          { id: 't4-3', text: 'Explore PLAB / USMLE for UK/USA medical practice', done: false },
        ],
      },
    ],
  },

  'car-3': {
    label: 'Data Science & Cyber Security',
    milestones: [
      {
        id: 1, title: 'Matric & Stream Selection', period: 'Grade 9–10 · Completed', status: 'completed',
        tasks: [
          { id: 't1-1', text: 'Complete Matric in Science (Computer / Math)', done: true },
          { id: 't1-2', text: 'Select ICS or Pre-Engineering for FSc', done: true },
        ],
      },
      {
        id: 2, title: 'FSc / ICS & Entry Test Prep', period: 'Grade 11–12 · Currently Active', status: 'current',
        tasks: [
          { id: 't2-1', text: 'Complete ICS / Pre-Engineering with 75%+ marks', done: false },
          { id: 't2-2', text: 'Prepare for NUST NET or FAST NTS-NAT', done: false },
          { id: 't2-3', text: 'Start learning Python & statistics basics (freeCodeCamp)', done: false },
          { id: 't2-4', text: 'Complete CEH (Certified Ethical Hacker) intro course', done: false },
        ],
      },
      {
        id: 3, title: 'BS Enrollment & Core Skill Building', period: 'Year 1–4 · Upcoming', status: 'upcoming',
        tasks: [
          { id: 't3-1', text: 'Secure BS CS / Data Science seat at NUST / Air Uni / FAST', done: false },
          { id: 't3-2', text: 'Complete SQL, Python, and Machine Learning coursework', done: false },
          { id: 't3-3', text: 'Participate in HackBash / Kaggle competitions', done: false },
          { id: 't3-4', text: 'Earn Google Cybersecurity Certificate (Coursera)', done: false },
        ],
      },
      {
        id: 4, title: 'Internship & Career Launch', period: 'Year 3–4 / Post-Grad · Future Goal', status: 'upcoming',
        tasks: [
          { id: 't4-1', text: 'Apply for Data Analyst / SOC Analyst internship', done: false },
          { id: 't4-2', text: 'Build end-to-end data project (public GitHub portfolio)', done: false },
          { id: 't4-3', text: 'Attempt bug bounty programmes (HackerOne, Bugcrowd)', done: false },
          { id: 't4-4', text: 'Secure first role: Data Engineer or Information Security Analyst', done: false },
        ],
      },
    ],
  },

  // Shared generic fallback for any other career
  default: {
    label: 'Career Pathway',
    milestones: [
      {
        id: 1, title: 'Academic Foundation', period: 'Current Education · Foundation', status: 'completed',
        tasks: [
          { id: 't1-1', text: 'Complete current grade / examination with strong marks', done: true },
          { id: 't1-2', text: 'Identify primary career interest using RIASEC Quiz', done: true },
          { id: 't1-3', text: 'Research suitable academic streams', done: false },
        ],
      },
      {
        id: 2, title: 'Skill Building & Qualification', period: 'Next 6–12 Months · Active', status: 'current',
        tasks: [
          { id: 't2-1', text: 'Complete at least one free certified online course', done: false },
          { id: 't2-2', text: 'Prepare for relevant entry test or qualification exam', done: false },
          { id: 't2-3', text: 'Build foundational skills identified in Skill Gap Analysis', done: false },
          { id: 't2-4', text: 'Apply for financial aid / scholarship matched to your income bracket', done: false },
        ],
      },
      {
        id: 3, title: 'University / Advanced Education', period: '1–4 Years · Upcoming', status: 'upcoming',
        tasks: [
          { id: 't3-1', text: 'Secure admission at target institution', done: false },
          { id: 't3-2', text: 'Complete core programme coursework', done: false },
          { id: 't3-3', text: 'Join relevant professional societies or clubs', done: false },
          { id: 't3-4', text: 'Start building a professional portfolio', done: false },
        ],
      },
      {
        id: 4, title: 'Internship & Career Entry', period: 'Post-Education · Future Goal', status: 'upcoming',
        tasks: [
          { id: 't4-1', text: 'Apply for relevant internship / trainee programme', done: false },
          { id: 't4-2', text: 'Practice AI mock interview sessions on NexStep', done: false },
          { id: 't4-3', text: 'Complete an ATS-optimised resume via NexStep Resume Builder', done: false },
          { id: 't4-4', text: 'Secure first professional role aligned to your career goal', done: false },
        ],
      },
    ],
  },
};

/** Return the canonical roadmap template for a given careerId. */
export function getDefaultMilestonesForCareer(careerId) {
  const template = DEFAULT_ROADMAPS[careerId] ?? DEFAULT_ROADMAPS.default;
  // Deep clone so mutations don't affect the template
  return JSON.parse(JSON.stringify(template.milestones));
}

/** All available roadmap career options for the picker */
export function getRoadmapCareerOptions() {
  return Object.entries(DEFAULT_ROADMAPS)
    .filter(([id]) => id !== 'default')
    .map(([id, data]) => ({ id, label: data.label }));
}

// ── Persistence layer ─────────────────────────────────────────────────────────
// Strategy:
//   1. Try the authenticated backend API first (POST/GET /api/roadmap).
//   2. Fall back to localStorage when the user is unauthenticated
//      or the network is unavailable.
//   This means progress persists across devices once the user is logged in,
//   and still works locally for unauthenticated demo use.

/** Load roadmap — prefers backend, falls back to localStorage. */
export async function loadRoadmapAsync() {
  try {
    const res = await fetch('/api/roadmap', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      const normalized = normalizeRoadmapState(json.data);
      if (normalized) {
        // Mirror to localStorage so offline reads are also fresh
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
        return normalized;
      }
    }
  } catch {
    // Network unavailable — fall through to localStorage
  }
  return loadRoadmap();
}

/** Save roadmap — writes to backend when authenticated, always mirrors to localStorage. */
export async function saveRoadmapAsync(state) {
  // Always write localStorage immediately (instant local persistence)
  saveRoadmap(state);
  // Best-effort backend sync
  try {
    await fetch('/api/roadmap', {
      method:      'PUT',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(state),
    });
  } catch {
    // Silently ignore — localStorage already has the data
  }
}

/** Reset roadmap — clears both backend and localStorage. */
export async function resetRoadmapAsync() {
  resetRoadmap(); // clear localStorage immediately
  try {
    await fetch('/api/roadmap', { method: 'DELETE', credentials: 'include' });
  } catch {
    // silent
  }
}

/** Load saved roadmap state from localStorage only. Returns null if nothing saved. */
export function loadRoadmap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeRoadmapState(parsed);
  } catch {
    return null;
  }
}

/** Save the full roadmap state to localStorage synchronously. */
export function saveRoadmap(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      lastUpdated: new Date().toISOString(),
    }));
  } catch {
    // localStorage unavailable
  }
}

/** Clear saved roadmap from localStorage. */
export function resetRoadmap() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

/** Compute high-level progress metrics from milestones array. */
export function computeRoadmapProgress(milestones) {
  const safeMilestones = Array.isArray(milestones)
    ? milestones.filter(Boolean).map((milestone) => ({
        ...milestone,
        tasks: Array.isArray(milestone.tasks) ? milestone.tasks.filter(Boolean) : [],
      }))
    : [];
  let totalTasks = 0;
  let doneTasks = 0;
  let completedMilestones = 0;

  for (const m of safeMilestones) {
    for (const t of m.tasks) {
      totalTasks++;
      if (t.done) doneTasks++;
    }
    if (m.status === 'completed') completedMilestones++;
  }

  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const currentMilestone = safeMilestones.find(m => m.status === 'current') ?? safeMilestones[0];
  const upcomingTasks = safeMilestones
    .flatMap(m => m.tasks)
    .filter(t => !t.done)
    .slice(0, 5);

  return {
    totalTasks,
    doneTasks,
    pct,
    completedMilestones,
    totalMilestones: safeMilestones.length,
    currentMilestone,
    upcomingTasks,
  };
}

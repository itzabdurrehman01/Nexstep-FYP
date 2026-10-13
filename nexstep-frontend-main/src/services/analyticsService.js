/**
 * analyticsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives real analytics values from live application data.
 *
 * DATA SOURCES (no fake numbers):
 *   1. profile            — skills, marks, RIASEC, stream
 *   2. careerMatchService — live match scores per career
 *   3. roadmapService     — persisted task completion %
 *   4. localStorage       — interview history (written by MockInterviewTab)
 *   5. /api/applications  — applied jobs, courses, universities
 *   6. /api/quiz-results  — RIASEC history
 *
 * ARCHITECTURE:
 *   - All pure-function helpers are synchronous (no fetches).
 *   - loadAnalyticsData() is async — fetches the backend-persisted tables
 *     and returns the full merged analytics payload.
 *   - The AnalyticsTab calls loadAnalyticsData() once on mount and re-calls
 *     when profile changes.
 *   - No hardcoded numbers. If data is absent, functions return null / [].
 */

import { rankAllCareers, computeSkillGap } from '../utils/careerMatchService.js';
import { loadRoadmap, computeRoadmapProgress } from './roadmapService.js';
import { CAREERS_DATA } from '../data/careersData.js';

export const INTERVIEW_HISTORY_KEY = 'nexstep_interview_history_v1';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CAREER MATCH  (synchronous, from profile)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the top-N ranked career matches for this profile.
 * Each entry: { title, shortTitle, score, demandLevel }
 */
export function getCareerMatchData(profile, topN = 5) {
  const ranked = rankAllCareers(profile);
  return ranked.slice(0, topN).map(c => ({
    title: c.title,
    shortTitle: c.title.split(' ').slice(0, 3).join(' '),
    score: c.matchResult.totalScore,
    demandLevel: c.demandLevel,
  }));
}

/**
 * Returns the best single career match score (0-100).
 */
export function getBestCareerMatchScore(profile) {
  const ranked = rankAllCareers(profile);
  return ranked.length > 0 ? ranked[0].matchResult.totalScore : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SKILL ANALYSIS  (synchronous, from profile)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns skill readiness data suitable for a bar/radar chart.
 * Uses the user's top career match as the target.
 * Each entry: { skill, level, status: 'have' | 'missing' }
 */
export function getSkillReadinessData(profile) {
  const ranked = rankAllCareers(profile);
  if (!ranked.length) return [];

  const topCareer = ranked[0];
  const gap = computeSkillGap(profile, topCareer);

  const haveItems = gap.currentSkills.map(s => ({
    skill: s.length > 22 ? s.slice(0, 22) + '…' : s,
    fullSkill: s,
    value: 100,
    status: 'have',
  }));

  const missingItems = gap.missingSkills.map(item => ({
    skill: item.skill.length > 22 ? item.skill.slice(0, 22) + '…' : item.skill,
    fullSkill: item.skill,
    value: 0,
    status: 'missing',
    priority: item.priority,
  }));

  return [...haveItems, ...missingItems];
}

/**
 * Returns { skillMatchPct, totalHave, totalRequired, targetCareer }
 * for the top-matched career.
 */
export function getSkillGapSummary(profile) {
  const ranked = rankAllCareers(profile);
  if (!ranked.length) return { skillMatchPct: 0, totalHave: 0, totalRequired: 0, targetCareer: '—' };

  const topCareer = ranked[0];
  const gap = computeSkillGap(profile, topCareer);
  return {
    skillMatchPct: gap.skillMatchPct,
    totalHave: gap.totalHave,
    totalRequired: gap.totalRequired,
    targetCareer: gap.targetCareer,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROADMAP PROGRESS  (synchronous, from localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export function getRoadmapAnalytics() {
  const saved = loadRoadmap();
  if (!saved) return null;

  const prog = computeRoadmapProgress(saved.milestones);
  const perMilestone = saved.milestones.map(m => {
    const done = m.tasks.filter(t => t.done).length;
    return {
      name: m.title.split(' ').slice(0, 3).join(' '),
      fullTitle: m.title,
      completed: done,
      total: m.tasks.length,
      pct: m.tasks.length > 0 ? Math.round((done / m.tasks.length) * 100) : 0,
      status: m.status,
    };
  });

  return {
    overallPct: prog.pct,
    doneTasks: prog.doneTasks,
    totalTasks: prog.totalTasks,
    completedMilestones: prog.completedMilestones,
    totalMilestones: prog.totalMilestones,
    perMilestone,
    lastUpdated: saved.lastUpdated ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTERVIEW HISTORY
//    Write:  POST /api/interviews (authenticated backend) + localStorage mirror
//    Read:   GET  /api/interviews (authenticated)  →  fallback to localStorage
// ─────────────────────────────────────────────────────────────────────────────

/** Load interview history from localStorage (sync, for offline fallback). */
export function loadInterviewHistory() {
  try {
    const raw = localStorage.getItem(INTERVIEW_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a completed interview session.
 * - Always writes to localStorage immediately (instant, no auth required).
 * - Best-effort POST to /api/interviews so data is server-scoped per user.
 * - Failures are silently ignored — localStorage copy is the reliable fallback.
 */
export async function saveInterviewSession(session) {
  // 1. Persist locally first (synchronous, instant)
  try {
    const existing = loadInterviewHistory();
    const updated  = [session, ...existing].slice(0, 20);
    localStorage.setItem(INTERVIEW_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — silent
  }

  // 2. Mirror to authenticated backend (async, best-effort)
  try {
    await fetch('/api/interviews', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({
        category:          session.category,
        difficulty:        session.difficulty,
        overallScore:      session.overallScore,
        grade:             session.grade,
        totalQuestions:    session.totalQuestions,
        topStrengths:      session.topStrengths      ?? [],
        areasToImprove:    session.areasToImprove    ?? [],
        recommendedTopics: session.recommendedTopics ?? [],
        perQuestion:       session.perQuestion       ?? [],
      }),
    });
  } catch {
    // Network / auth failure — localStorage copy already saved
  }
}

/**
 * Load interview history — prefers authenticated backend, falls back to localStorage.
 * Returns an array of sessions sorted newest-first.
 */
export async function loadInterviewHistoryAsync() {
  try {
    const res = await fetch('/api/interviews', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        // Mirror to localStorage so analytics works offline too
        try {
          const normalised = json.data.map(s => ({
            ...s,
            overallScore: s.overallScore ?? 0,
            category:     s.category     ?? 'General',
          }));
          localStorage.setItem(INTERVIEW_HISTORY_KEY, JSON.stringify(normalised));
          return normalised;
        } catch {}
        return json.data;
      }
    }
  } catch {
    // Network unavailable — fall through
  }
  return loadInterviewHistory();
}

/**
 * Aggregate interview analytics from history.
 * Returns null if no history exists.
 */
export function getInterviewAnalytics(history) {
  // Accept either a pre-loaded array or load from localStorage
  const hist = Array.isArray(history) ? history : loadInterviewHistory();
  if (!hist.length) return null;

  const scores = hist.map(s => s.overallScore).filter(s => typeof s === 'number');
  if (!scores.length) return null;

  const avg   = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best  = Math.max(...scores);
  const last  = scores[0];
  const trend = scores.length >= 2 ? last - scores[1] : 0;

  const chartData = hist.slice(0, 8).reverse().map((s, i) => ({
    session:  `S${i + 1}`,
    score:    s.overallScore,
    category: s.category ?? 'General',
    date:     s.date      ?? s.createdAt ?? '',
  }));

  return { avg, best, last, trend, totalSessions: hist.length, chartData };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. APPLICATION STATS  (async — fetches from authenticated backend)
// ─────────────────────────────────────────────────────────────────────────────

export async function getApplicationStats() {
  try {
    const res = await fetch('/api/applications', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    const apps = Array.isArray(data.data) ? data.data : [];

    const byType   = {};
    const byStatus = {};
    for (const a of apps) {
      const t = a.type   ?? 'Other';
      const s = a.status ?? 'Submitted';
      byType[t]   = (byType[t]   ?? 0) + 1;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    return {
      total:               apps.length,
      byType:              Object.entries(byType).map(([name, value]) => ({ name, value })),
      byStatus:            Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      recentApplications:  apps.slice(0, 5),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ACADEMIC MARKS OVERVIEW  (synchronous, from profile)
// ─────────────────────────────────────────────────────────────────────────────

export function getAcademicMarksData(profile) {
  const marks = profile?.marks ?? {};
  const items = [];

  if (marks.matricPct) items.push({ subject: 'Matric', score: Number(marks.matricPct), fill: '#10b981' });
  if (marks.fscPct)    items.push({ subject: 'FSc / Inter', score: Number(marks.fscPct), fill: '#3b82f6' });
  if (marks.entryTestScore) items.push({ subject: 'Entry Test', score: Number(marks.entryTestScore), fill: '#8b5cf6' });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PROFILE COMPLETION  (synchronous, from profile)
// ─────────────────────────────────────────────────────────────────────────────

export function getProfileCompletion(profile) {
  const checks = [
    { label: 'Name', done: !!profile?.name },
    { label: 'City', done: !!profile?.city },
    { label: 'Stream', done: !!profile?.preferredStream },
    { label: 'RIASEC Quiz', done: !!profile?.topRiasecCluster },
    { label: 'Matric Marks', done: !!profile?.marks?.matricPct },
    { label: 'FSc Marks', done: !!profile?.marks?.fscPct },
    { label: 'Entry Test Score', done: !!profile?.marks?.entryTestScore },
    { label: 'Skills Added', done: Array.isArray(profile?.skills) && profile.skills.length > 0 },
    { label: 'Target Career', done: !!profile?.targetCareer },
    { label: 'Career Goals', done: !!profile?.goals },
  ];
  const done = checks.filter(c => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  return { pct, done, total: checks.length, checks };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MASTER LOADER  (async — aggregates all sources)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all analytics data and returns a single merged object.
 * Call this from AnalyticsTab on mount and when profile changes.
 * Uses authenticated backend where available, falls back to localStorage.
 */
export async function loadAnalyticsData(profile) {
  // Fetch backend data in parallel — both use credentials automatically
  const [appStats, interviewHistory] = await Promise.all([
    getApplicationStats(),
    loadInterviewHistoryAsync(),
  ]);

  return {
    careerMatches:      getCareerMatchData(profile),
    bestCareerScore:    getBestCareerMatchScore(profile),
    skillReadiness:     getSkillReadinessData(profile),
    skillGapSummary:    getSkillGapSummary(profile),
    roadmap:            getRoadmapAnalytics(),
    interviewAnalytics: getInterviewAnalytics(interviewHistory),
    applications:       appStats,
    academicMarks:      getAcademicMarksData(profile),
    profileCompletion:  getProfileCompletion(profile),
  };
}

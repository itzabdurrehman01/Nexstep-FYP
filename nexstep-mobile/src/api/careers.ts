/**
 * mobile/src/api/careers.ts
 * Career and profile related API calls.
 */
import { apiClient } from './client';

const list = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

function normalizeJob(job: any, index: number) {
  return {
    ...job,
    id: String(job?.id ?? job?.jobId ?? `job-${index}`),
    title: String(job?.title ?? job?.jobTitle ?? 'Untitled opportunity'),
    company: String(job?.company ?? job?.companyName ?? 'Organisation not listed'),
    location: job?.location ?? job?.city ?? '',
    type: job?.type ?? job?.employmentType ?? '',
    salaryRange: job?.salaryRange ?? job?.salary ?? job?.stipendSalary ?? job?.compensation ?? '',
    skills: list<string>(job?.skills ?? job?.requirements ?? job?.qualifications ?? job?.keyRequirements),
    description: job?.description ?? job?.summary ?? '',
  };
}

function normalizeCareer(career: any, index: number) {
  return {
    ...career,
    id: String(career?.id ?? `career-${index}`),
    title: String(career?.title ?? career?.name ?? 'Career pathway'),
    demandLevel: String(career?.demandLevel ?? career?.demand_level ?? career?.demand ?? 'Growing'),
    avgSalaryPkrMonth: Number(career?.avgSalaryPkrMonth ?? career?.avg_salary_pkr ?? career?.avgSalaryPkr ?? career?.avgSalary ?? 0),
    growthDemand: String(career?.growthDemand ?? ''),
    requiredSkills: list<string>(career?.requiredSkills ?? career?.required_skills ?? career?.skills),
    riasecMatch: list<string>(career?.riasecMatch ?? career?.riasec_code?.split('-')),
  };
}

function normalizeRoadmap(value: any) {
  if (!value || !Array.isArray(value.milestones)) return null;
  return {
    ...value,
    milestones: value.milestones.filter(Boolean).map((milestone: any) => ({
      ...milestone,
      tasks: list<any>(milestone?.tasks).filter(Boolean),
    })),
  };
}

export async function fetchCareers() {
  const { data } = await apiClient.get('/api/careers');
  return list<any>(data?.data).map(normalizeCareer);
}

export async function fetchRecommendations(profile: any) {
  const { data } = await apiClient.post('/api/recommendations', {
    fscPct: profile?.marks?.fscPct,
    entryTestScore: profile?.marks?.entryTestScore,
    stream: profile?.preferredStream,
    city: profile?.city,
    budgetAnnualPkr: profile?.budgetAnnualPkr,
    topRiasecCluster: profile?.topRiasecCluster,
    interests: [profile?.targetCareer, profile?.goals, ...(profile?.skills ?? []).map((skill: any) => typeof skill === 'string' ? skill : skill?.name)],
  });
  return list<any>(data?.matches).map(normalizeCareer).map((career: any, index) => ({
    ...career,
    id: String(career.id ?? `recommendation-${index}`),
    matchScore: Number(career.matchScore) || 0,
    why: list<string>(career.why),
    entryTests: list<string>(career.entryTests),
    topUniversities: list<any>(career.topUniversities),
  }));
}

export async function fetchProfile() {
  const { data } = await apiClient.get('/api/profile');
  return data?.data ?? null;
}

export async function updateProfile(profile: Record<string, any>) {
  const { data } = await apiClient.put('/api/profile', profile);
  return data?.data ?? profile;
}

export async function saveEducation(payload: {
  level: string;
  stream?: string | null;
  institution?: string | null;
  startedAt?: string;
  promotionDate?: string | null;
  marks?: { matricPct?: number; fscPct?: number; entryTestScore?: number };
}) {
  const { data } = await apiClient.put('/api/education', payload);
  return data?.data ?? payload;
}

export async function fetchRoadmap() {
  const { data } = await apiClient.get('/api/roadmap');
  return normalizeRoadmap(data?.data);
}

export async function fetchJobs() {
  const { data } = await apiClient.get('/api/jobs');
  return list<any>(data?.data).map(normalizeJob);
}

export async function fetchUniversities(params?: Record<string, string>) {
  const { data } = await apiClient.get('/api/universities', { params });
  return list(data?.data);
}

export async function fetchCourses(params?: Record<string, string>) {
  const { data } = await apiClient.get('/api/courses', { params });
  return list<any>(data?.data);
}

export async function analyzeSkillGap(payload: { careerId: string; stream?: string; marks?: any; skills?: string[] }) {
  const { data } = await apiClient.post('/api/user/skill-gap', payload);
  return data;
}

export async function evaluateInterview(payload: { question: string; answer: string; category?: string; difficulty?: string; profile?: any }) {
  const { data } = await apiClient.post('/api/interview/evaluate', payload, { timeout: 60_000 });
  return data;
}

export async function fetchMentorDashboard() {
  const [profile, sessions, students, stats] = await Promise.all([
    apiClient.get('/api/mentor/profile'),
    apiClient.get('/api/mentor/sessions'),
    apiClient.get('/api/mentor/students'),
    apiClient.get('/api/mentor/stats'),
  ]);
  return {
    profile: profile.data?.data ?? profile.data,
    sessions: list<any>(sessions.data?.data),
    students: list<any>(students.data?.data),
    stats: stats.data?.data ?? stats.data ?? {},
  };
}

export async function fetchAlertsAndNotifications() {
  try { await apiClient.post('/api/alerts/due'); } catch { /* still load list */ }
  const [alerts, notifications] = await Promise.all([
    apiClient.get('/api/alerts'),
    apiClient.get('/api/notifications'),
  ]);
  return {
    alerts: list<any>(alerts.data?.data),
    notifications: list<any>(notifications.data?.data),
  };
}

export async function createAlert(payload: any) {
  const { data } = await apiClient.post('/api/alerts', payload);
  return data?.data;
}

export async function updateAlert(id: string, payload: any) {
  const { data } = await apiClient.put(`/api/alerts/${id}`, payload);
  return data?.data;
}

export async function deleteAlert(id: string) {
  await apiClient.delete(`/api/alerts/${id}`);
}

export async function markAllNotificationsRead() {
  await apiClient.post('/api/notifications/read-all');
}

export async function fetchStudentAnalytics() {
  const [profile, applications, quizzes, interviews, roadmap] = await Promise.all([
    apiClient.get('/api/profile'),
    apiClient.get('/api/applications'),
    apiClient.get('/api/quiz-results'),
    apiClient.get('/api/interviews'),
    apiClient.get('/api/roadmap'),
  ]);
  return {
    profile: profile.data?.data ?? {},
    applications: list<any>(applications.data?.data),
    quizzes: list<any>(quizzes.data?.data),
    interviews: list<any>(interviews.data?.data),
    roadmap: roadmap.data?.data ?? null,
  };
}

export async function fetchMockInterviewHistory() {
  const { data } = await apiClient.get('/api/mock-interviews');
  return list<any>(data?.data);
}

export async function fetchMentorReviewQueue() {
  const { data } = await apiClient.get('/api/mock-interviews/review-queue');
  return list<any>(data?.data);
}

export async function fetchScholarships(params?: Record<string, string>) {
  const { data } = await apiClient.get('/api/scholarships', { params });
  return list(data?.data);
}

export async function fetchCareerMatches(sort: 'balanced' | 'interest' | 'marks' = 'balanced') {
  const { data } = await apiClient.get('/api/career-ai/matches', { params: { sort } });
  return {
    sort: data?.sort || sort,
    profile: data?.profile ?? null,
    limited: Boolean(data?.limited),
    matches: list<any>(data?.data).map((row: any, index: number) => ({
      ...normalizeCareer(row.career ?? row, index),
      matchScore: Number(row.score ?? row.matchScore) || 0,
      fit: row.fit,
      factors: list<any>(row.factors),
      why: list<string>(row.strengths),
      category: row.career?.category ?? row.category,
    })),
  };
}

export async function fetchQuizResults() {
  const { data } = await apiClient.get('/api/quiz-results');
  return list<any>(data?.data);
}

export async function fetchRiasecQuestions(attempt = 0) {
  const { data } = await apiClient.get('/api/riasec/questions', { params: { attempt } });
  return list<any>(data?.data).map((question, index) => ({
    id: Number(question?.id ?? index + 1),
    category: String(question?.category ?? 'I'),
    textEn: String(question?.textEn ?? ''),
    textUr: String(question?.textUr ?? question?.textEn ?? ''),
  }));
}

export async function saveQuizResult(result: { code: string; topTrait: string; streamRecommendation: string; fullScores: Record<string, number> }) {
  const { data } = await apiClient.post('/api/quiz-results', result);
  return data?.data ?? null;
}

export async function chatWithAI(message: string, profile?: any) {
  // AI generation can legitimately take longer than the default API timeout
  // while the provider handles demand or the server selects a fallback model.
  const { data } = await apiClient.post('/api/chat', { message, profile }, { timeout: 60_000 });
  return typeof data?.reply === 'string' ? data.reply : '';
}

export async function getSubscriptionStatus() {
  try {
    const { data } = await apiClient.get('/api/payments/subscription');
    return data?.data ?? null;
  } catch {
    return null;
  }
}

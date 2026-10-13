/**
 * Student/mentor endpoints used by the website — shared by every mobile screen
 * so API payloads stay identical to the web app.
 */
import { apiClient } from './client';

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const dataOf = (res: any) => res?.data?.data ?? res?.data ?? null;

export async function fetchBookmarks() {
  const { data } = await apiClient.get('/api/bookmarks');
  return list<any>(dataOf({ data }));
}

export async function addBookmark(item: { id: string; type: string; title: string; provider?: string; officialUrl?: string }) {
  const { data } = await apiClient.post('/api/bookmarks', item);
  return dataOf({ data });
}

export async function removeBookmark(itemId: string) {
  await apiClient.delete(`/api/bookmarks/${itemId}`);
}

export async function fetchApplications() {
  const { data } = await apiClient.get('/api/applications');
  return list<any>(dataOf({ data }));
}

export async function createApplication(payload: Record<string, any>) {
  const { data } = await apiClient.post('/api/applications', payload);
  return dataOf({ data });
}

export async function compareCareers(ids: string[]) {
  const { data } = await apiClient.post('/api/career-ai/compare', { ids });
  return dataOf({ data });
}

export async function setTargetCareer(careerId: string) {
  const { data } = await apiClient.put('/api/career-ai/target', { careerId });
  return data?.targetCareer ?? dataOf({ data });
}

export async function fetchCareerGap(careerId: string) {
  const { data } = await apiClient.get(`/api/career-ai/careers/${careerId}/gap`);
  return dataOf({ data });
}

export async function fetchProfileSkills() {
  const { data } = await apiClient.get('/api/profile/skills');
  return list<any>(dataOf({ data }));
}

export async function addCareerSkill(name: string, level = 'Beginner') {
  const { data } = await apiClient.post('/api/career-ai/skills', { name, level });
  return dataOf({ data });
}

export async function removeCareerSkill(name: string) {
  await apiClient.delete(`/api/career-ai/skills/${encodeURIComponent(name)}`);
}

export async function fetchConversations() {
  const { data } = await apiClient.get('/api/conversations', { params: { limit: 1 } });
  return list<any>(dataOf({ data }));
}

export async function fetchConversationMessages(id: string) {
  const { data } = await apiClient.get(`/api/conversations/${id}/messages`);
  return list<any>(dataOf({ data }));
}

export async function sendChat(payload: { message: string; profile?: any; language?: string; conversationId?: string; history?: { role: string; content: string }[] }) {
  const { data } = await apiClient.post('/api/chat', payload, { timeout: 60_000 });
  return data;
}

export async function fetchAiStatus() {
  const { data } = await apiClient.get('/api/ai/status');
  return data;
}

export async function fetchMentorSessions() {
  const { data } = await apiClient.get('/api/mentorship/my-sessions');
  return list<any>(dataOf({ data }));
}

export async function fetchMyMentors() {
  const { data } = await apiClient.get('/api/mentorship/my-mentors');
  return list<any>(dataOf({ data }));
}

export async function requestMentorship(payload: {
  mentorId: string;
  kind: string;
  topic: string;
  preferredAt: string;
  durationMinutes: number;
  message?: string;
}) {
  const { data } = await apiClient.post('/api/mentorship/requests', payload);
  return dataOf({ data });
}

export async function cancelMentorshipRequest(id: string) {
  await apiClient.post(`/api/mentorship/requests/${id}/cancel`, {});
}

export async function fetchMentorWorkspace() {
  const [students, sessions] = await Promise.all([
    apiClient.get('/api/mentorship/mentor/students'),
    apiClient.get('/api/mentorship/mentor/sessions'),
  ]);
  return {
    students: list<any>(dataOf(students)),
    sessions: list<any>(dataOf(sessions)),
  };
}

export async function actOnMentorSession(id: string, action: 'accept' | 'decline' | 'complete' | 'cancel') {
  const { data } = await apiClient.post(`/api/mentorship/mentor/sessions/${id}/${action}`, {});
  return dataOf({ data });
}

export async function fetchPaymentAccount() {
  const [me, methods, history] = await Promise.all([
    apiClient.get('/api/payments/me'),
    apiClient.get('/api/payments/manual-methods'),
    apiClient.get('/api/payments/history'),
  ]);
  return {
    me: dataOf(me),
    methods: list<any>(dataOf(methods)),
    history: list<any>(dataOf(history)),
  };
}

export async function submitManualPayment(payload: Record<string, any>) {
  const { data } = await apiClient.post('/api/payments/manual', payload);
  return dataOf({ data });
}

export async function withdrawManualPayment(id: string) {
  await apiClient.post(`/api/payments/manual/${id}/withdraw`, {});
}

export async function resetRoadmap() {
  await apiClient.delete('/api/roadmap');
}

export async function saveRoadmap(payload: any) {
  const { data } = await apiClient.put('/api/roadmap', payload);
  return dataOf({ data });
}

export async function generateRoadmap(payload: any) {
  const { data } = await apiClient.post('/api/roadmap/generate', payload);
  return dataOf({ data });
}

export async function fetchInterviews() {
  const { data } = await apiClient.get('/api/interviews');
  return list<any>(dataOf({ data }));
}

export async function createMockInterview(payload: { mentorId: string; category: string; answers: { question: string; transcript?: string }[] }) {
  const { data } = await apiClient.post('/api/mock-interviews', payload);
  return dataOf({ data });
}

export async function submitMockInterview(id: string) {
  await apiClient.post(`/api/mock-interviews/${id}/submit`, {});
}

export async function fetchForumPosts(category?: string) {
  const params: Record<string, string> = { limit: '50' };
  if (category && category !== 'All') params.category = category;
  const { data } = await apiClient.get('/api/forum/posts', { params });
  return list<any>(dataOf({ data }));
}

export async function createForumPost(payload: { title: string; body: string; category: string }) {
  const { data } = await apiClient.post('/api/forum/posts', payload);
  return dataOf({ data });
}

export async function voteForumPost(id: string, value = 1) {
  const { data } = await apiClient.post(`/api/forum/posts/${id}/vote`, { value });
  return data;
}

export async function fetchTevtaIt() {
  const { data } = await apiClient.get('/api/tevta-it');
  return data;
}

export async function fetchTransnational() {
  const { data } = await apiClient.get('/api/transnational');
  return dataOf({ data }) ?? data?.data ?? [];
}

export async function calculateTransnational(payload: any) {
  const { data } = await apiClient.post('/api/calculate-transnational', payload);
  return data;
}

let skillGapCareerId = '';
export function setSkillGapCareer(id: string) { skillGapCareerId = id; }
export function takeSkillGapCareer() {
  const id = skillGapCareerId;
  skillGapCareerId = '';
  return id;
}

/**
 * interviewService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side service layer for AI mock interview functionality.
 *
 * ARCHITECTURE:
 *   MockInterviewTab → interviewService → POST /api/interview/evaluate → Gemini
 *
 * No API keys are stored or referenced here — all Gemini calls go through
 * the backend at /api/interview/evaluate.
 *
 * QUESTION BANK:
 *   Questions are grouped by interview category so each category gets
 *   contextually appropriate questions.
 */

// ── Question bank keyed by category ──────────────────────────────────────────
const QUESTION_BANK = {
  'BS CS Admissions': [
    {
      q: 'Tell me about yourself and why you chose Computer Science for your university studies.',
      hint: 'Highlight your academic background, specific interests in CS/AI, and why you chose this field over alternatives.',
      evaluationFocus: 'Self-awareness, clarity of purpose, academic alignment',
    },
    {
      q: 'Describe a challenging problem you solved — either in academics or a personal project. What was your approach?',
      hint: 'Use the STAR method: Situation, Task, Action, Result. Mention specific steps and what you learned.',
      evaluationFocus: 'Problem-solving ability, logical thinking, initiative',
    },
    {
      q: 'Why are you applying to this specific university? What do you know about its CS programme?',
      hint: 'Mention specific faculty, labs, rankings, or course offerings. Show genuine research about the institution.',
      evaluationFocus: 'Motivation, research effort, institutional fit',
    },
    {
      q: 'Where do you see yourself five years after completing your BS degree in Pakistan?',
      hint: 'Be specific: a role title, industry, or skill domain. Mention real companies, research areas, or entrepreneurship.',
      evaluationFocus: 'Ambition, career planning, realistic expectations',
    },
    {
      q: 'How do you handle academic pressure and tight deadlines, such as preparing for multiple exams at once?',
      hint: 'Share a real example with specific techniques: study plans, prioritisation, time blocking.',
      evaluationFocus: 'Resilience, time management, self-regulation',
    },
  ],

  'MDCAT Medical Admissions': [
    {
      q: 'Why do you want to become a doctor? What motivated you to pursue medicine?',
      hint: 'Go beyond "I want to help people." Share a specific experience — a family member, patient encounter, or moment of inspiration.',
      evaluationFocus: 'Genuine motivation, empathy, personal insight',
    },
    {
      q: 'How did you prepare for the MDCAT, and what study strategies worked best for you?',
      hint: 'Mention specific resources (KIPS, STEP, past papers), daily routines, and how you handled Biology, Chemistry, and Physics.',
      evaluationFocus: 'Study discipline, self-awareness, preparation quality',
    },
    {
      q: 'Describe a situation where you had to make a difficult decision under pressure. What did you do?',
      hint: 'Focus on your decision-making process, not just the outcome. Show composure and clear thinking.',
      evaluationFocus: 'Decision making, emotional intelligence, composure',
    },
    {
      q: 'What qualities do you think are essential for a good doctor, and how have you demonstrated them?',
      hint: 'List qualities like empathy, precision, communication. Back each one with a real personal example.',
      evaluationFocus: 'Self-awareness, value alignment, concrete evidence',
    },
    {
      q: 'How would you handle a situation where a patient or family member disagrees with a medical recommendation?',
      hint: 'Show empathy first, then explain your approach to communication, informed consent, and professional ethics.',
      evaluationFocus: 'Communication skills, ethical reasoning, patient-centred thinking',
    },
  ],

  'Junior Software Developer Job': [
    {
      q: 'Walk me through a project you have built or contributed to. What was your role, and what technologies did you use?',
      hint: 'Be specific: the project name, tech stack, your contribution, and challenges faced. Mention GitHub if applicable.',
      evaluationFocus: 'Technical experience, communication, specificity',
    },
    {
      q: 'Explain the concept of Object-Oriented Programming (OOP) and give a real-world example.',
      hint: 'Define the four OOP principles (encapsulation, inheritance, polymorphism, abstraction) and illustrate with a concrete example.',
      evaluationFocus: 'Technical knowledge, clarity of explanation',
    },
    {
      q: 'How do you debug a piece of code that is not producing the expected output?',
      hint: 'Describe your actual debugging process: reading error messages, using print statements / debugger, isolating the problem.',
      evaluationFocus: 'Problem-solving methodology, technical process',
    },
    {
      q: 'How do you stay updated with new technologies and trends in software development?',
      hint: 'Name specific sources: YouTube channels, blogs, GitHub repos, communities (Stack Overflow, GitHub, Dev.to, local meetups).',
      evaluationFocus: 'Continuous learning, initiative, community engagement',
    },
    {
      q: 'Describe how you would approach working in a team on a shared codebase for the first time.',
      hint: 'Mention Git workflow (branches, PRs, code reviews), communication norms, asking questions, and documentation.',
      evaluationFocus: 'Teamwork, communication, professional software practices',
    },
  ],

  'Scholarship Panel Interview': [
    {
      q: 'Tell the panel about yourself, your academic background, and why you deserve this scholarship.',
      hint: 'Cover: academic achievements, financial need, career goals, and how this scholarship will specifically help you.',
      evaluationFocus: 'Confidence, relevance, structured self-presentation',
    },
    {
      q: 'What are your long-term career goals, and how does this scholarship support them?',
      hint: 'Connect the scholarship directly to a specific academic programme, skill, or career outcome. Be concrete.',
      evaluationFocus: 'Goal clarity, motivation, scholarship alignment',
    },
    {
      q: 'How have you contributed to your school, community, or family despite financial constraints?',
      hint: 'Share a specific contribution: tutoring peers, helping family, community volunteering, leadership role.',
      evaluationFocus: 'Initiative, social contribution, resilience',
    },
    {
      q: 'What will you do after completing your degree to give back to Pakistan or your community?',
      hint: 'Think beyond personal success — mention social enterprise, government service, teaching, or community development.',
      evaluationFocus: 'Social awareness, values, long-term commitment',
    },
    {
      q: 'Describe the biggest obstacle you have faced in your education and how you overcame it.',
      hint: 'Be honest about hardship (financial, family, academic). Focus on your response, perseverance, and what you learned.',
      evaluationFocus: 'Resilience, honesty, growth mindset',
    },
  ],
};

// Map display label → question bank key
const CATEGORY_MAP = {
  'BS CS Admissions Interview': 'BS CS Admissions',
  'Medical MDCAT Admissions':   'MDCAT Medical Admissions',
  'Software Engineer Job Interview': 'Junior Software Developer Job',
  'Ehsaas & PEEF Scholarship Panel': 'Scholarship Panel Interview',
};

// Difficulty labels
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the questions for a given display category label.
 * Returns the full question array shuffled slightly for variety,
 * but deterministically (same category = same questions, just different order
 * per session start).
 */
export function getQuestionsForCategory(categoryLabel, count = 4) {
  const key = CATEGORY_MAP[categoryLabel] ?? 'BS CS Admissions';
  const pool = QUESTION_BANK[key] ?? QUESTION_BANK['BS CS Admissions'];
  // Return the first `count` questions (no Math.random — consistent order)
  return pool.slice(0, count);
}

/** All available interview categories */
export const INTERVIEW_CATEGORIES = Object.keys(CATEGORY_MAP);

/**
 * Call the backend AI evaluation endpoint.
 * Returns a structured evaluation or throws an error.
 *
 * @param {Object} params
 * @param {string} params.question
 * @param {string} params.answer
 * @param {string} params.category
 * @param {string} params.difficulty
 * @param {Object} params.profile
 * @returns {Promise<EvaluationResult>}
 */
export async function evaluateAnswer({ question, answer, category, difficulty, profile }) {
  if (!answer || answer.trim().length < 5) {
    throw new Error('Please write a more complete answer before submitting.');
  }

  const res = await fetch('/api/interview/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, category, difficulty, profile }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Evaluation failed (${res.status})`);
  }

  const data = await res.json();

  if (!data.isValid) {
    throw new Error(data.error || 'Evaluation returned invalid response.');
  }

  return data;
  // Shape: { score, relevance, clarity, completeness, strengths, weaknesses,
  //          feedback, suggestedTopics, improvedAnswer, isValid }
}

/**
 * Aggregate scores across a completed session into a final report.
 * Pure function — no API call needed.
 *
 * @param {Array<{question, answer, evaluation}>} answers
 * @returns {SessionReport}
 */
export function buildSessionReport(answers) {
  if (!answers.length) return null;

  const scores = answers.map(a => a.evaluation?.score ?? 0);
  const overall = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);

  // Collect all strengths and weaknesses, deduplicate
  const allStrengths = [...new Set(answers.flatMap(a => a.evaluation?.strengths ?? []))];
  const allWeaknesses = [...new Set(answers.flatMap(a => a.evaluation?.weaknesses ?? []))];
  const allTopics = [...new Set(answers.flatMap(a => a.evaluation?.suggestedTopics ?? []))];

  const grade =
    overall >= 85 ? 'Excellent' :
    overall >= 70 ? 'Good' :
    overall >= 55 ? 'Satisfactory' :
    'Needs Improvement';

  return {
    overallScore: overall,
    grade,
    totalQuestions: answers.length,
    perQuestion: answers.map((a, i) => ({
      index: i + 1,
      question: a.question,
      score: a.evaluation?.score ?? 0,
      feedback: a.evaluation?.feedback ?? '',
    })),
    topStrengths: allStrengths.slice(0, 3),
    areasToImprove: allWeaknesses.slice(0, 3),
    recommendedTopics: allTopics.slice(0, 4),
    date: new Date().toISOString(),
  };
}

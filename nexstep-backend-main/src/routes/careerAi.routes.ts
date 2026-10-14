/**
 * careerAi.routes.ts — Career AI matches and Skill Gap analysis.
 *
 * Careers come from the `careers` table (Admin → Content → Careers). A small
 * starter set of general career facts (streams, degrees, skills, interest
 * codes — no salary figures) is inserted once when the table is empty; the
 * admin can edit or delete it.
 *
 * Matching is deterministic and explainable (100 points):
 *   Interests (RIASEC from the interest quiz) 35 · Stream / group 25 ·
 *   Skills you have 25 · Academic marks 15
 *
 *   GET  /api/career-ai/matches             ranked careers (Free: top 3)
 *   GET  /api/career-ai/careers/:id/gap     skill gap + learning plan for one career
 *   POST /api/career-ai/compare             { ids: [..2-3] }   Premium
 *   PUT  /api/career-ai/target              { careerId } sets the student's target career
 *   POST /api/career-ai/skills              { name, level? } add a skill to the profile
 *   DELETE /api/career-ai/skills/:name      remove a skill
 */
import { Router, Request, Response, NextFunction } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { ensureEducationSchema } from './education.routes.js';
import { getUserPlan, FREE_LIMITS } from '../services/plan.service.js';
import { recordUsage } from '../services/usageAnalytics.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Starter careers (general facts only) ─────────────────────────────────────
const ANY_INTER = ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'];
const STARTER: Array<{ title: string; category: string; riasec: string; description: string; streams: string[]; degrees: string[]; skills: string[]; pathway: string }> = [
  { title: 'Software Engineer', category: 'Computing & IT', riasec: 'ICR', description: 'Designs, builds and maintains software applications and systems.', streams: ['ICS', 'FSc Pre-Engineering', 'A-Levels', 'DAE'], degrees: ['BS Computer Science', 'BS Software Engineering'], skills: ['Programming', 'Data Structures & Algorithms', 'Problem Solving', 'Databases (SQL)', 'Git', 'Web Development'], pathway: 'Matric Science → ICS or FSc Pre-Engineering → university entry test (e.g. NUST NET, FAST, ECAT) → 4-year BS → internships and a project portfolio.' },
  { title: 'Data Scientist / AI Engineer', category: 'Computing & IT', riasec: 'ICR', description: 'Uses data, statistics and machine learning to find patterns and build intelligent systems.', streams: ['ICS', 'FSc Pre-Engineering', 'A-Levels'], degrees: ['BS Data Science', 'BS Artificial Intelligence', 'BS Computer Science'], skills: ['Python', 'Statistics', 'Mathematics', 'Machine Learning', 'SQL', 'Data Visualisation'], pathway: 'ICS / Pre-Engineering with strong maths → BS Data Science, AI or CS → Kaggle-style projects and internships.' },
  { title: 'Cyber Security Analyst', category: 'Computing & IT', riasec: 'IRC', description: 'Protects computer systems and networks from attacks and investigates security incidents.', streams: ['ICS', 'FSc Pre-Engineering', 'A-Levels', 'DAE'], degrees: ['BS Cyber Security', 'BS Computer Science'], skills: ['Networking', 'Linux', 'Security Fundamentals', 'Scripting (Python / Bash)', 'Problem Solving'], pathway: 'ICS / Pre-Engineering → BS Cyber Security or CS → security certifications and capture-the-flag practice.' },
  { title: 'Web Developer', category: 'Computing & IT', riasec: 'RIA', description: 'Builds websites and web apps; common for freelancing and remote work.', streams: [...ANY_INTER, 'DAE'], degrees: ['BS Computer Science', 'BS Information Technology', 'Short courses / bootcamps'], skills: ['HTML & CSS', 'JavaScript', 'React', 'Git', 'Communication'], pathway: 'Any stream can start with online courses → build a portfolio of real sites → freelancing or a BS IT / CS degree.' },
  { title: 'Doctor (MBBS)', category: 'Medical & Health', riasec: 'ISR', description: 'Diagnoses and treats patients in hospitals and clinics.', streams: ['FSc Pre-Medical', 'A-Levels'], degrees: ['MBBS (5 years) + house job'], skills: ['Biology', 'Chemistry', 'Physics', 'Communication', 'Empathy', 'Attention to Detail'], pathway: 'Matric Science (Biology) → FSc Pre-Medical → MDCAT → MBBS (5 years) → 1-year house job → specialisation (FCPS).' },
  { title: 'Dentist (BDS)', category: 'Medical & Health', riasec: 'IRS', description: 'Diagnoses and treats problems of the teeth and mouth.', streams: ['FSc Pre-Medical', 'A-Levels'], degrees: ['BDS (4 years) + house job'], skills: ['Biology', 'Chemistry', 'Hand Skills', 'Communication', 'Attention to Detail'], pathway: 'FSc Pre-Medical → MDCAT → BDS (4 years) → house job.' },
  { title: 'Pharmacist', category: 'Medical & Health', riasec: 'ICS', description: 'Prepares and dispenses medicines and advises patients and doctors on their use.', streams: ['FSc Pre-Medical', 'A-Levels'], degrees: ['Pharm-D (5 years)'], skills: ['Chemistry', 'Biology', 'Attention to Detail', 'Communication'], pathway: 'FSc Pre-Medical → university admission (merit / entry test) → Pharm-D (5 years).' },
  { title: 'Nurse', category: 'Medical & Health', riasec: 'SIR', description: 'Cares for patients and supports doctors in hospitals and community health.', streams: ['FSc Pre-Medical', 'A-Levels'], degrees: ['BS Nursing (4 years)'], skills: ['Biology', 'Patient Care', 'Communication', 'Empathy', 'First Aid'], pathway: 'FSc Pre-Medical → BS Nursing (4 years) → registration with the nursing council.' },
  { title: 'Psychologist', category: 'Medical & Health', riasec: 'SIA', description: 'Studies behaviour and helps people with mental health and wellbeing.', streams: ANY_INTER, degrees: ['BS Psychology', 'MS Clinical Psychology'], skills: ['Psychology Fundamentals', 'Active Listening', 'Research Methods', 'Empathy', 'Communication'], pathway: 'Any Intermediate group → BS Psychology → MS / clinical training for practice.' },
  { title: 'Civil Engineer', category: 'Engineering', riasec: 'RIC', description: 'Plans and builds roads, bridges, buildings and water systems.', streams: ['FSc Pre-Engineering', 'A-Levels', 'DAE'], degrees: ['BSc Civil Engineering', 'DAE Civil (diploma)'], skills: ['Mathematics', 'Physics', 'AutoCAD', 'Project Management', 'Problem Solving'], pathway: 'FSc Pre-Engineering → ECAT / NET → BSc Civil Engineering → PEC registration. DAE Civil students can join BSc Engineering Technology.' },
  { title: 'Electrical Engineer', category: 'Engineering', riasec: 'RIC', description: 'Designs and maintains electrical systems, power and electronics.', streams: ['FSc Pre-Engineering', 'A-Levels', 'DAE'], degrees: ['BSc Electrical Engineering', 'DAE Electrical (diploma)'], skills: ['Mathematics', 'Physics', 'Circuit Analysis', 'MATLAB', 'Problem Solving'], pathway: 'FSc Pre-Engineering → ECAT / NET → BSc Electrical Engineering → PEC registration.' },
  { title: 'Mechanical Engineer', category: 'Engineering', riasec: 'RIC', description: 'Designs machines, engines and manufacturing systems.', streams: ['FSc Pre-Engineering', 'A-Levels', 'DAE'], degrees: ['BSc Mechanical Engineering', 'DAE Mechanical (diploma)'], skills: ['Mathematics', 'Physics', 'CAD (SolidWorks / AutoCAD)', 'Thermodynamics', 'Problem Solving'], pathway: 'FSc Pre-Engineering → ECAT / NET → BSc Mechanical Engineering.' },
  { title: 'Architect', category: 'Engineering', riasec: 'AIR', description: 'Designs buildings and spaces that are safe, useful and attractive.', streams: ['FSc Pre-Engineering', 'A-Levels', 'ICS'], degrees: ['B.Arch (5 years)'], skills: ['Drawing & Sketching', 'AutoCAD', 'Creativity', 'Mathematics', '3D Modelling'], pathway: 'FSc Pre-Engineering (or with maths) → aptitude test / portfolio → B.Arch (5 years).' },
  { title: 'Chartered Accountant', category: 'Business & Finance', riasec: 'CEI', description: 'Prepares and audits financial records, handles tax and advises businesses.', streams: ['ICom', 'A-Levels', 'ICS', 'FA / Humanities'], degrees: ['CA (ICAP)', 'ACCA', 'BS Accounting & Finance'], skills: ['Accounting', 'Financial Reporting', 'Excel', 'Taxation', 'Attention to Detail'], pathway: 'ICom / A-Levels → CA (ICAP) or ACCA with articleship, or BS Accounting & Finance.' },
  { title: 'Finance / Banking Professional', category: 'Business & Finance', riasec: 'CEI', description: 'Works in banks and companies on loans, investments and financial analysis.', streams: ['ICom', 'ICS', 'A-Levels', 'FA / Humanities'], degrees: ['BS Finance', 'BS Economics', 'BBA'], skills: ['Financial Analysis', 'Excel', 'Mathematics', 'Economics', 'Communication'], pathway: 'ICom / ICS → BS Finance, Economics or BBA → bank trainee programmes.' },
  { title: 'Business / Marketing Manager', category: 'Business & Finance', riasec: 'ESA', description: 'Leads teams, plans marketing and grows businesses.', streams: ANY_INTER, degrees: ['BBA', 'BS Marketing'], skills: ['Communication', 'Marketing', 'Leadership', 'Excel', 'Presentation'], pathway: 'Any Intermediate group → BBA / BS Marketing → internships → management trainee roles.' },
  { title: 'Lawyer', category: 'Law & Public Service', riasec: 'ESA', description: 'Advises clients and represents them in court.', streams: ANY_INTER, degrees: ['LLB (5 years)'], skills: ['Legal Research', 'Writing', 'Public Speaking', 'Critical Thinking', 'English'], pathway: 'Any Intermediate group → LAT (law admission test) → LLB (5 years) → bar council licence.' },
  { title: 'Civil Services Officer (CSS / PMS)', category: 'Law & Public Service', riasec: 'ESC', description: 'Works in government administration, foreign service, police and other services.', streams: ANY_INTER, degrees: ['Any bachelor degree + CSS / PMS exam'], skills: ['Current Affairs', 'English Essay Writing', 'Pakistan Affairs', 'Analytical Thinking', 'Leadership'], pathway: 'Any bachelor degree → CSS (federal) or PMS (provincial) competitive exam → training academy.' },
  { title: 'Teacher / Lecturer', category: 'Education', riasec: 'SAE', description: 'Teaches students in schools, colleges or universities.', streams: ANY_INTER, degrees: ['BS in your subject', 'B.Ed'], skills: ['Subject Knowledge', 'Communication', 'Classroom Management', 'Presentation', 'Patience'], pathway: 'Any group → BS in your subject (and B.Ed for schools) → MPhil / PhD for university teaching.' },
  { title: 'Graphic / UI Designer', category: 'Creative & Media', riasec: 'AER', description: 'Creates visual designs for brands, apps and websites.', streams: [...ANY_INTER, 'DAE'], degrees: ['BS Design', 'BFA', 'Short courses'], skills: ['Adobe Photoshop / Illustrator', 'Figma', 'Typography', 'Colour Theory', 'Creativity'], pathway: 'Any stream → design courses or BS Design / BFA → portfolio → studio jobs or freelancing.' },
  { title: 'Journalist / Media Professional', category: 'Creative & Media', riasec: 'AES', description: 'Researches and reports news for TV, newspapers and digital media.', streams: ANY_INTER, degrees: ['BS Mass Communication', 'BS Media Studies'], skills: ['Writing', 'Research', 'Video Editing', 'Interviewing', 'English & Urdu'], pathway: 'Any group (FA common) → BS Mass Communication → internships at media houses.' },
  { title: 'Electrician / Electrical Technician', category: 'Technical & Vocational', riasec: 'RCI', description: 'Installs and repairs electrical wiring and equipment.', streams: ['DAE', 'Technical'], degrees: ['DAE Electrical', 'TEVTA / NAVTTC certificate'], skills: ['Electrical Wiring', 'Safety Practices', 'Circuit Basics', 'Troubleshooting'], pathway: 'Matric (Technical or any) → TEVTA / NAVTTC course or DAE Electrical → apprenticeship.' },
  { title: 'Armed Forces Officer', category: 'Law & Public Service', riasec: 'RES', description: 'Serves as a commissioned officer in the Army, Navy or Air Force.', streams: ANY_INTER, degrees: ['Academy training (PMA / PNA / PAF Academy)'], skills: ['Physical Fitness', 'Leadership', 'Discipline', 'Communication', 'Teamwork'], pathway: 'Intermediate → initial test → ISSB → academy training (e.g. PMA Kakul).' },
  { title: 'Physiotherapist (DPT)', category: 'Medical & Health', riasec: 'SIR', description: 'Helps patients recover movement after injury or illness.', streams: ['FSc Pre-Medical', 'A-Levels'], degrees: ['Doctor of Physical Therapy (5 years)'], skills: ['Biology', 'Anatomy', 'Patient Care', 'Communication'], pathway: 'FSc Pre-Medical → university merit / entry test → DPT (5 years).' },
  { title: 'Medical Lab Technologist', category: 'Medical & Health', riasec: 'IRC', description: 'Runs diagnostic tests in hospital and private laboratories.', streams: ['FSc Pre-Medical', 'A-Levels'], degrees: ['BS Medical Laboratory Technology'], skills: ['Biology', 'Chemistry', 'Attention to Detail', 'Lab Safety'], pathway: 'FSc Pre-Medical → BS MLT → hospital or diagnostic-lab placement.' },
  { title: 'Pilot / Aviation Officer', category: 'Engineering', riasec: 'REC', description: 'Flies commercial or military aircraft after cadet or PAF training.', streams: ['FSc Pre-Engineering', 'FSc Pre-Medical', 'A-Levels'], degrees: ['Aviation academy / PAF GD Pilot'], skills: ['Physics', 'Mathematics', 'English', 'Situational Awareness', 'Discipline'], pathway: 'Intermediate with strong Physics and English → cadet programme or PAF GD(P) → flying training.' },
  { title: 'Actuary', category: 'Business & Finance', riasec: 'CIE', description: 'Uses maths and statistics to price risk for insurers and funds.', streams: ['ICS', 'FSc Pre-Engineering', 'A-Levels', 'ICom'], degrees: ['BS Actuarial Science', 'SOA / IFoA papers'], skills: ['Mathematics', 'Statistics', 'Excel', 'Probability'], pathway: 'ICS or Pre-Engineering with strong maths → BS Actuarial Science or self-study papers while working.' },
  { title: 'Animator / Game Artist', category: 'Creative & Media', riasec: 'AIR', description: 'Creates characters, motion and game art for studios and YouTube.', streams: [...ANY_INTER, 'DAE'], degrees: ['BS Animation', 'BFA', 'Short courses'], skills: ['Drawing', 'Blender / Maya', 'Storytelling', 'Creativity'], pathway: 'Any stream → animation courses or BS Design → a showreel of short films or game assets.' },
  { title: 'Social Worker / Counselor', category: 'Education', riasec: 'SIA', description: 'Supports families, schools and NGOs with counselling and community work.', streams: ANY_INTER, degrees: ['BS Social Work', 'BS Psychology'], skills: ['Empathy', 'Communication', 'Case Work', 'Urdu & English'], pathway: 'Any Intermediate group → BS Social Work or Psychology → NGO / school placement.' },
  { title: 'Content Creator / Digital Marketer', category: 'Creative & Media', riasec: 'AES', description: 'Plans content, ads and social media for brands or their own channel.', streams: ANY_INTER, degrees: ['BS Media Studies', 'BBA', 'Short courses'], skills: ['Writing', 'Video Editing', 'Social Media', 'Marketing'], pathway: 'Any stream → build a public portfolio → internships or freelance retainers.' },
  { title: 'Chef / Culinary Professional', category: 'Technical & Vocational', riasec: 'RAE', description: 'Cooks and runs kitchens in restaurants, hotels or cloud kitchens.', streams: [...ANY_INTER, 'DAE'], degrees: ['Diploma in Culinary Arts', 'Hospitality certificate'], skills: ['Cooking', 'Food Safety', 'Creativity', 'Teamwork'], pathway: 'Matric or Intermediate → culinary diploma / hotel apprenticeship → commis to chef de partie.' },
  { title: 'HVAC / Refrigeration Technician', category: 'Technical & Vocational', riasec: 'RCI', description: 'Installs and services air-conditioning and cold-storage systems.', streams: ['DAE', 'Technical'], degrees: ['DAE Refrigeration', 'TEVTA certificate'], skills: ['Electrical Basics', 'Safety', 'Troubleshooting', 'Hand Skills'], pathway: 'Matric Technical or any → TEVTA / DAE HVAC → workshop apprenticeship.' },
];

let ready: Promise<void> | null = null;
export function ensureCareerAiSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureEducationSchema();
      await pool.query(`CREATE TABLE IF NOT EXISTS content_seeds (key VARCHAR(80) PRIMARY KEY, seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await pool.query(`ALTER TABLE careers ADD COLUMN IF NOT EXISTS typical_cutoff_pct NUMERIC(5,2)`);
      const seeded = await queryOne<any>(`SELECT 1 FROM content_seeds WHERE key = 'careers_starter_v2'`);
      if (!seeded) {
        let added = 0;
        for (const c of STARTER) {
          const exists = await queryOne<any>(`SELECT 1 FROM careers WHERE LOWER(title) = LOWER($1)`, [c.title]);
          if (exists) continue;
          await pool.query(
            `INSERT INTO careers (title, category, riasec_code, description, streams, degrees, required_skills, pathway, demand_level)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)`,
            [c.title, c.category, c.riasec, c.description, JSON.stringify(c.streams), JSON.stringify(c.degrees), JSON.stringify(c.skills), c.pathway]);
          added += 1;
        }
        if (added) console.log(`[career-ai] Inserted ${added} extra careers.`);
        await pool.query(`INSERT INTO content_seeds (key) VALUES ('careers_starter_v1') ON CONFLICT DO NOTHING`);
        await pool.query(`INSERT INTO content_seeds (key) VALUES ('careers_starter_v2') ON CONFLICT DO NOTHING`);
      }
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

// ── Profile + matching ───────────────────────────────────────────────────────
const RIASEC_NAMES: Record<string, string> = {
  R: 'Realistic (hands-on)', I: 'Investigative (analytical)', A: 'Artistic (creative)',
  S: 'Social (helping people)', E: 'Enterprising (leading)', C: 'Conventional (organised)',
};
const MATRIC_TO_INTER: Record<string, string[]> = {
  'Science (Biology)': ['FSc Pre-Medical', 'FSc Pre-Engineering'],
  'Science (Computer Science)': ['ICS', 'FSc Pre-Engineering'],
  'Humanities / Arts': ['FA / Humanities', 'ICom'],
  'Technical': ['DAE', 'Technical'],
  'O-Levels': ['A-Levels'],
};
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');
const listOf = (v: any): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

function hasSkill(userSkills: string[], required: string) {
  const r = norm(required);
  const parts = String(required).split(/[\/(),&]| and /i).map(norm).filter((x) => x.length >= 2);
  return userSkills.some((u) => {
    const n = norm(u);
    if (!n) return false;
    if (n === r) return true;
    if (n.length >= 4 && r.includes(n)) return true;
    if (r.length >= 4 && n.includes(r)) return true;
    return parts.some((p) => p === n || (p.length >= 4 && n.includes(p)));
  });
}

export interface StudentSignals {
  level: string | null;
  stream: string | null;
  riasec: string;          // e.g. "ISA" (from latest quiz)
  skills: string[];
  bestMarks: number;       // best of matric / inter %
  targetCareer: string | null;
}

export async function loadStudentSignals(userId: string): Promise<StudentSignals> {
  const p = await queryOne<any>(
    `SELECT education_level, education_stream, preferred_stream, top_riasec_cluster, matric_pct, fsc_pct, target_career
       FROM profiles WHERE user_id = $1`, [userId]).catch(() => null);
  const quiz = await queryOne<any>(`SELECT code FROM quiz_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId]).catch(() => null);
  const skills = await query<any>(`SELECT name FROM user_skills WHERE user_id = $1`, [userId]).catch(() => []);
  const fromQuiz = String(quiz?.code || '').toUpperCase().replace(/[^RIASEC]/g, '');
  const fromProfile = String(p?.top_riasec_cluster || '').toUpperCase().replace(/[^RIASEC]/g, '');
  return {
    level: p?.education_level || null,
    stream: p?.education_stream || p?.preferred_stream || null,
    riasec: [...new Set((fromQuiz || fromProfile).split(''))].join('').slice(0, 3),
    skills: skills.map((s: any) => s.name),
    bestMarks: Math.max(Number(p?.matric_pct) || 0, Number(p?.fsc_pct) || 0),
    targetCareer: p?.target_career || null,
  };
}

const STREAM_FIT = { anyGroup: 15, missing: 10, direct: 25, via: 20, class8: 15, mismatch: 5 } as const;
const INTEREST_MISSING = 14;
const MARKS_FIT = { missing: 8, above: 15, meets: 13, close: 9, stretch: 5, far: 2 } as const;

function streamFit(student: StudentSignals, careerStreams: string[]) {
  if (careerStreams.length === 0) return { score: STREAM_FIT.anyGroup, note: 'This career is open to students from any group.' };
  if (!student.stream && student.level !== 'dae') return { score: STREAM_FIT.missing, note: 'Add your group / stream in your profile for a more accurate match.' };
  const mine = student.level === 'dae' ? ['DAE'] : [student.stream!, ...(MATRIC_TO_INTER[student.stream!] || [])];
  const direct = careerStreams.some((c) => norm(c) === norm(mine[0]));
  if (direct) return { score: STREAM_FIT.direct, note: `Your group (${mine[0]}) is a usual route into this career.` };
  const via = careerStreams.find((c) => mine.slice(1).some((m) => norm(m) === norm(c)));
  if (via) return { score: STREAM_FIT.via, note: `From ${mine[0]} you can move on to ${via}, a usual route into this career.` };
  if (student.level === 'class8') return { score: STREAM_FIT.class8, note: `Choose ${careerStreams.slice(0, 2).join(' or ')} in Matric/Inter to keep this path open.` };
  return { score: STREAM_FIT.mismatch, note: `Usual groups for this career: ${careerStreams.slice(0, 3).join(', ')}. Your group (${mine[0]}) is not one of them, so the path is harder.` };
}

function interestFit(student: StudentSignals, code: string) {
  const c = String(code || '').toUpperCase();
  if (!student.riasec) return { score: INTEREST_MISSING, matched: [] as string[], note: 'Take the interest quiz to match careers to what you enjoy.' };
  const weights = [3, 2, 1];
  let got = 0; let max = 0;
  const matched: string[] = [];
  c.split('').forEach((letter, i) => {
    const w = weights[i] ?? 1;
    max += w * 3;
    const pos = student.riasec.indexOf(letter);
    if (pos >= 0) { got += w * (weights[pos] ?? 1); matched.push(letter); }
  });
  const score = Math.round((got / Math.max(max, 1)) * 35);
  const note = matched.length
    ? `Your interests match: ${matched.map((m) => RIASEC_NAMES[m]).join(', ')}.`
    : `This career suits ${c.split('').map((m) => RIASEC_NAMES[m]).join(', ')} interests, which are not your strongest.`;
  return { score, matched, note };
}

function typicalCutoffPct(career: { title: string; category: string; degrees: string[]; typicalCutoffPct?: number | null }) {
  const listed = Number(career.typicalCutoffPct);
  if (listed > 0 && listed <= 100) return listed;
  const t = `${career.title} ${career.category} ${career.degrees.join(' ')}`.toLowerCase();
  if (/mbbs|doctor \(|dentist|bds|css|pms|armed forces|issb|pilot|actuary/.test(t)) return 86;
  if (/software|data scientist|ai engineer|cyber|architect/.test(t)) return 78;
  if (/engineer|pharmacist|chartered|physiotherapist|dpt/.test(t)) return 74;
  if (/lawyer|nurse|psycholog|finance|banking|lab technologist/.test(t)) return 64;
  if (/teacher|web |graphic|journalist|electrician|technician|hvac|chef|content|animator|social worker|marketing|business/.test(t)) return 50;
  return 62;
}

function marksFit(best: number, cutoff: number) {
  if (!best) return { score: MARKS_FIT.missing, realistic: true, cutoff, note: 'Add your Matric / Inter marks in your profile to include them in the match.' };
  const gap = best - cutoff;
  if (gap >= 6) return { score: MARKS_FIT.above, realistic: true, cutoff, note: `Your ${best}% is above the usual ${cutoff}% needed for this path.` };
  if (gap >= 0) return { score: MARKS_FIT.meets, realistic: true, cutoff, note: `Your ${best}% meets the usual ${cutoff}% for this career.` };
  if (gap >= -8) return { score: MARKS_FIT.close, realistic: true, cutoff, note: `Your ${best}% is close to the usual ${cutoff}% — a strong entry test can close the gap.` };
  if (gap >= -16) return { score: MARKS_FIT.stretch, realistic: false, cutoff, note: `This path usually needs around ${cutoff}%. Your ${best}% makes it a stretch.` };
  return { score: MARKS_FIT.far, realistic: false, cutoff, note: `Usually needs about ${cutoff}%. Careers nearer your ${best}% are a safer marks-based pick.` };
}

export function careerToApi(r: any) {
  return {
    id: r.id, title: r.title, category: r.category || 'Other', riasecCode: r.riasec_code,
    description: r.description || '', streams: listOf(r.streams), degrees: listOf(r.degrees),
    requiredSkills: listOf(r.required_skills), pathway: r.pathway || '', demandLevel: r.demand_level || null,
    startingSalaryPkr: r.starting_salary_pkr ?? null, avgSalaryPkr: r.avg_salary_pkr ?? null,
    educationLevels: r.education_levels || [],
    typicalCutoffPct: Number(r.typical_cutoff_pct) || null,
  };
}

function fitLabel(total: number) {
  return total >= 75 ? 'Strong match' : total >= 55 ? 'Good match' : total >= 40 ? 'Possible match' : 'Weak match';
}

export function matchCareer(student: StudentSignals, career: ReturnType<typeof careerToApi>) {
  const interest = interestFit(student, career.riasecCode);
  const stream = streamFit(student, career.streams);
  const have = career.requiredSkills.filter((s) => hasSkill(student.skills, s));
  const missing = career.requiredSkills.filter((s) => !have.includes(s));
  const skillPct = career.requiredSkills.length ? have.length / career.requiredSkills.length : 0;
  const skillsScore = student.skills.length === 0 ? 6 : Math.round(skillPct * 25);
  const cutoff = typicalCutoffPct(career);
  const marks = marksFit(student.bestMarks, cutoff);
  const total = Math.min(100, interest.score + stream.score + skillsScore + marks.score);
  const strengths: string[] = [];
  const gaps: string[] = [];
  if (interest.matched.length) strengths.push(interest.note);
  if (stream.score >= 20) strengths.push(stream.note);
  if (have.length) strengths.push(`You already have ${have.length} of ${career.requiredSkills.length} key skills (${have.slice(0, 3).join(', ')}).`);
  if (marks.score >= 9) strengths.push(marks.note);
  if (missing.length) gaps.push(`Skills to build: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}.`);
  if (stream.score <= 10) gaps.push(stream.note);
  if (student.riasec && !interest.matched.length) gaps.push(interest.note);
  if (!student.riasec) gaps.push(interest.note);
  if (!marks.realistic && student.bestMarks) gaps.push(marks.note);
  return {
    career: { ...career, typicalCutoffPct: cutoff },
    score: total,
    fit: fitLabel(total),
    interestMatched: interest.matched.length,
    marksRealistic: marks.realistic,
    factors: [
      { key: 'interests', label: 'Interests', score: interest.score, max: 35, note: interest.note },
      { key: 'stream', label: 'Group / stream', score: stream.score, max: 25, note: stream.note },
      { key: 'skills', label: 'Skills', score: skillsScore, max: 25, note: career.requiredSkills.length ? `${have.length} of ${career.requiredSkills.length} key skills.` : 'No skills listed for this career yet.' },
      { key: 'marks', label: 'Marks', score: marks.score, max: 15, note: marks.note },
    ],
    have, missing, strengths, gaps,
  };
}

function factorScore(match: ReturnType<typeof matchCareer>, key: string) {
  return match.factors.find((f) => f.key === key)?.score ?? 0;
}

export type CareerSort = 'balanced' | 'interest' | 'marks';

function parseSort(value: unknown): CareerSort {
  const sort = String(value || 'balanced').toLowerCase();
  return sort === 'interest' || sort === 'marks' ? sort : 'balanced';
}

function applyLens(match: ReturnType<typeof matchCareer>, sort: CareerSort) {
  const interest = factorScore(match, 'interests');
  const marks = factorScore(match, 'marks');
  const stream = factorScore(match, 'stream');
  const skills = factorScore(match, 'skills');
  if (sort === 'interest') {
    const score = Math.min(100, Math.round((interest / 35) * 72 + (stream / 25) * 18 + (skills / 25) * 10));
    return { ...match, score, fit: fitLabel(score), lens: 'interest' as const };
  }
  if (sort === 'marks') {
    const score = Math.min(100, Math.round((marks / 15) * 58 + (stream / 25) * 32 + (interest / 35) * 10));
    return { ...match, score, fit: fitLabel(score), lens: 'marks' as const };
  }
  return { ...match, lens: 'balanced' as const };
}

function pickForLens(all: ReturnType<typeof matchCareer>[], sort: CareerSort, student: StudentSignals) {
  if (sort === 'interest') {
    const matched = student.riasec
      ? all.filter((m) => m.interestMatched > 0 || factorScore(m, 'interests') >= 14)
      : all;
    const pool = matched.length >= 4 ? matched : all;
    return pool
      .map((m) => applyLens(m, 'interest'))
      .sort((a, b) => factorScore(b, 'interests') - factorScore(a, 'interests')
        || b.interestMatched - a.interestMatched
        || b.score - a.score
        || a.career.title.localeCompare(b.career.title));
  }
  if (sort === 'marks') {
    const realistic = all.filter((m) => m.marksRealistic);
    const pool = realistic.length >= 4 ? realistic : all;
    return pool
      .map((m) => applyLens(m, 'marks'))
      .sort((a, b) => factorScore(b, 'marks') - factorScore(a, 'marks')
        || factorScore(b, 'stream') - factorScore(a, 'stream')
        || b.score - a.score
        || a.career.title.localeCompare(b.career.title));
  }
  return all.map((m) => applyLens(m, 'balanced')).sort((a, b) => b.score - a.score || a.career.title.localeCompare(b.career.title));
}

async function rankedFor(userId: string, sort: CareerSort = 'balanced') {
  const student = await loadStudentSignals(userId);
  const rows = await query<any>(`SELECT * FROM careers ORDER BY title ASC LIMIT 500`);
  const careers = rows.map(careerToApi).filter((c) => !c.educationLevels.length || !student.level || c.educationLevels.includes(student.level));
  const ranked = pickForLens(careers.map((c) => matchCareer(student, c)), sort, student);
  return { student, ranked, sort };
}

// ── Routes ───────────────────────────────────────────────────────────────────
export const careerAiRouter = Router();
careerAiRouter.use(requireAuth(), (_req: Request, res: Response, next: NextFunction) => {
  ensureCareerAiSchema().then(() => next()).catch((err) => { console.error('[career-ai] schema', err?.message); res.status(503).json({ error: 'Database not ready.' }); });
});

careerAiRouter.get('/matches', async (req, res) => {
  try {
    const plan = await getUserPlan(req.user!.id);
    const sort = parseSort(req.query.sort);
    const { student, ranked } = await rankedFor(req.user!.id, sort);
    const premium = plan.tier === 'premium';
    res.json({
      plan,
      sort,
      total: ranked.length,
      limited: !premium && ranked.length > FREE_LIMITS.careerMatches,
      profile: {
        level: student.level, stream: student.stream, riasec: student.riasec,
        skillsCount: student.skills.length, hasMarks: student.bestMarks > 0, targetCareer: student.targetCareer,
        bestMarks: student.bestMarks,
      },
      data: premium ? ranked : ranked.slice(0, FREE_LIMITS.careerMatches),
    });
  } catch (err: any) {
    console.error('[career-ai] matches', err?.message);
    res.status(500).json({ error: 'Could not calculate your career matches.' });
  }
});

careerAiRouter.get('/careers/:id/gap', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Career not found.' });
  try {
    const plan = await getUserPlan(req.user!.id);
    const { student, ranked } = await rankedFor(req.user!.id);
    const idx = ranked.findIndex((m) => m.career.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Career not found.' });
    const premium = plan.tier === 'premium';
    if (!premium && idx >= FREE_LIMITS.careerMatches) {
      return res.status(402).json({ error: 'Skill gap for careers outside your top 3 matches is a Premium feature.', code: 'PREMIUM_REQUIRED' });
    }
    const m = ranked[idx];
    recordUsage('career_search', m.career.id, m.career.title, req.user!.id).catch(() => {});
    const courses = await query<any>(
      `SELECT id, title, provider, duration, format, price_pkr, enrollment_url, skills_covered, education_levels FROM courses ORDER BY title ASC LIMIT 500`).catch(() => []);
    const levelOk = (c: any) => !c.education_levels?.length || !student.level || c.education_levels.includes(student.level);
    const plannedSkills = premium ? m.missing : m.missing.slice(0, FREE_LIMITS.skillPlanSkills);
    const planItems = plannedSkills.map((skill) => ({
      skill,
      courses: courses.filter((c: any) => levelOk(c) && listOf(c.skills_covered).some((s) => hasSkill([s], skill) || hasSkill([skill], s)))
        .slice(0, 3)
        .map((c: any) => ({ id: c.id, title: c.title, provider: c.provider, duration: c.duration, format: c.format, pricePkr: c.price_pkr, url: c.enrollment_url })),
    }));
    res.json({
      plan,
      data: {
        ...m,
        readiness: m.career.requiredSkills.length ? Math.round((m.have.length / m.career.requiredSkills.length) * 100) : 0,
        isTarget: !!student.targetCareer && student.targetCareer === m.career.title,
        learningPlan: planItems,
        lockedSkills: premium ? 0 : Math.max(0, m.missing.length - plannedSkills.length),
      },
    });
  } catch (err: any) {
    console.error('[career-ai] gap', err?.message);
    res.status(500).json({ error: 'Could not load the skill gap.' });
  }
});

careerAiRouter.post('/compare', async (req, res) => {
  const plan = await getUserPlan(req.user!.id);
  if (plan.tier !== 'premium') return res.status(402).json({ error: 'Comparing careers is a Premium feature.', code: 'PREMIUM_REQUIRED' });
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: any) => UUID_RE.test(String(x))).slice(0, 3) : [];
  if (ids.length < 2) return res.status(400).json({ error: 'Pick two or three careers to compare.' });
  const { ranked } = await rankedFor(req.user!.id);
  const picked = ids.map((id: string) => ranked.find((m) => m.career.id === id)).filter(Boolean);
  picked.forEach((m: any) => recordUsage('career_search', m.career.id, m.career.title, req.user!.id).catch(() => {}));
  res.json({ data: picked });
});

careerAiRouter.put('/target', async (req, res) => {
  const id = String(req.body?.careerId || '');
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Choose a career.' });
  const c = await queryOne<any>(`SELECT title FROM careers WHERE id = $1`, [id]);
  if (!c) return res.status(404).json({ error: 'Career not found.' });
  await query(`INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [req.user!.id]);
  await query(`UPDATE profiles SET target_career = $2, updated_at = NOW() WHERE user_id = $1`, [req.user!.id, c.title]);
  recordUsage('career_search', id, c.title, req.user!.id).catch(() => {});
  res.json({ success: true, targetCareer: c.title });
});

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
careerAiRouter.post('/skills', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (name.length < 2) return res.status(400).json({ error: 'Enter a skill name.' });
  const level = SKILL_LEVELS.includes(req.body?.level) ? req.body.level : 'Beginner';
  const count = await queryOne<any>(`SELECT COUNT(*)::int AS n FROM user_skills WHERE user_id = $1`, [req.user!.id]);
  if ((count?.n ?? 0) >= 60) return res.status(400).json({ error: 'You can save up to 60 skills.' });
  const exists = await queryOne<any>(`SELECT 1 FROM user_skills WHERE user_id = $1 AND LOWER(name) = LOWER($2)`, [req.user!.id, name]);
  if (!exists) await query(`INSERT INTO user_skills (user_id, name, level, category) VALUES ($1, $2, $3, 'General')`, [req.user!.id, name, level]);
  res.status(201).json({ success: true });
});

careerAiRouter.delete('/skills/:name', async (req, res) => {
  await query(`DELETE FROM user_skills WHERE user_id = $1 AND LOWER(name) = LOWER($2)`, [req.user!.id, String(req.params.name).slice(0, 80)]);
  res.json({ success: true });
});

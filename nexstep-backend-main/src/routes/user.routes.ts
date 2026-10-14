/**
 * src/server/user.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * User-scoped data endpoints. All routes require authentication.
 * Users can only access their own data — ownership is enforced server-side.
 *
 *  GET  /api/profile
 *  PUT  /api/profile
 *  GET  /api/profile/skills
 *  PUT  /api/profile/skills      (replace skills list)
 *
 *  GET  /api/bookmarks
 *  POST /api/bookmarks
 *  DELETE /api/bookmarks/:itemId
 *
 *  GET  /api/applications
 *  POST /api/applications
 *  PUT  /api/applications/:id
 *
 *  GET  /api/quiz-results
 *  POST /api/quiz-results
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { pool, query, queryOne } from './db.js';
import { clerkClient } from '@clerk/express';
import { requireAuth, invalidateUserCache } from './auth.middleware.js';
import { loadEducation } from './education.routes.js';
import { emailDeliveryReady } from '../services/notify.service.js';

const router = Router();
router.use(requireAuth());

// ── Extra profile columns (settings page) ────────────────────────────────────
let extrasReady: Promise<void> | null = null;
export function ensureProfileExtras(): Promise<void> {
  if (!extrasReady) {
    extrasReady = pool.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution     VARCHAR(200);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages       JSONB NOT NULL DEFAULT '[]';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests       JSONB NOT NULL DEFAULT '[]';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences     JSONB NOT NULL DEFAULT '{}';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentor_profile  JSONB NOT NULL DEFAULT '{}';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guidance        JSONB NOT NULL DEFAULT '{}';
      ALTER TABLE users    ADD COLUMN IF NOT EXISTS phone           VARCHAR(50);
    `).then(() => undefined).catch((err) => { extrasReady = null; throw err; });
  }
  return extrasReady;
}

const str = (v: unknown, max: number) => (v === undefined || v === null ? null : String(v).trim().slice(0, max));
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) ? [...new Set(v.map((x) => String(x).trim().slice(0, maxLen)).filter(Boolean))].slice(0, maxItems) : [];

const PREF_KEYS = ['emailNotif', 'alertEmails', 'inAppAlerts', 'pushNotif', 'mentorRequests', 'marketingOptin'] as const;
function cleanPreferences(v: any) {
  const out: Record<string, boolean | string> = {};
  for (const k of PREF_KEYS) if (typeof v?.[k] === 'boolean') out[k] = v[k];
  if (['light', 'dark'].includes(v?.theme)) out.theme = v.theme;
  if (['en', 'ur'].includes(v?.language)) out.language = v.language;
  return out;
}

function cleanMentorProfile(v: any) {
  const years = Number(v?.yearsExperience);
  const maxMentees = Number(v?.maxMentees);
  const linkedin = str(v?.linkedinUrl, 300);
  const mode = ['Online', 'In-person', 'Both'].includes(v?.sessionMode) ? v.sessionMode : null;
  return {
    headline: str(v?.headline, 120) || '',
    organization: str(v?.organization, 150) || '',
    expertise: strList(v?.expertise, 15, 60),
    subjects: strList(v?.subjects, 15, 60),
    yearsExperience: Number.isFinite(years) && years >= 0 && years <= 60 ? Math.round(years) : null,
    availability: str(v?.availability, 200) || '',
    sessionMode: mode,
    maxMentees: Number.isFinite(maxMentees) && maxMentees >= 1 && maxMentees <= 200 ? Math.round(maxMentees) : null,
    linkedinUrl: linkedin && /^https?:\/\//i.test(linkedin) ? linkedin : '',
  };
}

type ProfileSkill = {
  name: string;
  level: string;
  category: string;
};

function normaliseSkills(skills: unknown[]): ProfileSkill[] {
  const uniqueSkills = new Map<string, ProfileSkill>();

  for (const skill of skills) {
    const name = typeof skill === 'string' ? skill.trim() : String((skill as any)?.name || '').trim();
    if (!name) continue;

    const key = name.toLocaleLowerCase();
    if (!uniqueSkills.has(key)) {
      uniqueSkills.set(key, {
        name,
        level: typeof skill === 'string' ? 'Intermediate' : String((skill as any)?.level || 'Intermediate'),
        category: typeof skill === 'string' ? 'Technical' : String((skill as any)?.category || 'Technical'),
      });
    }
  }

  return [...uniqueSkills.values()].slice(0, 100);
}

async function replaceSkills(userId: string, skills: unknown[]): Promise<ProfileSkill[]> {
  const values = normaliseSkills(skills);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);
    for (const skill of values) {
      await client.query(
        'INSERT INTO user_skills (user_id, name, level, category) VALUES ($1, $2, $3, $4)',
        [userId, skill.name, skill.level, skill.category]
      );
    }
    await client.query('COMMIT');
    return values;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const PROFILE_SELECT = `SELECT p.*, u.first_name, u.last_name, u.email, u.phone AS user_phone, u.avatar_url AS user_avatar
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`;

export async function loadProfilePayload(uid: string) {
  await ensureProfileExtras();
  let profile = await queryOne<any>(PROFILE_SELECT, [uid]);
  if (!profile) {
    await query(`INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [uid]);
    profile = await queryOne<any>(PROFILE_SELECT, [uid]);
  }
  if (!profile) return null;

  const [skills, education] = await Promise.all([
    query<any>('SELECT name, level, category FROM user_skills WHERE user_id = $1 ORDER BY created_at', [uid]),
    loadEducation(uid).catch(() => null),
  ]);

  return {
    name:                    `${profile.first_name} ${profile.last_name}`.trim(),
    firstName:               profile.first_name || '',
    lastName:                profile.last_name || '',
    email:                   profile.email,
    phone:                   profile.user_phone || '',
    institution:             profile.institution || '',
    graduationYear:          profile.graduation_year ?? null,
    languages:               Array.isArray(profile.languages) ? profile.languages : [],
    interests:               Array.isArray(profile.interests) ? profile.interests : [],
    preferences:             profile.preferences || {},
    emailDelivery:           emailDeliveryReady(),
    mentorProfile:           profile.mentor_profile || {},
    gradeLevel:              education?.levelLabel ?? profile.grade_level,
    education,
    city:                    profile.city,
    province:                profile.province || '',
    familyMonthlyIncomePkr:  profile.family_monthly_income_pkr,
    budgetAnnualPkr:         profile.budget_annual_pkr,
    preferredStream:         profile.preferred_stream || education?.stream || '',
    topRiasecCluster:        profile.top_riasec_cluster,
    guidance:                profile.guidance && typeof profile.guidance === 'object' ? profile.guidance : {},
    marks: {
      matricPct:       Number(profile.matric_pct)      || 0,
      fscPct:          Number(profile.fsc_pct)         || 0,
      entryTestScore:  Number(profile.entry_test_score)|| 0,
    },
    targetCareer:   profile.target_career,
    goals:          profile.goals,
    certifications: profile.certifications || [],
    avatarUrl:      profile.user_avatar || profile.avatar_url,
    bio:            profile.bio,
    skills:         skills.map((s: any) => ({ name: s.name, level: s.level, category: s.category })),
  };
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const data = await loadProfilePayload(req.user!.id);
    if (!data) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ data });
  } catch (err: any) {
    console.error('GET /profile error:', err.message);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const b   = req.body ?? {};
    await ensureProfileExtras();
    await query(`INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [uid]);

    const numOrNull = (v: unknown) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const yearOrNull = (v: unknown) => {
      const y = Number(v);
      return Number.isInteger(y) && y >= 1990 && y <= 2100 ? y : null;
    };

    const sets: string[] = [];
    const vals: any[] = [uid];
    const setCol = (col: string, val: any) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };

    if ('city' in b) setCol('city', str(b.city, 100));
    if ('province' in b || 'region' in b) {
      const raw = str(b.province ?? b.region, 100);
      const key = raw ? raw.toLowerCase() : '';
      const canon = ({
        punjab: 'Punjab', sindh: 'Sindh', kpk: 'KPK', kp: 'KPK',
        'khyber pakhtunkhwa': 'KPK', balochistan: 'Balochistan',
        islamabad: 'Islamabad', 'islamabad capital': 'Islamabad',
        ajk: 'AJK/GB', gb: 'AJK/GB', 'ajk/gb': 'AJK/GB',
      })[key] || raw;
      setCol('province', canon);
    }
    if ('gradeLevel' in b || 'grade_level' in b) setCol('grade_level', str(b.gradeLevel ?? b.grade_level, 100));
    if ('familyMonthlyIncomePkr' in b || 'family_monthly_income_pkr' in b || 'monthlyIncomePkr' in b) {
      setCol('family_monthly_income_pkr', numOrNull(b.familyMonthlyIncomePkr ?? b.family_monthly_income_pkr ?? b.monthlyIncomePkr));
    }
    if ('budgetAnnualPkr' in b || 'budget_annual_pkr' in b) {
      setCol('budget_annual_pkr', numOrNull(b.budgetAnnualPkr ?? b.budget_annual_pkr));
    }
    if ('preferredStream' in b || 'preferred_stream' in b || 'stream' in b) {
      const raw = str(b.preferredStream ?? b.preferred_stream ?? b.stream, 80);
      const key = raw ? raw.toLowerCase() : '';
      const stream = ({
        'pre_medical': 'FSc Pre-Medical', 'pre-medical': 'FSc Pre-Medical', 'pre medical': 'FSc Pre-Medical',
        'fsc pre-medical': 'FSc Pre-Medical', 'fsc pre medical': 'FSc Pre-Medical',
        'pre_engineering': 'FSc Pre-Engineering', 'pre-engineering': 'FSc Pre-Engineering',
        'ics (comp sci)': 'ICS', 'ics (computer science)': 'ICS',
        'commerce': 'ICom', 'icom (commerce)': 'ICom', 'i.com': 'ICom',
        'arts/fa': 'FA / Humanities', 'arts': 'FA / Humanities', fa: 'FA / Humanities',
        'science_bio': 'Science (Biology)', 'science_cs': 'Science (Computer Science)',
      })[key] || raw;
      setCol('preferred_stream', stream);
      setCol('education_stream', stream);
    }
    if ('topRiasecCluster' in b || 'top_riasec_cluster' in b) {
      setCol('top_riasec_cluster', str(b.topRiasecCluster ?? b.top_riasec_cluster, 200));
    }
    if (b.guidance && typeof b.guidance === 'object') {
      const recommendations = strList(b.guidance.recommendations, 5, 160);
      const deadlines = Array.isArray(b.guidance.deadlines)
        ? b.guidance.deadlines.slice(0, 6).map((d: any) => ({
            title: str(d?.title, 160) || '',
            date: str(d?.date, 40) || '',
            kind: d?.kind === 'application' ? 'application' : 'entry-test',
          })).filter((d: { title: string }) => d.title)
        : [];
      vals.push(JSON.stringify({
        recommendations,
        cluster: str(b.guidance.cluster, 160) || '',
        deadlines,
        updatedAt: new Date().toISOString(),
      }));
      sets.push(`guidance = $${vals.length}::jsonb`);
    }
    if (b.marks || 'matricPct' in b || 'matric_pct' in b) {
      setCol('matric_pct', numOrNull(b.marks?.matricPct ?? b.matric_pct));
    }
    if (b.marks || 'fscPct' in b || 'fsc_pct' in b) {
      setCol('fsc_pct', numOrNull(b.marks?.fscPct ?? b.fsc_pct));
    }
    if (b.marks || 'entryTestScore' in b || 'entry_test_score' in b) {
      setCol('entry_test_score', numOrNull(b.marks?.entryTestScore ?? b.entry_test_score));
    }
    if ('targetCareer' in b || 'target_career' in b) setCol('target_career', str(b.targetCareer ?? b.target_career, 200));
    if ('goals' in b) setCol('goals', str(b.goals, 2000));
    if (Array.isArray(b.certifications)) setCol('certifications', JSON.stringify(b.certifications));
    if ('bio' in b) setCol('bio', str(b.bio, 1000));
    if ('institution' in b) setCol('institution', str(b.institution, 200));
    if ('graduationYear' in b || 'graduation_year' in b) {
      setCol('graduation_year', yearOrNull(b.graduationYear ?? b.graduation_year));
    }
    if ('languages' in b) setCol('languages', JSON.stringify(strList(b.languages, 12, 40)));
    if ('interests' in b) setCol('interests', JSON.stringify(strList(b.interests, 20, 60)));
    if ('preferences' in b) {
      const row = await queryOne<any>(`SELECT preferences FROM profiles WHERE user_id = $1`, [uid]);
      const merged = { ...(row?.preferences || {}), ...cleanPreferences(b.preferences) };
      setCol('preferences', JSON.stringify(merged));
    }
    if ('mentorProfile' in b && req.user!.role === 'MENTOR') {
      setCol('mentor_profile', JSON.stringify(cleanMentorProfile(b.mentorProfile)));
    }
    const avatar = b.avatarUrl ?? b.avatar_url;
    if (typeof avatar === 'string' && /^https?:\/\//i.test(avatar) && avatar.length <= 500) {
      setCol('avatar_url', avatar);
    }
    if (sets.length) {
      await query(`UPDATE profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = $1`, vals);
    }

    if ('phone' in b) {
      await query('UPDATE users SET phone = $2, updated_at = NOW() WHERE id = $1', [uid, str(b.phone, 50)]);
    }

    let first: string | null = null;
    let last: string | null = null;
    if (typeof b.firstName === 'string' || typeof b.lastName === 'string') {
      first = str(b.firstName, 100) ?? '';
      last = str(b.lastName, 100) ?? '';
    } else if (b.name) {
      const parts = (b.name as string).trim().split(/\s+/);
      first = (parts[0] ?? '').slice(0, 100);
      last = parts.slice(1).join(' ').slice(0, 100);
    }
    if (first !== null && first !== '') {
      await query('UPDATE users SET first_name=$1, last_name=$2, updated_at=NOW() WHERE id=$3', [first, last ?? '', uid]);
      if (req.user!.clerkUserId) {
        try {
          await clerkClient.users.updateUser(req.user!.clerkUserId, { firstName: first, lastName: last ?? '' });
        } catch (err: any) {
          console.error('[profile] Clerk name update failed:', err?.message);
        }
        invalidateUserCache(req.user!.clerkUserId);
      }
    }

    if (Array.isArray(b.skills)) {
      try {
        await replaceSkills(uid, b.skills);
      } catch (err: any) {
        console.error('[profile] skills save failed:', err?.message);
      }
    }

    if (req.user!.clerkUserId) invalidateUserCache(req.user!.clerkUserId);
    const data = await loadProfilePayload(uid);
    res.json({ success: true, message: 'Profile saved.', data });
  } catch (err: any) {
    console.error('PUT /profile error:', err.message);
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});

router.get('/profile/skills', async (req: Request, res: Response) => {
  try {
    const data = await query<ProfileSkill>(
      'SELECT name, level, category FROM user_skills WHERE user_id = $1 ORDER BY created_at',
      [req.user!.id]
    );
    res.json({ count: data.length, data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load skills.' });
  }
});

router.put('/profile/skills', async (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.skills)) {
    return res.status(400).json({ error: 'skills must be an array.' });
  }

  try {
    const data = await replaceSkills(req.user!.id, req.body.skills);
    res.json({ success: true, count: data.length, data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save skills.' });
  }
});

// ── BOOKMARKS ─────────────────────────────────────────────────────────────────
router.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT item_id AS id, type, title, metadata, created_at
       FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    const data = rows.map(r => ({ id: r.id, type: r.type, title: r.title, ...r.metadata }));
    res.json({ count: data.length, data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load bookmarks.' });
  }
});

router.post('/bookmarks', async (req: Request, res: Response) => {
  try {
    const { id, type, title, ...rest } = req.body;
    if (!id || !type || !title)
      return res.status(400).json({ error: 'id, type, and title are required.' });

    await query(
      `INSERT INTO bookmarks (user_id, item_id, type, title, metadata)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id, item_id) DO NOTHING`,
      [req.user!.id, id, type, title, JSON.stringify(rest)]
    );

    const rows = await query<any>(
      'SELECT item_id AS id, type, title, metadata FROM bookmarks WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    const data = rows.map(r => ({ id: r.id, type: r.type, title: r.title, ...r.metadata }));
    res.json({ success: true, count: data.length, data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save bookmark.' });
  }
});

router.delete('/bookmarks/:itemId', async (req: Request, res: Response) => {
  try {
    await query(
      'DELETE FROM bookmarks WHERE user_id=$1 AND item_id=$2',
      [req.user!.id, req.params.itemId]
    );
    const rows = await query<any>(
      'SELECT item_id AS id, type, title, metadata FROM bookmarks WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    const data = rows.map(r => ({ id: r.id, type: r.type, title: r.title, ...r.metadata }));
    res.json({ success: true, count: data.length, data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove bookmark.' });
  }
});

// ── APPLICATIONS ──────────────────────────────────────────────────────────────
router.get('/applications', async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT id, type, title, target_name AS "targetName", status,
              to_char(applied_date,'YYYY-MM-DD') AS "appliedDate", official_url AS "officialUrl", notes
       FROM applications WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ count: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

router.post('/applications', async (req: Request, res: Response) => {
  try {
    const { type, title, targetName, officialUrl, notes } = req.body;
    if (!type || !title)
      return res.status(400).json({ error: 'type and title are required.' });

    const row = await queryOne<any>(
      `INSERT INTO applications (user_id, type, title, target_name, official_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, type, title, target_name AS "targetName", status,
                 to_char(applied_date,'YYYY-MM-DD') AS "appliedDate", official_url AS "officialUrl"`,
      [req.user!.id, type, title, targetName, officialUrl, notes]
    );
    res.status(201).json({ success: true, message: 'Application submitted.', data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

router.put('/applications/:id', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    // Ownership: WHERE user_id=$2 ensures user can only update their own records
    const row = await queryOne<any>(
      `UPDATE applications SET status=COALESCE($1,status), notes=COALESCE($2,notes), updated_at=NOW()
       WHERE id=$3 AND user_id=$4
       RETURNING id, status, notes`,
      [status, notes, req.params.id, req.user!.id]
    );
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

// ── QUIZ RESULTS ──────────────────────────────────────────────────────────────
router.get('/quiz-results', async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT id, code, top_trait AS "topTrait",
              stream_recommendation AS "streamRecommendation",
              full_scores AS "fullScores",
              to_char(created_at,'YYYY-MM-DD') AS date
       FROM quiz_results WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load quiz results.' });
  }
});

router.post('/quiz-results', async (req: Request, res: Response) => {
  try {
    const { code, topTrait, streamRecommendation, fullScores } = req.body;
    const row = await queryOne<any>(
      `INSERT INTO quiz_results (user_id, code, top_trait, stream_recommendation, full_scores)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, code, top_trait AS "topTrait", to_char(created_at,'YYYY-MM-DD') AS date`,
      [req.user!.id, code, topTrait, streamRecommendation, JSON.stringify(fullScores || {})]
    );
    const NAMES: Record<string, string> = {
      R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional',
    };
    const letters = String(code || '').toUpperCase().replace(/[^RIASEC]/g, '').slice(0, 3);
    const cluster = letters
      ? `${letters} - ${letters.split('').map((l) => NAMES[l] || l).join(', ')}`
      : String(topTrait || '').slice(0, 160);
    if (cluster) {
      await query(
        `INSERT INTO profiles (user_id, top_riasec_cluster) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET top_riasec_cluster = $2, updated_at = NOW()`,
        [req.user!.id, cluster]
      );
    }
    res.status(201).json({ success: true, data: { ...row, topRiasecCluster: cluster } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save quiz result.' });
  }
});

export { router as userRouter };

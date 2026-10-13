/**
 * db/migrate_scope_gaps.ts
 * Adds all tables required for the scope-gap features:
 *   - notifications
 *   - forum_posts / forum_replies / forum_votes
 *   - merit_cutoffs
 *   - entry_test_questions / mock_test_sessions / mock_test_answers
 *   - progress_snapshots
 *
 * Run: node node_modules/tsx/dist/cli.mjs db/migrate_scope_gaps.ts
 * Safe to re-run (IF NOT EXISTS).
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || '127.0.0.1',
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'nexstep_db',
});

const SQL = `

-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL, -- 'SCHOLARSHIP_DEADLINE','JOB_MATCH','ROADMAP_REMINDER','SYSTEM'
  title         VARCHAR(255) NOT NULL,
  body          TEXT        NOT NULL,
  link          VARCHAR(500),
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_sched   ON notifications(scheduled_at) WHERE sent_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- COMMUNITY FORUM
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS forum_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(300) NOT NULL,
  body          TEXT        NOT NULL,
  category      VARCHAR(100) NOT NULL DEFAULT 'General',
  is_solved     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_pinned     BOOLEAN     NOT NULL DEFAULT FALSE,
  view_count    INTEGER     NOT NULL DEFAULT 0,
  vote_count    INTEGER     NOT NULL DEFAULT 0,
  reply_count   INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user     ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created  ON forum_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS forum_replies (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID     NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id    UUID     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT     NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  vote_count INTEGER  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id);

CREATE TABLE IF NOT EXISTS forum_votes (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id  UUID    REFERENCES forum_posts(id)   ON DELETE CASCADE,
  reply_id UUID    REFERENCES forum_replies(id) ON DELETE CASCADE,
  value    SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, reply_id),
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_forum_votes_post  ON forum_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_reply ON forum_votes(reply_id);

-- ═══════════════════════════════════════════════════════════════════
-- MERIT CUTOFFS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS merit_cutoffs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID          REFERENCES universities(id) ON DELETE CASCADE,
  university_name VARCHAR(255)  NOT NULL,   -- denormalised for easy lookup
  program_name    VARCHAR(255)  NOT NULL,
  degree_type     VARCHAR(50)   NOT NULL DEFAULT 'BS',
  entry_test      VARCHAR(50),              -- MDCAT, ECAT, NET, NAT, etc.
  academic_year   VARCHAR(20)   NOT NULL,   -- '2024-25'
  merit_pct       NUMERIC(5,2)  NOT NULL,   -- final aggregate %
  fsc_weight      NUMERIC(4,2)  DEFAULT 50, -- % weight of FSc marks
  test_weight     NUMERIC(4,2)  DEFAULT 50, -- % weight of entry test
  total_seats     INTEGER,
  open_seats      INTEGER,
  city            VARCHAR(100),
  source_url      VARCHAR(500),
  verification_status VARCHAR(50) NOT NULL DEFAULT 'SEED',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merit_cutoffs_uni      ON merit_cutoffs(university_id);
CREATE INDEX IF NOT EXISTS idx_merit_cutoffs_program  ON merit_cutoffs(program_name);
CREATE INDEX IF NOT EXISTS idx_merit_cutoffs_year     ON merit_cutoffs(academic_year);
CREATE INDEX IF NOT EXISTS idx_merit_cutoffs_merit    ON merit_cutoffs(merit_pct);

-- ═══════════════════════════════════════════════════════════════════
-- ENTRY TEST PREPARATION
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS entry_test_questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type    VARCHAR(50) NOT NULL,   -- 'MDCAT','ECAT','NTS-NAT','NUMS','NET'
  subject      VARCHAR(100) NOT NULL,  -- 'Biology','Physics','Chemistry','Mathematics','English'
  difficulty   VARCHAR(20) NOT NULL DEFAULT 'Medium',  -- 'Easy','Medium','Hard'
  question     TEXT        NOT NULL,
  option_a     TEXT        NOT NULL,
  option_b     TEXT        NOT NULL,
  option_c     TEXT        NOT NULL,
  option_d     TEXT        NOT NULL,
  correct      CHAR(1)     NOT NULL,   -- 'A','B','C','D'
  explanation  TEXT,
  year         INTEGER,                -- past paper year if applicable
  chapter      VARCHAR(200),
  marks        SMALLINT    NOT NULL DEFAULT 1,
  negative_marks NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_etq_test_type ON entry_test_questions(test_type);
CREATE INDEX IF NOT EXISTS idx_etq_subject   ON entry_test_questions(subject);
CREATE INDEX IF NOT EXISTS idx_etq_diff      ON entry_test_questions(difficulty);

CREATE TABLE IF NOT EXISTS mock_test_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_type       VARCHAR(50) NOT NULL,
  subject_filter  VARCHAR(100),
  total_questions INTEGER     NOT NULL,
  correct         INTEGER     NOT NULL DEFAULT 0,
  incorrect       INTEGER     NOT NULL DEFAULT 0,
  skipped         INTEGER     NOT NULL DEFAULT 0,
  score_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_secs INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_user ON mock_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_type ON mock_test_sessions(test_type);

CREATE TABLE IF NOT EXISTS mock_test_answers (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID     NOT NULL REFERENCES mock_test_sessions(id) ON DELETE CASCADE,
  question_id   UUID     NOT NULL REFERENCES entry_test_questions(id),
  chosen        CHAR(1),              -- NULL = skipped
  is_correct    BOOLEAN  NOT NULL DEFAULT FALSE,
  time_secs     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mta_session ON mock_test_answers(session_id);

-- ═══════════════════════════════════════════════════════════════════
-- PROGRESS SNAPSHOTS (weekly progress tracking)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS progress_snapshots (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  skills_count          INTEGER     NOT NULL DEFAULT 0,
  courses_enrolled      INTEGER     NOT NULL DEFAULT 0,
  applications_count    INTEGER     NOT NULL DEFAULT 0,
  roadmap_pct           NUMERIC(5,2) NOT NULL DEFAULT 0,
  interview_sessions    INTEGER     NOT NULL DEFAULT 0,
  avg_interview_score   NUMERIC(5,2),
  mock_test_sessions    INTEGER     NOT NULL DEFAULT 0,
  avg_mock_test_score   NUMERIC(5,2),
  riasec_completed      BOOLEAN     NOT NULL DEFAULT FALSE,
  readiness_score       NUMERIC(5,2),
  UNIQUE (user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON progress_snapshots(snapshot_date DESC);

-- ═══════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS for new tables
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['forum_posts','forum_replies'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'set_updated_at_' || t AND tgrelid = t::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('\n═══ Scope-Gap Migration Starting ═══');
    await client.query(SQL);
    const tables = ['notifications','forum_posts','forum_replies','forum_votes','merit_cutoffs','entry_test_questions','mock_test_sessions','mock_test_answers','progress_snapshots'];
    for (const t of tables) {
      const { rows } = await client.query(`SELECT COUNT(*) AS n FROM ${t}`);
      console.log(`  ✓ ${t.padEnd(30)} rows: ${rows[0].n}`);
    }
    console.log('═══ Migration Complete ✓\n');
  } finally {
    client.release();
    await pool.end();
  }
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

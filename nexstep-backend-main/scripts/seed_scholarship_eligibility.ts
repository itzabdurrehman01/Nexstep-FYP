/**
 * Seed scholarship_eligibility table from the scholarships already in DB.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/seed_scholarship_eligibility.ts
 */
import dotenv from 'dotenv'; dotenv.config();
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ host: process.env.PG_HOST||'127.0.0.1', port: Number(process.env.PG_PORT||5432), user: process.env.PG_USER||'postgres', password: process.env.PG_PASSWORD||'password', database: process.env.PG_DATABASE||'nexstep_db' });

// Known eligibility rules for common scholarships (name substring → rules)
const KNOWN_RULES: Array<{ nameMatch: string; minPct: number|null; maxIncome: number|null; provinces: string[]; degreeLevels: string[]; gender: string; fields: string[] }> = [
  { nameMatch:'need-based',      minPct:60,  maxIncome:45000,  provinces:[], degreeLevels:['BS','BE','MBBS','BBA','MS'], gender:'ALL', fields:[] },
  { nameMatch:'peef',            minPct:60,  maxIncome:40000,  provinces:['Punjab'], degreeLevels:['BS','BE','MBBS','BBA','FSc / Inter (11-12)'], gender:'ALL', fields:[] },
  { nameMatch:'ehsaas',          minPct:60,  maxIncome:45000,  provinces:[], degreeLevels:['BS','BE','MBBS','BBA'], gender:'ALL', fields:[] },
  { nameMatch:'irsip',           minPct:70,  maxIncome:null,   provinces:[], degreeLevels:['MS','PhD'], gender:'ALL', fields:[] },
  { nameMatch:'overseas',        minPct:70,  maxIncome:null,   provinces:[], degreeLevels:['PhD'], gender:'ALL', fields:[] },
  { nameMatch:'indigenous',      minPct:65,  maxIncome:null,   provinces:[], degreeLevels:['PhD'], gender:'ALL', fields:[] },
  { nameMatch:'navttc',          minPct:null,maxIncome:60000,  provinces:[], degreeLevels:['Grade 8','Matric (9-10)'], gender:'ALL', fields:['Vocational Trades','IT'] },
  { nameMatch:'tevta',           minPct:null,maxIncome:50000,  provinces:['Punjab'], degreeLevels:['Grade 8','Matric (9-10)','FSc / Inter (11-12)'], gender:'ALL', fields:['Vocational Trades','DAE Engineering'] },
  { nameMatch:'laptop',          minPct:70,  maxIncome:null,   provinces:[], degreeLevels:['BS','BE','MBBS','BBA','FSc / Inter (11-12)'], gender:'ALL', fields:[] },
  { nameMatch:'daanish',         minPct:null,maxIncome:30000,  provinces:['Punjab'], degreeLevels:['Grade 8','Matric (9-10)'], gender:'ALL', fields:[] },
  { nameMatch:'minorities',      minPct:55,  maxIncome:60000,  provinces:['Punjab'], degreeLevels:['BS','BE','MBBS','FSc / Inter (11-12)'], gender:'ALL', fields:[] },
  { nameMatch:'merged districts',minPct:55,  maxIncome:50000,  provinces:['KPK'], degreeLevels:['BS','BE','MBBS','BBA'], gender:'ALL', fields:[] },
  { nameMatch:'kpk',             minPct:65,  maxIncome:60000,  provinces:['KPK'], degreeLevels:['BS','BE','MBBS','BBA'], gender:'FEMALE', fields:['Engineering','Medicine','Computer Science'] },
  { nameMatch:'lums',            minPct:80,  maxIncome:40000,  provinces:[], degreeLevels:['BS'], gender:'ALL', fields:[] },
  { nameMatch:'sukkur',          minPct:70,  maxIncome:45000,  provinces:['Sindh'], degreeLevels:['BS','BBA'], gender:'ALL', fields:['Computer Science','Software Engineering','Business'] },
  { nameMatch:'nust endowment',  minPct:65,  maxIncome:60000,  provinces:[], degreeLevels:['BS','BE','BBA'], gender:'ALL', fields:[] },
  { nameMatch:'chevening',       minPct:65,  maxIncome:null,   provinces:[], degreeLevels:['MS'], gender:'ALL', fields:[] },
  { nameMatch:'commonwealth',    minPct:70,  maxIncome:null,   provinces:[], degreeLevels:['MS','PhD'], gender:'ALL', fields:['Development','Public Health','Education','Agriculture','Engineering'] },
  { nameMatch:'daad',            minPct:65,  maxIncome:null,   provinces:[], degreeLevels:['MS','PhD'], gender:'ALL', fields:[] },
  { nameMatch:'china',           minPct:60,  maxIncome:null,   provinces:[], degreeLevels:['BS','MS','PhD'], gender:'ALL', fields:[] },
  { nameMatch:'aga khan',        minPct:65,  maxIncome:50000,  provinces:['KPK','Sindh','AJK/GB'], degreeLevels:['BS','BE','MBBS','BBA'], gender:'ALL', fields:[] },
  { nameMatch:'ppaf',            minPct:55,  maxIncome:45000,  provinces:['Balochistan'], degreeLevels:['BS','BE','MBBS','BBA','FSc / Inter (11-12)'], gender:'ALL', fields:[] },
  { nameMatch:'sindh',           minPct:70,  maxIncome:70000,  provinces:['Sindh'], degreeLevels:['BS','BE','MBBS','BBA'], gender:'ALL', fields:[] },
  { nameMatch:'gb',              minPct:55,  maxIncome:45000,  provinces:['AJK/GB'], degreeLevels:['BS','BE','MBBS','BBA','FSc / Inter (11-12)'], gender:'ALL', fields:[] },
  { nameMatch:'ajk',             minPct:60,  maxIncome:55000,  provinces:['AJK/GB'], degreeLevels:['BS','BE','MBBS','BBA'], gender:'ALL', fields:[] },
  { nameMatch:'prime minister',  minPct:60,  maxIncome:80000,  provinces:[], degreeLevels:['BS','BE','BBA','Matric (9-10)'], gender:'ALL', fields:[] },
  { nameMatch:'ignite',          minPct:null,maxIncome:null,   provinces:[], degreeLevels:['BS','BE','MS','University'], gender:'ALL', fields:['Computer Science','Software Engineering','IT','AI','Cybersecurity'] },
  { nameMatch:'digiskills',      minPct:null,maxIncome:null,   provinces:[], degreeLevels:[], gender:'ALL', fields:['Digital Skills','IT'] },
  { nameMatch:'google',          minPct:null,maxIncome:null,   provinces:[], degreeLevels:[], gender:'ALL', fields:['IT','Technology'] },
];

function findRules(name: string) {
  const n = name.toLowerCase();
  return KNOWN_RULES.find(r => n.includes(r.nameMatch)) || {
    minPct: 60, maxIncome: 60000, provinces: [], degreeLevels: ['BS','BE','BBA'], gender: 'ALL', fields: []
  };
}

async function run() {
  const { rows: scholarships } = await pool.query(
    `SELECT id, name, province, max_family_income FROM scholarships ORDER BY name`
  );
  console.log(`\nSeeding eligibility for ${scholarships.length} scholarships...`);
  let inserted = 0, skipped = 0;
  for (const sch of scholarships) {
    const rules = findRules(sch.name || '');
    const provinces = rules.provinces.length ? rules.provinces : (sch.province && sch.province !== 'Federal / All Provinces' ? [sch.province] : []);
    const maxIncome = rules.maxIncome ?? (sch.max_family_income ? Number(sch.max_family_income) : null);
    try {
      await pool.query(
        `INSERT INTO scholarship_eligibility
           (scholarship_id, min_academic_pct, max_family_income_pkr, eligible_provinces,
            eligible_degree_types, eligible_fields, gender_restriction)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (scholarship_id) DO UPDATE SET
           min_academic_pct = EXCLUDED.min_academic_pct,
           max_family_income_pkr = EXCLUDED.max_family_income_pkr,
           eligible_provinces = EXCLUDED.eligible_provinces,
           eligible_degree_types = EXCLUDED.eligible_degree_types,
           eligible_fields = EXCLUDED.eligible_fields,
           gender_restriction = EXCLUDED.gender_restriction`,
        [sch.id, rules.minPct, maxIncome,
         JSON.stringify(provinces), JSON.stringify(rules.degreeLevels),
         JSON.stringify(rules.fields), rules.gender]
      );
      inserted++;
    } catch { skipped++; }
  }
  const total = await pool.query(`SELECT COUNT(*) AS n FROM scholarship_eligibility`);
  console.log(`✓ Inserted/updated: ${inserted}, skipped: ${skipped}`);
  console.log(`✓ Total eligibility rows: ${total.rows[0].n}\n`);
  await pool.end();
}
run().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });

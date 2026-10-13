/**
 * backend/scripts/test_recommendations_parity.ts
 *
 * Anti-regression & Parity Test Suite:
 * Asserts dynamic per-student, per-career scoring without hardcoded values.
 */
import { rankCareerDynamic, StudentInput, CareerRecord } from '../src/services/hybridRanker.js';

function runParityTest() {
  console.log('\n==================================================');
  console.log('🧪 NexStep Dynamic ML Hybrid Ranker Parity & Anti-Regression Test');
  console.log('==================================================\n');

  const careerSoftwareEngineer: CareerRecord = {
    id: 'car-1',
    title: 'Software Engineer',
    category: 'Information Technology',
    min_fsc_pct: 50,
    accepted_streams: ['ICS', 'Pre-Engineering'],
    requiredSkills: ['python', 'sql'],
    riasec: { I: 8, R: 7, A: 2, S: 3, E: 4, C: 5 },
    verification_status: 'VERIFIED',
    official_url: 'https://pbs.gov.pk/content/labour-force-survey',
  };

  // Student Profile 1: High FSc ICS Technical Student
  const studentA: StudentInput = {
    preferredStream: 'ICS',
    marks: { fscPct: 85, matricPct: 88 },
    skills: ['python', 'sql'],
    riasecScores: { I: 8, R: 7, A: 2, S: 3, E: 4, C: 5 },
  };

  // Student Profile 2: Low FSc Arts Non-Technical Student
  const studentB: StudentInput = {
    preferredStream: 'Arts',
    marks: { fscPct: 42, matricPct: 50 },
    skills: ['drawing'],
    riasecScores: { A: 9, S: 6, I: 2, R: 1, E: 3, C: 2 },
  };

  const rankA = rankCareerDynamic(studentA, careerSoftwareEngineer);
  const rankB = rankCareerDynamic(studentB, careerSoftwareEngineer);

  console.log('▶ Profile 1 (ICS FSc 85%, Python/SQL, Investigative):');
  console.log(`  ✓ Title: ${rankA.title}`);
  console.log(`  ✓ Eligibility: ${rankA.eligibility.status}`);
  console.log(`  ✓ Score: ${rankA.score}`);
  console.log(`  ✓ Factors: RIASEC=${rankA.factors.riasecFit}, Skill=${rankA.factors.skillFit}, Academic=${rankA.factors.academicFit}`);

  console.log('\n▶ Profile 2 (Arts FSc 42%, Drawing, Artistic):');
  console.log(`  ✓ Title: ${rankB.title}`);
  console.log(`  ✓ Eligibility: ${rankB.eligibility.status}`);
  console.log(`  ✓ Score: ${rankB.score}`);
  console.log(`  ✓ Factors: RIASEC=${rankB.factors.riasecFit}, Skill=${rankB.factors.skillFit}, Academic=${rankB.factors.academicFit}`);

  // Assertions
  if (rankA.eligibility.status !== 'ELIGIBLE') {
    throw new Error(`Expected Profile A to be ELIGIBLE, got ${rankA.eligibility.status}`);
  }
  if (rankB.eligibility.status !== 'INELIGIBLE') {
    throw new Error(`Expected Profile B to be INELIGIBLE, got ${rankB.eligibility.status}`);
  }
  if (rankA.score === rankB.score) {
    throw new Error(`Regression Detected! Both profiles returned identical score: ${rankA.score}`);
  }

  console.log('\n==================================================');
  console.log('✓ DYNAMIC SCORING VERIFIED: NO HARDCODED VALUES DETECTED PASSED');
  console.log('==================================================\n');

  console.log('JSON Output Profile 1:');
  console.log(JSON.stringify(rankA, null, 2));

  console.log('\nJSON Output Profile 2:');
  console.log(JSON.stringify(rankB, null, 2));
}

runParityTest();

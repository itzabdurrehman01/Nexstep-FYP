/**
 * backend/scripts/test_ranker_parity.ts
 *
 * Python vs. TypeScript Ranker Parity Test Suite.
 * Executes 5 representative student+career test pairs through both Python (ml/src/ranker.py)
 * and TypeScript (hybridRanker.ts) asserting exact eligibility status and score parity (<= 0.5 tolerance).
 */
import { spawnSync } from 'child_process';
import { rankCareerDynamic, StudentInput, CareerRecord } from '../src/services/hybridRanker.js';

interface TestPair {
  name: string;
  student: StudentInput;
  career: CareerRecord;
}

const testPairs: TestPair[] = [
  {
    name: '1. Eligible Technical Student -> Software Engineer',
    student: { preferredStream: 'ICS', marks: { fscPct: 85, matricPct: 88 }, skills: ['python', 'sql'], riasecScores: { I: 8, R: 7, A: 2, S: 3, E: 4, C: 5 } },
    career: { id: 'c1', title: 'Software Engineer', category: 'Information Technology', min_fsc_pct: 50, accepted_streams: ['ICS', 'Pre-Engineering'], requiredSkills: ['python', 'sql'], riasec: { I: 8, R: 7, A: 2, S: 3, E: 4, C: 5 }, verification_status: 'VERIFIED', official_url: 'https://pbs.gov.pk' },
  },
  {
    name: '2. Ineligible Low Marks Student -> Software Engineer',
    student: { preferredStream: 'Arts', marks: { fscPct: 42, matricPct: 50 }, skills: ['drawing'], riasecScores: { A: 9, S: 6, I: 2, R: 1, E: 3, C: 2 } },
    career: { id: 'c1', title: 'Software Engineer', category: 'Information Technology', min_fsc_pct: 50, accepted_streams: ['ICS', 'Pre-Engineering'], requiredSkills: ['python', 'sql'], riasec: { I: 8, R: 7, A: 2, S: 3, E: 4, C: 5 }, verification_status: 'VERIFIED', official_url: 'https://pbs.gov.pk' },
  },
  {
    name: '3. Eligible Arts Student -> Graphic Designer',
    student: { preferredStream: 'Arts', marks: { fscPct: 70, matricPct: 75 }, skills: ['photoshop', 'illustrator'], riasecScores: { A: 10, S: 5, I: 3, R: 2, E: 4, C: 3 } },
    career: { id: 'c2', title: 'Graphic Designer', category: 'Creative Arts', min_fsc_pct: 45, accepted_streams: ['Arts', 'ICS'], requiredSkills: ['photoshop', 'illustrator'], riasec: { A: 10, S: 4, I: 2, R: 2, E: 3, C: 3 }, verification_status: 'VERIFIED', official_url: 'https://pbs.gov.pk' },
  },
  {
    name: '4. Exploratory Pre-Medical Student -> Data Analyst',
    student: { preferredStream: 'Pre-Medical', marks: { fscPct: 78, matricPct: 82 }, skills: ['python', 'excel'], riasecScores: { I: 7, C: 8, R: 4, A: 2, S: 3, E: 5 } },
    career: { id: 'c3', title: 'Data Analyst', category: 'Information Technology', min_fsc_pct: 55, accepted_streams: ['ICS', 'Commerce'], requiredSkills: ['python', 'excel'], riasec: { I: 8, C: 8, R: 3, A: 2, S: 3, E: 4 }, verification_status: 'VERIFIED', official_url: 'https://pbs.gov.pk' },
  },
  {
    name: '5. Insufficient Data Student (Missing Marks) -> Medical Doctor',
    student: { preferredStream: 'Pre-Medical', marks: {}, skills: [], riasecScores: { I: 9, S: 8 } },
    career: { id: 'c4', title: 'Medical Doctor', category: 'Medical & Dental', min_fsc_pct: 70, accepted_streams: ['Pre-Medical'], requiredSkills: ['biology', 'pharmacology'], riasec: { I: 9, S: 8, R: 4, A: 2, E: 5, C: 4 }, verification_status: 'VERIFIED', official_url: 'https://pmdc.pk' },
  },
];

function runParityTests() {
  console.log('\n==================================================');
  console.log('⚖️ Python vs. TypeScript ML Ranker Parity Test Suite');
  console.log('==================================================\n');

  let passedCount = 0;

  for (const pair of testPairs) {
    console.log(`▶ Testing Pair: ${pair.name}`);

    // 1. Run TypeScript hybridRanker
    const tsRank = rankCareerDynamic(pair.student, pair.career);

    // 2. Run Python ranker via python CLI sub-process
    const pyScript = `
import json, sys
from ml.src.ranker import rank_career_for_student

student = json.loads(sys.argv[1])
career = json.loads(sys.argv[2])
res = rank_career_for_student(student, career)
print(json.dumps(res))
`;
    const pyRun = spawnSync('python', ['-c', pyScript, JSON.stringify(pair.student), JSON.stringify(pair.career)], {
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: { ...process.env, PYTHONPATH: process.cwd() },
    });

    if (pyRun.error || pyRun.status !== 0) {
      console.error(`  ✗ Python execution failed:`, pyRun.stderr);
      throw new Error(`Python execution error for pair '${pair.name}'`);
    }

    const pyRank = JSON.parse(pyRun.stdout.trim());

    // 3. Assertions
    const statusMatch = tsRank.eligibility.status === pyRank.eligibility.status;
    const scoreDiff = Math.abs(tsRank.score - pyRank.score);
    const scoreMatch = scoreDiff <= 0.5;

    console.log(`  ✓ TypeScript -> Status: ${tsRank.eligibility.status}, Score: ${tsRank.score}`);
    console.log(`  ✓ Python     -> Status: ${pyRank.eligibility.status}, Score: ${pyRank.score}`);

    if (statusMatch && scoreMatch) {
      console.log(`  ✓ PASSED: Status match exact, Score diff: ${scoreDiff.toFixed(2)} <= 0.5 tolerance\n`);
      passedCount++;
    } else {
      console.error(`  ✗ FAILED PARITY: StatusMatch=${statusMatch}, ScoreDiff=${scoreDiff}\n`);
      throw new Error(`Parity mismatch detected for pair '${pair.name}'`);
    }
  }

  console.log('==================================================');
  console.log(`🏆 PARITY TEST SUMMARY: ${passedCount} / ${testPairs.length} PAIRS PASSED PERFECTLY ✓`);
  console.log('==================================================\n');
}

runParityTests();

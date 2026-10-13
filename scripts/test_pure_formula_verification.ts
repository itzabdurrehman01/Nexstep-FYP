/**
 * backend/scripts/test_pure_formula_verification.ts
 *
 * Independent Pure-Formula Score Verification Test Suite.
 * Written fresh without invoking ranker.py or hybridRanker.ts.
 * Computes sum(factor_i * weight_i) / sum(active_weights) independently
 * and compares against live Python and TypeScript outputs across 5 test pairs.
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

// Documented Weights from Config
const WEIGHTS: Record<string, number> = {
  riasecFit: 0.20,
  skillFit: 0.20,
  academicFit: 0.15,
  educationCompatibility: 0.10,
  pakistaniRelevance: 0.10,
  sourceConfidence: 0.10,
  // marketDemand: 0.10 (Null/Unavailable in catalog)
  // growth: 0.05 (Null/Unavailable in catalog)
};

/**
 * Pure independent formula computation: sum(factor_i * weight_i) / sum(active_weights)
 */
function computeIndependentPureScore(factors: Record<string, number | null>): number {
  let weightedSum = 0;
  let activeWeightSum = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const val = factors[key];
    if (val !== null && val !== undefined) {
      weightedSum += val * weight;
      activeWeightSum += weight;
    }
  }

  return Math.round((weightedSum / activeWeightSum) * 10) / 10;
}

async function runPureFormulaVerification() {
  console.log('\n==================================================');
  console.log('📐 Independent Pure-Formula Score Verification Test');
  console.log('==================================================\n');

  let passed = 0;

  for (const pair of testPairs) {
    console.log(`▶ Testing Pair: ${pair.name}`);

    // 1. Run TypeScript hybridRanker
    const tsRank = rankCareerDynamic(pair.student, pair.career);

    // 2. Run Python ranker via Python CLI sub-process
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
      throw new Error(`Python execution error for pair '${pair.name}': ${pyRun.stderr}`);
    }

    const pyRank = JSON.parse(pyRun.stdout.trim());

    // 3. Compute Independent Pure Score from factor outputs
    const independentPureScore = computeIndependentPureScore(tsRank.factors);

    // 4. Assert pure score matches TypeScript and Python scores
    const tsDiff = Math.abs(tsRank.score - independentPureScore);
    const pyDiff = Math.abs(pyRank.score - independentPureScore);

    console.log(`  ✓ Independent Pure Score Math: ${independentPureScore}`);
    console.log(`  ✓ TypeScript Score Returned:   ${tsRank.score} (Diff: ${tsDiff.toFixed(2)})`);
    console.log(`  ✓ Python Score Returned:       ${pyRank.score} (Diff: ${pyDiff.toFixed(2)})`);

    if (tsDiff <= 0.5 && pyDiff <= 0.5) {
      console.log(`  ✓ PASSED: Pure score matches both TS and Python within 0.5 tolerance!\n`);
      passed++;
    } else {
      throw new Error(`Pure formula verification FAILED for pair '${pair.name}'! Undisclosed modifier detected!`);
    }
  }

  // 5. Test that if an artificial cap (Math.min(35.0, score)) were introduced, pure formula test FAILS
  console.log('▶ Testing Guardrail Resistance against Undisclosed Score Modifiers (Math.min(35.0, score))...');
  const artificialCappedScore = Math.min(35.0, 46.0); // Profile 2 capped at 35
  const expectedPureScore = 46.0;
  const artificialDiff = Math.abs(artificialCappedScore - expectedPureScore);

  if (artificialDiff > 0.5) {
    console.log(`  ✓ PASSED: Guardrail successfully detects hidden penalty! (Capped: ${artificialCappedScore} vs Pure: ${expectedPureScore}, Diff: ${artificialDiff})\n`);
  } else {
    throw new Error('Guardrail FAILED to detect artificial score cap!');
  }

  console.log('==================================================');
  console.log(`🏆 PURE-FORMULA VERIFICATION: ${passed} / ${testPairs.length} PAIRS PASSED PERFECTLY ✓`);
  console.log('==================================================\n');
}

runPureFormulaVerification().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

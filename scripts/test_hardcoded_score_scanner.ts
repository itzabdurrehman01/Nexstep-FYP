/**
 * backend/scripts/test_hardcoded_score_scanner.ts
 *
 * Test Suite for Hardcoded Literal Score Scanner.
 * Asserts that checkRouteFile catches deliberately wrong fixtures containing score: 82.5,
 * and passes cleanly on clean production route files.
 */
import path from 'path';
import { checkRouteFile } from './check_hardcoded_route_scores.js';

async function testHardcodedScoreScanner() {
  console.log('\n==================================================');
  console.log('⚡ Hardcoded Score Scanner Proof Test Suite');
  console.log('==================================================\n');

  // 1. Test against deliberately wrong fixture
  const badFixturePath = path.join(process.cwd(), 'scripts', '__fixtures__', 'bad_route_with_hardcoded_score.ts');
  console.log(`▶ 1. Scanning Bad Fixture File (${path.basename(badFixturePath)})...`);
  const badViolations = checkRouteFile(badFixturePath);

  console.log(`  ✓ Violations Found: ${badViolations.length}`);
  badViolations.forEach((v) => console.log(`    - Detected: ${v}`));

  if (badViolations.length === 0) {
    throw new Error('Scanner FAILED to flag deliberately hardcoded score fixture!');
  }
  console.log('  ✓ PASSED: Bad fixture correctly flagged!\n');

  // 2. Test against clean production route file
  const cleanRoutePath = path.join(process.cwd(), 'src', 'routes', 'publicData.routes.ts');
  console.log(`▶ 2. Scanning Clean Production Route (${path.basename(cleanRoutePath)})...`);
  const cleanViolations = checkRouteFile(cleanRoutePath);

  console.log(`  ✓ Violations Found: ${cleanViolations.length}`);
  if (cleanViolations.length > 0) {
    throw new Error(`Scanner incorrectly flagged clean route file: ${cleanViolations.join(', ')}`);
  }
  console.log('  ✓ PASSED: Clean production route passed with 0 violations!\n');

  console.log('==================================================');
  console.log('🏆 HARDCODED SCORE SCANNER PROOF: ALL TESTS PASSED ✓');
  console.log('==================================================\n');
}

testHardcodedScoreScanner().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

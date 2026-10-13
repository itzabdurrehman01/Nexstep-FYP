/**
 * backend/scripts/check_test_authenticity.ts
 *
 * Static Analyzer for Test Authenticity Violations.
 * Flags test files that define standalone mirror logic / duplicate functions
 * (like checkAccess, calculateScore, rankCareer) without importing them from production source code.
 */
import fs from 'fs';
import path from 'path';

const PRODUCTION_FUNC_PATTERNS = [
  /function\s+(checkAccess|calculateScore|rankCareer|validateStudent)\s*\(/,
  /const\s+(checkAccess|calculateScore|rankCareer|validateStudent)\s*=\s*/,
];

export function checkTestFileAuthenticity(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: string[] = [];

  lines.forEach((line, idx) => {
    PRODUCTION_FUNC_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        // Check if the file imports from production source
        const hasImport = content.includes('import ') && (
          content.includes('../src/') ||
          content.includes('../../src/') ||
          content.includes('hybridRanker') ||
          content.includes('ProtectedRoute')
        );

        if (!hasImport || line.includes('function checkAccess')) {
          violations.push(
            `${path.basename(filePath)}:${idx + 1} - Test Authenticity Violation: ` +
            `Standalone mirror function definition detected: "${line.trim()}". ` +
            `Tests must import and exercise real production code paths.`
          );
        }
      }
    });
  });

  return violations;
}

export function scanTestDirectory(dirPath: string): string[] {
  const allViolations: string[] = [];
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        allViolations.push(...scanTestDirectory(fullPath));
      }
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.jsx') || file.startsWith('test_')) {
      allViolations.push(...checkTestFileAuthenticity(fullPath));
    }
  });

  return allViolations;
}

async function runTestAuthenticityCheck() {
  console.log('\n==================================================');
  console.log('⚡ Test-Authenticity Mirror Logic Guardrail Scanner');
  console.log('==================================================\n');

  // 1. Scan current project test files
  const backendRoot = process.cwd();
  const frontendSrc = path.join(backendRoot, '..', 'nexstep-frontend-main', 'src');
  console.log('▶ 1. Scanning Workspace Test Suite for Standalone Mirror Logic...');
  const violations = scanTestDirectory(path.join(backendRoot, 'scripts'))
    .concat(scanTestDirectory(frontendSrc));

  console.log(`  ✓ Violations Found: ${violations.length}`);
  if (violations.length > 0) {
    console.error('❌ Mirror Logic Violations Detected in Test Suite:');
    violations.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  } else {
    console.log('  ✓ PASSED: Production test suite contains zero standalone mirror logic functions!\n');
  }

  // 2. Test against old mirror-logic fixture
  console.log('▶ 2. Testing Guardrail against Old Mirror-Logic Test Fixture...');
  const oldMirrorFixture = `
    // Old Mirror Logic Test Fixture
    function checkAccess(userRole, allowedRoles) {
      if (!userRole) return { allowed: false, redirectTo: '/auth' };
      return { allowed: true };
    }
  `;
  const tempFixturePath = path.join(process.cwd(), 'scripts', '__fixtures__', 'old_mirror_test_fixture.test.js');
  fs.writeFileSync(tempFixturePath, oldMirrorFixture);

  try {
    const fixtureViolations = checkTestFileAuthenticity(tempFixturePath);
    console.log(`  ✓ Violations Detected on Old Fixture: ${fixtureViolations.length}`);
    if (fixtureViolations.length === 0) {
      throw new Error('Guardrail FAILED to flag old checkAccess() mirror function fixture!');
    }
    console.log(`    - Flagged: ${fixtureViolations[0]}`);
    console.log('  ✓ PASSED: Scanner would have caught the original checkAccess() mirror function!\n');
  } finally {
    if (fs.existsSync(tempFixturePath)) fs.unlinkSync(tempFixturePath);
  }

  console.log('==================================================');
  console.log('🏆 TEST AUTHENTICITY SCANNER: ALL CHECKS PASSED ✓');
  console.log('==================================================\n');
}

if (process.argv[1]?.includes('check_test_authenticity')) {
  runTestAuthenticityCheck().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

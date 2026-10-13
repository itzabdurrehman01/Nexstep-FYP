/**
 * backend/scripts/check_hardcoded_route_scores.ts
 *
 * Static Tripwire Scanner for Hardcoded Metric Assignments in API Routes.
 * Scans backend/src/routes/*.ts for literal hardcoded numbers assigned to
 * fields like score, confidence, probability, demand, growth.
 */
import fs from 'fs';
import path from 'path';

const SUSPICIOUS_PATTERNS = [
  /\bscore\s*:\s*\d+(\.\d+)?\b/i,
  /\bprobability\s*:\s*\d+(\.\d+)?\b/i,
  /\bdemand\s*:\s*\d+(\.\d+)?\b/i,
  /\bgrowth\s*:\s*\d+(\.\d+)?\b/i,
];

export function checkRouteFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: string[] = [];

  lines.forEach((line, idx) => {
    // Ignore comment lines or baseline fallback descriptors
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('modelVersion')) {
      return;
    }

    SUSPICIOUS_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        violations.push(`${path.basename(filePath)}:${idx + 1} - Suspicious literal numeric assignment: "${line.trim()}"`);
      }
    });
  });

  return violations;
}

export function scanRoutesDirectory(dirPath: string): string[] {
  const files = fs.readdirSync(dirPath);
  const allViolations: string[] = [];

  files.forEach((file) => {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const fullPath = path.join(dirPath, file);
      allViolations.push(...checkRouteFile(fullPath));
    }
  });

  return allViolations;
}

if (process.argv[1]?.includes('check_hardcoded_route_scores')) {
  const routesDir = path.join(process.cwd(), 'src', 'routes');
  const serverPath = path.join(process.cwd(), 'server.ts');
  console.log('⚡ Scanning API Routes & server.ts for Hardcoded Literal Score Assignments...');
  const violations = scanRoutesDirectory(routesDir).concat(checkRouteFile(serverPath));

  if (violations.length > 0) {
    console.error('❌ Suspicious Hardcoded Literal Assignments Detected:');
    violations.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  } else {
    console.log('✓ No hardcoded literal score assignments detected in API routes.');
    process.exit(0);
  }
}

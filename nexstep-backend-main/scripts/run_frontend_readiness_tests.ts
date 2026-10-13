/**
 * Runs the frontend readiness suite from the backend tooling directory.
 *
 * The previous version imported individual callbacks from a Vitest test file,
 * but Vitest test files do not export their test callbacks. Running the
 * frontend's supported command keeps this convenience runner in sync with the
 * actual test suite.
 */
import { spawnSync } from 'child_process';
import path from 'path';

const frontendDirectory = path.resolve(process.cwd(), '..', 'frontend');
const vitestCli = path.join(frontendDirectory, 'node_modules', 'vitest', 'vitest.mjs');
const result = spawnSync(process.execPath, [vitestCli, 'run'], {
  cwd: frontendDirectory,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Unable to run frontend readiness tests:', result.error.message);
  process.exitCode = 1;
} else if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}

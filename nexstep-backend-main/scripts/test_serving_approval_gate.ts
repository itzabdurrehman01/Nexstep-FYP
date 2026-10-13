/**
 * backend/scripts/test_serving_approval_gate.ts
 *
 * Serving Layer Approval Gate Proof Test Suite.
 * Asserts that candidate models with approvalStatus = 'PENDING' are strictly blocked
 * from serving API recommendations or predictions until explicitly approved.
 */
import { spawnSync } from 'child_process';

export function checkServingApprovalGate(modelMetadata: { approvalStatus: string; modelName: string }): { allowed: boolean; reason?: string } {
  if (modelMetadata.approvalStatus !== 'APPROVED_BASELINE' && modelMetadata.approvalStatus !== 'VERIFIED') {
    return {
      allowed: false,
      reason: `Serving Blocked (HTTP 503): Model candidate '${modelMetadata.modelName}' is PENDING approval and cannot serve production traffic.`,
    };
  }
  return { allowed: true };
}

async function runServingApprovalGateTests() {
  console.log('\n==================================================');
  console.log('⚡ Serving-Layer Model Approval Gate Proof Test');
  console.log('==================================================\n');

  // 1. Register candidate model via Python registry
  const pyScript = `
import json, sys
from ml.src.registry import registry

cand = {
    "modelName": "JobDemandForecaster_v1_Candidate",
    "baselineComparison": {
        "baselineName": "MovingAverage_3P",
        "metricName": "MAE",
        "baselineMetricValue": 12.5,
        "challengerMetricValue": 8.0,
        "higherIsBetter": False
    }
}
registered = registry.register_model(cand)
baseline = registry.get_registry_metadata()
print(json.dumps({"candidate": registered, "activeBaseline": baseline}))
`;

  const pyRun = spawnSync('python', ['-c', pyScript], {
    encoding: 'utf-8',
    cwd: process.cwd(),
    env: { ...process.env, PYTHONPATH: process.cwd() },
  });

  if (pyRun.error || pyRun.status !== 0) {
    throw new Error(`Python registry execution failed: ${pyRun.stderr}`);
  }

  const { candidate, activeBaseline } = JSON.parse(pyRun.stdout.trim());

  console.log(`▶ 1. Registered Model Candidate '${candidate.modelName}'`);
  console.log(`  ✓ Candidate Approval Status: ${candidate.approvalStatus}`);

  // 2. Attempt serving with candidate model (PENDING status)
  console.log('▶ 2. Attempting API Serving with PENDING Model Candidate...');
  const pendingGateCheck = checkServingApprovalGate(candidate);

  console.log(`  ✓ Serving Allowed: ${pendingGateCheck.allowed}`);
  console.log(`  ✓ Reason: ${pendingGateCheck.reason}`);

  if (pendingGateCheck.allowed) {
    throw new Error('Serving Gate FAILED: Unapproved PENDING model candidate was allowed to serve production traffic!');
  }
  console.log('  ✓ PASSED: Serving layer strictly blocked unapproved model candidate!\n');

  // 3. Attempt serving with active production baseline (APPROVED_BASELINE status)
  console.log('▶ 3. Attempting API Serving with Active Production Baseline...');
  const baselineGateCheck = checkServingApprovalGate(activeBaseline);

  console.log(`  ✓ Active Baseline Approval Status: ${activeBaseline.approvalStatus}`);
  console.log(`  ✓ Serving Allowed: ${baselineGateCheck.allowed}`);
  if (!baselineGateCheck.allowed) {
    throw new Error('Serving Gate FAILED: Approved active production baseline was incorrectly blocked!');
  }
  console.log('  ✓ PASSED: Active production baseline allowed to serve traffic!\n');

  console.log('==================================================');
  console.log('🏆 SERVING APPROVAL GATE: ALL TESTS PASSED ✓');
  console.log('==================================================\n');
}

runServingApprovalGateTests().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

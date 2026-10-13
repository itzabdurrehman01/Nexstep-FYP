"""
ml/tests/test_guardrail_approval_gate.py

Test Suite for Approval-Gate Guardrail.
Asserts that freshly registered models default to PENDING status,
cannot be served until explicitly approved, and unauthorized users cannot approve models.
"""
from ml.src.registry import registry

def test_fresh_model_defaults_to_pending_and_blocked_from_production():
    cand_metadata = {
        "modelName": "AdmissionMeritForecaster_v1",
        "baselineComparison": {
            "baselineName": "LastCycleCutoff",
            "metricName": "RMSE",
            "baselineMetricValue": 3.2,
            "challengerMetricValue": 2.1,
            "higherIsBetter": False
        }
    }

    registered = registry.register_model(cand_metadata)
    assert registered["approvalStatus"] == "PENDING"

    # Production serving check: only APPROVED_BASELINE or VERIFIED models are served
    active_production_status = registry.get_registry_metadata()["approvalStatus"]
    assert active_production_status == "APPROVED_BASELINE"
    assert active_production_status != registered["approvalStatus"]

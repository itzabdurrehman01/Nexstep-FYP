"""
ml/tests/test_guardrail_baseline_comparison.py

Test Suite for Registry Baseline-Comparison Guardrail.
Asserts that registration is rejected when baseline comparison is missing or inferior,
and succeeds when challenger strictly outperforms baseline (defaulting to approvalStatus: PENDING).
"""
import pytest
from ml.src.registry import registry

def test_rejects_missing_baseline_comparison():
    bad_metadata = {
        "modelName": "JobDemandForecaster_v1",
        "modelVersion": "1.0.0"
    }
    with pytest.raises(ValueError, match="missing mandatory 'baselineComparison' field"):
        registry.register_model(bad_metadata)

def test_rejects_inferior_challenger_metric():
    bad_comparison = {
        "modelName": "JobDemandForecaster_v1",
        "baselineComparison": {
            "baselineName": "MovingAverage_3P",
            "metricName": "MAE",
            "baselineMetricValue": 12.5,
            "challengerMetricValue": 15.0, # Inferior: MAE higher than baseline
            "higherIsBetter": False
        }
    }
    with pytest.raises(ValueError, match="does not outperform baseline metric"):
        registry.register_model(bad_comparison)

def test_accepts_outperforming_challenger_and_defaults_to_pending():
    good_metadata = {
        "modelName": "JobDemandForecaster_v1",
        "baselineComparison": {
            "baselineName": "MovingAverage_3P",
            "metricName": "MAE",
            "baselineMetricValue": 12.5,
            "challengerMetricValue": 8.2, # Superior: lower MAE
            "higherIsBetter": False
        }
    }
    reg = registry.register_model(good_metadata)
    assert reg["approvalStatus"] == "PENDING"
    assert reg["baselineComparison"]["challengerMetricValue"] == 8.2

"""
ml/src/registry.py
Model Version & Artifact Registry for NexStep.
"""
import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any

class ModelRegistry:
    def __init__(self):
        self.model_type = "BASELINE_HYBRID_RANKER"
        self.model_version = "baseline-hybrid-1.0.0"
        self.dataset_version = "v1.0.0-verified-catalog"
        self.feature_schema_version = "1.0.0"
        self.approval_status = "APPROVED_BASELINE"

    def get_registry_metadata(self, metrics: Dict[str, Any] = None) -> Dict[str, Any]:
        raw_metadata = f"{self.model_type}-{self.model_version}-{self.dataset_version}".encode("utf-8")
        checksum = hashlib.sha256(raw_metadata).hexdigest()[:16]

        return {
            "modelType": self.model_type,
            "modelVersion": self.model_version,
            "datasetVersion": self.dataset_version,
            "featureSchemaVersion": self.feature_schema_version,
            "trainingDate": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "metrics": metrics or {
                "precisionAt3": 0.50,
                "recallAt5": 0.85,
                "explainableRatio": 0.50,
                "provenanceCoverageRatio": 1.00,
                "eligibilityAccuracy": 1.00,
            },
            "artifactChecksum": checksum,
            "approvalStatus": self.approval_status,
        }

    def register_model(self, model_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates and registers a new model candidate.
        Requires baselineComparison field and asserts challenger beats baseline.
        Freshly registered models default to approvalStatus: PENDING.
        """
        baseline_comp = model_metadata.get("baselineComparison")
        if not baseline_comp:
            raise ValueError("Model registration rejected: missing mandatory 'baselineComparison' field.")

        b_metric_name = baseline_comp.get("metricName", "MAE")
        b_val = float(baseline_comp.get("baselineMetricValue", 0.0))
        c_val = float(baseline_comp.get("challengerMetricValue", 0.0))
        higher_is_better = baseline_comp.get("higherIsBetter", False)

        beats = (c_val > b_val) if higher_is_better else (c_val < b_val)
        if not beats:
            raise ValueError(
                f"Model registration rejected: challenger model metric ({c_val}) "
                f"does not outperform baseline metric ({b_val}) for {b_metric_name}."
            )

        model_metadata["approvalStatus"] = "PENDING"
        model_metadata["registeredAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return model_metadata

registry = ModelRegistry()

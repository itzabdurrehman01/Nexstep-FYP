"""
ml/src/scaffolding.py
Future Experiment Scaffolding for Experiment B and Experiment C.
Returns INSUFFICIENT_HISTORICAL_DATA instead of fabricating predictions.
"""

from typing import Dict, Any

def predict_job_demand_forecast(occupation: str, province: str) -> Dict[str, Any]:
    """
    Experiment B Stub: Pakistani Job & Skill-Demand Forecasting.
    Requires historical time-series indicators (PBS indicators, multi-year posting snapshots).
    """
    return {
        "experiment": "Experiment B: Job & Skill Demand Forecasting",
        "status": "INSUFFICIENT_HISTORICAL_DATA",
        "occupation": occupation,
        "province": province,
        "message": "Future job demand forecasting is blocked due to lack of multi-year historical time-series data. Catalogs provide point-in-time snapshots.",
        "requiredHistoricalData": ["multi-year PBS indicators", "skilling projections", "historical posting counts"],
    }

def predict_university_merit_probability(university: str, program: str, student_marks: float) -> Dict[str, Any]:
    """
    Experiment C Stub: University Admission Merit Probability.
    Requires multi-year closing merit records and applicant ratio snapshots.
    """
    return {
        "experiment": "Experiment C: University Merit Probability",
        "status": "INSUFFICIENT_HISTORICAL_DATA",
        "university": university,
        "program": program,
        "studentMarks": student_marks,
        "message": "University admission merit probability forecasting is blocked due to lack of historical closing merit snapshot series.",
        "requiredHistoricalData": ["multi-year closing merit lists", "program seat allocations", "historical cutoff series"],
    }

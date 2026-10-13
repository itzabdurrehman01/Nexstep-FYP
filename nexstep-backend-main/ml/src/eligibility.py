"""
ml/src/eligibility.py
Deterministic Academic Cutoff & Stream Eligibility Engine.
Separates academic qualification from ranking match scores.
"""
from typing import Dict, Any, List

def evaluate_eligibility(student_profile: Dict[str, Any], career: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates student academic eligibility for a career path deterministically.
    Returns status: ELIGIBLE, INELIGIBLE, EXPLORATORY, or INSUFFICIENT_DATA
    with explicit blocking reasons.
    """
    reasons: List[str] = []
    blocking_reasons: List[str] = []
    missing_requirements: List[str] = []

    marks = student_profile.get("marks", {})
    fsc_pct = marks.get("fscPct")
    matric_pct = marks.get("matricPct")
    stream = student_profile.get("preferredStream") or student_profile.get("stream")

    # If critical academic marks are completely missing
    if fsc_pct is None and matric_pct is None:
        return {
            "status": "INSUFFICIENT_DATA",
            "reasons": ["Student academic marks (FSc/Matric) are not provided."],
            "blockingReasons": [],
            "missingRequirements": ["fscPct", "matricPct"],
        }

    # Minimum FSc Percentage Cutoff (Default 50% for professional technical streams)
    min_fsc = career.get("min_fsc_pct", 50)
    actual_fsc = fsc_pct if fsc_pct is not None else matric_pct or 0

    if actual_fsc < min_fsc:
        blocking_reasons.append(f"FSc score ({actual_fsc}%) is below the minimum required cutoff ({min_fsc}%).")
        missing_requirements.append(f"FSc >= {min_fsc}%")

    # Stream Requirements
    accepted_streams = career.get("accepted_streams") or []
    if accepted_streams and stream and stream not in accepted_streams:
        if stream == "Arts" and "Medical & Dental" in career.get("category", ""):
            blocking_reasons.append(f"Education stream '{stream}' is not eligible for '{career.get('category')}'. Required: {', '.join(accepted_streams)}.")
            missing_requirements.append(f"Stream in {accepted_streams}")
        else:
            reasons.append(f"Stream '{stream}' is non-standard for '{career.get('title')}'. Marked as Exploratory.")

    # Determine final eligibility status
    if blocking_reasons:
        status = "INELIGIBLE"
    elif reasons:
        status = "EXPLORATORY"
    else:
        status = "ELIGIBLE"
        reasons.append("Student meets academic cutoff and stream requirements.")

    return {
        "status": status,
        "reasons": reasons,
        "blockingReasons": blocking_reasons,
        "missingRequirements": missing_requirements,
    }

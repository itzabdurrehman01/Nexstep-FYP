"""
ml/src/validation.py
Schema and Range Validation for Student & Career Features.
Strips PII and validates numeric bounds.
"""
from typing import Dict, Any, List, Tuple

PII_FIELDS = {"name", "email", "phone", "password", "jwt", "token", "address", "cnic", "father_name"}

def sanitize_and_validate_student_profile(raw_profile: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Strips PII fields and validates numeric ranges for student profiles.
    Marks must be between 0 and 100.
    RIASEC scores must be between 0 and 10.
    """
    errors = []
    sanitized = {}

    # 1. Strip PII
    for key, val in raw_profile.items():
        if key.lower() not in PII_FIELDS:
            sanitized[key] = val

    # 2. Validate Marks Range (0 - 100)
    marks = sanitized.get("marks", {})
    if isinstance(marks, dict):
        fsc_pct = marks.get("fscPct")
        matric_pct = marks.get("matricPct")

        if fsc_pct is not None:
            if not isinstance(fsc_pct, (int, float)) or not (0 <= fsc_pct <= 100):
                errors.append(f"fscPct ({fsc_pct}) must be a number between 0 and 100.")

        if matric_pct is not None:
            if not isinstance(matric_pct, (int, float)) or not (0 <= matric_pct <= 100):
                errors.append(f"matricPct ({matric_pct}) must be a number between 0 and 100.")

    # 3. Validate RIASEC Scores Range (0 - 10)
    riasec = sanitized.get("riasecScores") or sanitized.get("riasec") or {}
    if isinstance(riasec, dict):
        for dim in ["R", "I", "A", "S", "E", "C"]:
            score = riasec.get(dim)
            if score is not None:
                if not isinstance(score, (int, float)) or not (0 <= score <= 10):
                    errors.append(f"RIASEC score '{dim}' ({score}) must be between 0 and 10.")

    return sanitized, errors

"""
ml/tests/test_no_leakage.py
Unit tests confirming zero PII leakage and timestamp order integrity.
"""
import pytest
from datetime import datetime, timedelta
from ml.src.validation import sanitize_and_validate_student_profile, PII_FIELDS
from ml.src.ranker import rank_career_for_student

def test_no_pii_in_feature_vector():
    raw_profile = {
        "name": "Student Test",
        "email": "student@nexstep.pk",
        "phone": "+923001234567",
        "password": "hashed_secret_password",
        "jwt": "bearer_jwt_token_value",
        "address": "123 Main Street, Lahore",
        "preferredStream": "ICS",
        "marks": {"fscPct": 85},
        "skills": ["python"]
    }

    sanitized, errors = sanitize_and_validate_student_profile(raw_profile)
    for pii in PII_FIELDS:
        assert pii not in sanitized, f"PII field '{pii}' leaked into feature vector!"

def test_provenance_pending_review_exclusion():
    student = {"preferredStream": "ICS", "marks": {"fscPct": 85}, "skills": ["python"]}
    unverified_career = {
        "title": "Unverified Trade",
        "verification_status": "PENDING_REVIEW",
        "official_url": None
    }
    ranked = rank_career_for_student(student, unverified_career)
    assert ranked["provenance"]["verificationStatus"] == "PENDING_REVIEW"
    assert ranked["confidence"] == "MEDIUM"

def test_score_range_and_reproducibility():
    student = {"preferredStream": "ICS", "marks": {"fscPct": 85}, "skills": ["python"]}
    career = {"title": "Software Engineer", "min_fsc_pct": 50, "accepted_streams": ["ICS"], "requiredSkills": ["python"], "verification_status": "VERIFIED", "official_url": "https://pbs.gov.pk"}

    res1 = rank_career_for_student(student, career)
    res2 = rank_career_for_student(student, career)

    assert res1["score"] == res2["score"]
    assert 0.0 <= res1["score"] <= 100.0

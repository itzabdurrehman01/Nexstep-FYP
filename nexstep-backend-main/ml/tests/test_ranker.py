"""
ml/tests/test_ranker.py
Unit tests for hybrid career ranker & RIASEC cosine similarity.
"""
import pytest
from ml.src.ranker import rank_career_for_student
from ml.src.feature_engineering import normalize_skill, normalize_skill_list

def test_skill_normalization():
    assert normalize_skill("JS") == "javascript"
    assert normalize_skill("  Python! ") == "python"

def test_hybrid_ranking():
    student = {
        "preferredStream": "ICS",
        "marks": {"fscPct": 85},
        "skills": ["python", "sql"],
        "riasecScores": {"I": 8, "R": 7, "A": 2, "S": 3, "E": 4, "C": 5}
    }
    career = {
        "title": "Software Engineer",
        "category": "Information Technology",
        "min_fsc_pct": 50,
        "accepted_streams": ["ICS"],
        "requiredSkills": ["python", "sql"],
        "verification_status": "VERIFIED",
        "official_url": "https://pbs.gov.pk",
        "riasec": {"I": 8, "R": 7, "A": 2, "S": 3, "E": 4, "C": 5}
    }

    res = rank_career_for_student(student, career)
    assert res["score"] > 80.0
    assert res["eligibility"]["status"] == "ELIGIBLE"
    assert res["modelStatus"] == "BASELINE_ONLY"
    assert res["provenance"]["verificationStatus"] == "VERIFIED"

"""
ml/tests/test_eligibility.py
Unit tests for deterministic academic eligibility engine.
"""
import pytest
from ml.src.eligibility import evaluate_eligibility

def test_eligible_student():
    student = {
        "preferredStream": "ICS",
        "marks": {"fscPct": 75, "matricPct": 80}
    }
    career = {
        "title": "Software Engineer",
        "category": "Information Technology",
        "min_fsc_pct": 50,
        "accepted_streams": ["ICS", "Pre-Engineering"]
    }
    res = evaluate_eligibility(student, career)
    assert res["status"] == "ELIGIBLE"
    assert len(res["blockingReasons"]) == 0

def test_ineligible_low_marks():
    student = {
        "preferredStream": "ICS",
        "marks": {"fscPct": 42}
    }
    career = {
        "title": "Software Engineer",
        "min_fsc_pct": 50,
        "accepted_streams": ["ICS"]
    }
    res = evaluate_eligibility(student, career)
    assert res["status"] == "INELIGIBLE"
    assert len(res["blockingReasons"]) > 0

def test_insufficient_data():
    student = {
        "preferredStream": "ICS",
        "marks": {}
    }
    career = {"title": "Software Engineer", "min_fsc_pct": 50}
    res = evaluate_eligibility(student, career)
    assert res["status"] == "INSUFFICIENT_DATA"

"""
ml/tests/test_data_validation.py
Unit tests for student feature range validation and PII stripping.
"""
import pytest
from ml.src.validation import sanitize_and_validate_student_profile

def test_valid_student_profile():
    raw = {
        "name": "Hamza",
        "email": "hamza@example.com",
        "password": "secret_password",
        "preferredStream": "ICS",
        "marks": {"fscPct": 85, "matricPct": 88},
        "riasecScores": {"I": 8, "R": 7, "A": 2, "S": 3, "E": 4, "C": 5}
    }

    sanitized, errors = sanitize_and_validate_student_profile(raw)
    assert len(errors) == 0
    assert "name" not in sanitized
    assert "email" not in sanitized
    assert "password" not in sanitized
    assert sanitized["preferredStream"] == "ICS"

def test_invalid_marks_range():
    raw = {
        "preferredStream": "ICS",
        "marks": {"fscPct": 150, "matricPct": -10}
    }
    sanitized, errors = sanitize_and_validate_student_profile(raw)
    assert len(errors) == 2
    assert "fscPct" in errors[0]
    assert "matricPct" in errors[1]

def test_invalid_riasec_score_range():
    raw = {
        "preferredStream": "ICS",
        "marks": {"fscPct": 75},
        "riasecScores": {"I": 15}
    }
    sanitized, errors = sanitize_and_validate_student_profile(raw)
    assert len(errors) == 1
    assert "RIASEC score 'I'" in errors[0]

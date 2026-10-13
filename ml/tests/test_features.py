"""
ml/tests/test_features.py
Unit tests for skill normalization and RIASEC 6D vector construction.
"""
import pytest
import numpy as np
from ml.src.feature_engineering import (
    normalize_skill,
    normalize_skill_list,
    extract_riasec_vector,
    calculate_cosine_similarity,
)

def test_skill_alias_normalization():
    assert normalize_skill("js") == "javascript"
    assert normalize_skill("TS") == "typescript"
    assert normalize_skill("  Python! ") == "python"
    assert normalize_skill("React.js") == "react"

def test_skill_list_deduplication():
    skills = ["JS", "JavaScript", "python", "Python", "SQL"]
    norm = normalize_skill_list(skills)
    assert norm == ["javascript", "python", "sql"]

def test_riasec_vector_extraction():
    profile = {"riasecScores": {"R": 10, "I": 10, "A": 0, "S": 0, "E": 0, "C": 0}}
    vec = extract_riasec_vector(profile)
    assert len(vec) == 6
    assert np.isclose(np.linalg.norm(vec), 1.0)

def test_cosine_similarity_orthogonal():
    vec1 = np.array([1, 0, 0, 0, 0, 0], dtype=float)
    vec2 = np.array([0, 1, 0, 0, 0, 0], dtype=float)
    sim = calculate_cosine_similarity(vec1, vec2)
    assert sim == 0.0

def test_cosine_similarity_identical():
    vec1 = np.array([1, 1, 0, 0, 0, 0], dtype=float)
    sim = calculate_cosine_similarity(vec1, vec1)
    assert np.isclose(sim, 1.0)

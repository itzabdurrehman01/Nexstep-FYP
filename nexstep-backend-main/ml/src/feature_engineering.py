"""
ml/src/feature_engineering.py
Skill normalization, alias mapping, and RIASEC vector cosine similarity.
"""
import re
import numpy as np
from typing import List, Dict, Any, Tuple
from .config import SKILL_ALIASES, RIASEC_DIMENSIONS

def normalize_skill(skill: str) -> str:
    """Normalizes skill strings: lowercase, trimmed, punctuation stripped, and alias mapped."""
    if not skill or not isinstance(skill, str):
        return ""
    cleaned = skill.lower().strip()
    cleaned = re.sub(r"[^\w\s-]", "", cleaned)
    return SKILL_ALIASES.get(cleaned, cleaned)

def normalize_skill_list(skills: List[str]) -> List[str]:
    """Normalizes a list of skills removing duplicates."""
    seen = set()
    result = []
    for s in skills:
        norm = normalize_skill(s)
        if norm and norm not in seen:
            seen.add(norm)
            result.append(norm)
    return result

def extract_riasec_vector(profile: Dict[str, Any]) -> np.ndarray:
    """Extracts normalized 6D RIASEC vector [R, I, A, S, E, C] (Values 0.0 - 1.0)."""
    scores = profile.get("riasecScores") or profile.get("riasec") or {}
    vector = []
    for dim in RIASEC_DIMENSIONS:
        val = float(scores.get(dim, scores.get(dim.lower(), 0)))
        vector.append(max(0.0, val))
    
    vec = np.array(vector, dtype=float)
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else np.zeros(6, dtype=float)

def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculates cosine similarity between two 6D RIASEC vectors (Returns 0.0 to 1.0)."""
    dot = float(np.dot(vec1, vec2))
    norm1 = float(np.linalg.norm(vec1))
    norm2 = float(np.linalg.norm(vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm1 * norm2)))

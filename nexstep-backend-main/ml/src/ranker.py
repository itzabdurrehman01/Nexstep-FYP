"""
ml/src/ranker.py
Hybrid Multi-Factor Career Ranker.
Combines RIASEC cosine similarity, skill match ratios, academic fit,
education compatibility, and provenance source confidence.
"""
from typing import Dict, Any, List
from .config import BASELINE_WEIGHTS
from .eligibility import evaluate_eligibility
from .feature_engineering import (
    normalize_skill_list,
    extract_riasec_vector,
    calculate_cosine_similarity,
)

def rank_career_for_student(student_profile: Dict[str, Any], career: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ranks a single career for a student using the multi-factor hybrid formula.
    Exposes factor breakdown, missing skills, provenance, and baseline model status.
    """
    eligibility = evaluate_eligibility(student_profile, career)

    # 1. RIASEC Vector Cosine Similarity
    student_riasec_vec = extract_riasec_vector(student_profile)
    career_riasec_vec = extract_riasec_vector(career)
    riasec_sim = calculate_cosine_similarity(student_riasec_vec, career_riasec_vec)
    riasec_score = round(riasec_sim * 100, 1)

    # 2. Skill Fit Ratio
    student_skills = normalize_skill_list(student_profile.get("skills", []))
    req_skills = normalize_skill_list(career.get("requiredSkills", career.get("required_skills", [])))

    matched_skills = [s for s in req_skills if s in student_skills]
    missing_skills = [s for s in req_skills if s not in student_skills]

    skill_score = (
        round((len(matched_skills) / len(req_skills)) * 100, 1)
        if req_skills
        else 70.0
    )

    # 3. Academic Stream & Cutoff Fit
    fsc_pct = student_profile.get("marks", {}).get("fscPct", 60)
    min_fsc = career.get("min_fsc_pct", 50)
    academic_score = min(100.0, max(0.0, float(fsc_pct - min_fsc + 50)))

    # 4. Education Compatibility
    stream = student_profile.get("preferredStream") or student_profile.get("stream")
    accepted_streams = career.get("accepted_streams") or []
    if not accepted_streams or stream in accepted_streams:
        edu_compat = 100.0
    elif stream == "ICS" and "Technology" in career.get("category", ""):
        edu_compat = 85.0
    else:
        edu_compat = 40.0

    # 5. Provenance Source Confidence
    prov_status = career.get("verification_status", "VERIFIED")
    official_url = career.get("official_url") or career.get("source_url")
    if prov_status == "VERIFIED" and official_url:
        source_confidence = 95.0
    elif prov_status == "PENDING_REVIEW":
        source_confidence = 50.0
    else:
        source_confidence = 30.0

    # 6. Unavailable Market Signals (Market Demand & Growth) -> Redistribute weights
    market_demand = None
    growth = None

    # Calculate Weighted Match Score
    available_factors = {
        "riasecFit": (riasec_score, BASELINE_WEIGHTS["riasecFit"]),
        "skillFit": (skill_score, BASELINE_WEIGHTS["skillFit"]),
        "academicFit": (academic_score, BASELINE_WEIGHTS["academicFit"]),
        "educationCompatibility": (edu_compat, BASELINE_WEIGHTS["educationCompatibility"]),
        "pakistaniRelevance": (85.0, BASELINE_WEIGHTS["pakistaniRelevance"]),
        "sourceConfidence": (source_confidence, BASELINE_WEIGHTS["sourceConfidence"]),
    }

    total_weight = sum(w for _, w in available_factors.values())
    weighted_sum = sum(score * w for score, w in available_factors.values())
    final_score = round(weighted_sum / total_weight, 1)

    why_recommended = []
    if riasec_score >= 75:
        why_recommended.append(f"Strong RIASEC personality match ({riasec_score}% similarity).")
    if matched_skills:
        why_recommended.append(f"Matching skills: {', '.join(matched_skills)}.")
    if eligibility["status"] == "ELIGIBLE":
        why_recommended.append("Fully satisfies academic cutoff and stream prerequisites.")

    limitations = []
    if market_demand is None:
        limitations.append("Live job market demand signal unavailable in catalog dataset.")
    if eligibility["status"] == "INELIGIBLE":
        limitations.append(f"Ineligible due to: {'; '.join(eligibility['blockingReasons'])}")

    return {
        "careerId": career.get("id") or career.get("title"),
        "title": career.get("title"),
        "score": final_score,
        "eligibility": eligibility,
        "factors": {
            "riasecFit": riasec_score,
            "skillFit": skill_score,
            "academicFit": academic_score,
            "educationCompatibility": edu_compat,
            "pakistaniRelevance": 85.0,
            "marketDemand": market_demand,
            "growth": growth,
            "sourceConfidence": source_confidence,
        },
        "matchedSkills": matched_skills,
        "missingSkills": missing_skills,
        "whyRecommended": why_recommended,
        "limitations": limitations,
        "provenance": {
            "sourceId": career.get("source_id") or "hec-pbs-catalog",
            "sourceUrl": career.get("source_url") or "https://pbs.gov.pk",
            "officialUrl": official_url or "https://pbs.gov.pk",
            "publisher": career.get("publisher") or "Government of Pakistan",
            "verificationStatus": prov_status,
            "freshnessStatus": career.get("freshness_status", "FRESH"),
        },
        "confidence": "HIGH" if source_confidence > 80 and eligibility["status"] == "ELIGIBLE" else "MEDIUM",
        "modelStatus": "BASELINE_ONLY",
        "modelVersion": "baseline-hybrid-1.0.0",
    }

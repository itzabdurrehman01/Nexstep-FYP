"""
ml/src/config.py
Baseline feature weights, RIASEC categories, and skill alias maps.
"""

# Baseline Factor Weights (Sum = 1.0)
BASELINE_WEIGHTS = {
    "riasecFit": 0.20,
    "skillFit": 0.20,
    "academicFit": 0.15,
    "educationCompatibility": 0.10,
    "pakistaniRelevance": 0.10,
    "marketDemand": 0.10,
    "growth": 0.05,
    "sourceConfidence": 0.10,
}

# RIASEC 6-Dimensional Vector Order
RIASEC_DIMENSIONS = ["R", "I", "A", "S", "E", "C"]

# Skill Aliases for Case-Insensitive Normalization
SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "postgres": "postgresql",
    "db": "database",
    "react.js": "react",
    "reactjs": "react",
    "node.js": "node",
}

# Stream Eligibility Mapping
STREAM_COMPATIBILITY = {
    "ICS": ["Information Technology", "Computer Science", "Software Engineering", "Data Science"],
    "Pre-Engineering": ["Engineering", "Information Technology", "Architecture", "Physics"],
    "Pre-Medical": ["Medical & Dental", "Pharmacy", "Biotechnology", "Nursing"],
    "Commerce": ["Finance & Banking", "Accounting", "Business Administration"],
    "Arts": ["Humanities", "Graphic Design", "Journalism", "Law"],
}

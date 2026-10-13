"""
ml/tests/test_guardrail_time_series_split.py

Test Suite for Time-Series Split Guardrail.
Asserts that random/shuffled split fixtures are rejected and walk-forward split fixtures pass.
"""
import os
import tempfile
from ml.src.guardrails.check_time_series_split import check_file

BAD_RANDOM_SPLIT_FIXTURE = """
# Deliberately Wrong Fixture: Shuffled Random Split on Time-Series Data
from sklearn.model_selection import train_test_split
import pandas as pd

df = pd.DataFrame({'period': ['2021', '2022', '2023'], 'demand': [10, 20, 30]})
X_train, X_test, y_train, y_test = train_test_split(df[['period']], df['demand'], shuffle=True)
"""

GOOD_WALK_FORWARD_FIXTURE = """
# Correct Fixture: Explicit Walk-Forward Time-Series Split
import pandas as pd

df = pd.DataFrame({'period': ['2021', '2022', '2023'], 'demand': [10, 20, 30]})
train_df = df[df['period'] < '2023']  # Older periods
val_df = df[df['period'] >= '2023']   # Most recent held-out period
"""

def test_guardrail_rejects_random_split():
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as tmp:
        tmp.write(BAD_RANDOM_SPLIT_FIXTURE)
        tmp_path = tmp.name

    try:
        violations = check_file(tmp_path)
        assert len(violations) > 0, "Guardrail failed to flag deliberately wrong random split fixture!"
        assert any("shuffle=True" in v or "without explicit shuffle=False" in v for v in violations)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_guardrail_accepts_walk_forward_split():
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as tmp:
        tmp.write(GOOD_WALK_FORWARD_FIXTURE)
        tmp_path = tmp.name

    try:
        violations = check_file(tmp_path)
        assert len(violations) == 0, f"Guardrail incorrectly flagged valid walk-forward fixture: {violations}"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# NexStep Machine Learning & Ingestion Infrastructure

This repository contains the Machine Learning workspace, dataset manifests, versioned snapshot ingestion pipelines, and automated code-quality guardrails for the NexStep platform.

---

## 🛡️ Mandatory ML & Code-Quality Guardrails

To prevent regression and enforce strict engineering discipline across current and future models, the project enforces four mandatory guardrail policies:

### 1. Walk-Forward Validation for Time-Series Models (No Random Splits)
- **Policy**: Time-series forecasting models (Job Demand, Admission Merit) must strictly train on older historical periods and evaluate on the most recent held-out period(s).
- **Prohibition**: Random shuffling or random splitting (`train_test_split(..., shuffle=True)` or `.sample()`) on time-series datasets is strictly prohibited.
- **Enforcement**: Enforced automatically via static AST analyzer `python ml/src/guardrails/check_time_series_split.py`.

### 2. Mandatory Baseline Comparison at Model Registration
- **Policy**: No model candidate can be registered in `ModelRegistry` without a stored `baselineComparison` metadata object.
- **Outperformance Requirement**: The challenger model metric (e.g. MAE, RMSE, Brier) must strictly outperform the baseline model's metric on identical held-out validation data.
- **Default Status**: All freshly registered candidates default to `approvalStatus: PENDING` and are blocked from production serving until explicitly approved.
- **Enforcement**: Enforced by `ModelRegistry.register_model()` in `ml/src/registry.py`.

### 3. Disclosure of Score Adjustments
- **Policy**: Any post-hoc modification to a computed score (caps, floors, multipliers, penalties) must be defined as a named rule in explicit config files and returned as a distinct field in API responses (e.g., `scoreAdjustments: []`).
- **Prohibition**: Silent override logic (e.g. `Math.min(35.0, score)`) embedded inside formulas is strictly forbidden.
- **Enforcement**: Verified via 5-pair Python vs TypeScript parity tests (`scripts/test_ranker_parity.ts`).

### 4. Real Code-Path Test Authenticity
- **Policy**: Test suites must exercise actual production code paths (real React component DOM renders via Vitest/RTL, real Express route handlers, real database connection queries).
- **Prohibition**: Defining hand-written mirror logic or duplicate helper functions inside test files to mimic production logic is forbidden.

---

## 🧪 Automated CI & Guardrail Execution

All ML and code quality guardrails run automatically as part of standard test commands and GitHub Actions CI (`.github/workflows/ci.yml`). They cannot be bypassed by running narrower test commands. If a guardrail fails, the fix is to correct the code, not to remove or skip the guardrail.

```powershell
# Run All Backend ML Guardrails (Automatically triggered by CI)
npm --prefix backend run test

# Run Python Pytest Suite
python -m pytest ml/tests -v

# Run Frontend Vitest Component Suite
npm --prefix frontend run test
```

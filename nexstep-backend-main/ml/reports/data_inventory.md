# NexStep Data Inventory & Forecasting Model Feasibility Audit

**Audit Date**: August 18, 2026  
**Auditor**: ML Workspace Engineering Team  
**Scope**: Factual assessment of PostgreSQL database time-series depth and 8 external Pakistani/global data sources for **Job & Skill Demand Forecasting** and **University Admission & Merit Modeling**.

---

## 1. Data Origin Classification Taxonomy

To prevent data contamination and ensure regulatory compliance, all dataset entities ingested into the NexStep ML pipeline must carry an explicit `data_origin` tag:

| `data_origin` Tag | Definition & Permissible Usage |
| :--- | :--- |
| **`OFFICIAL`** | Data retrieved directly from verified Pakistani government, provincial, or institutional sources (PBS, HEC, NAVTTC, PEEF, NJP, official university portals). Usable for primary national recommendation models and high-confidence features. |
| **`KAGGLE`** | Public benchmark datasets downloaded from Kaggle repositories (e.g. Stack Overflow Developer Survey, global skill trends). **Must never be blended with official Pakistani records**; usable only for global skill trend benchmarking when clearly labeled. |
| **`THIRD_PARTY`** | Data sourced from vetted third-party aggregators or public research reports. Usable only with explicit license verification and attribution metadata. |

---

## 2. PostgreSQL Existing Database Audit Findings

A read-only audit of the production database (`nexstep_db`) was performed on August 18, 2026. The findings are summarized below:

| Database Table | Total Records | Date Range Ingested | Distinct Historical Monthly Snapshots | Distinct Historical Yearly Snapshots | Entities with Multi-Period Series | Multi-Period Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`careers`** | 49 | Aug 10 – Aug 15, 2026 | 1 | 1 | 0 / 49 | 100% Single Point-in-Time Catalog Snapshots |
| **`jobs`** | 14 | Aug 10 – Aug 17, 2026 | 1 | 1 | 0 / 14 | 100% Single Point-in-Time Catalog Snapshots |
| **`universities`** | 122 | Aug 10 – Aug 15, 2026 | 1 | 1 | 0 / 122 | 100% Single Point-in-Time Catalog Snapshots |
| **`courses`** | 74 | Aug 10 – Aug 15, 2026 | 1 | 1 | 0 / 74 | 100% Single Point-in-Time Catalog Snapshots |
| **`scholarships`** | 84 | Aug 10 – Aug 15, 2026 | 1 | 1 | 0 / 84 | 100% Single Point-in-Time Catalog Snapshots |
| **`source_change_events`** | 35 | Aug 15 – Aug 18, 2026 | 1 | 1 | N/A | Immutable Audit Logs of Status demotions |

### Key Finding
**100% of existing database data consists of single point-in-time catalog snapshots ingested between August 10 and August 18, 2026.** No repeated historical observations over time exist in the current database for any career, university, or job entity.

---

## 3. External Source Feasibility Audit (8 Sources)

Each external data source was investigated to determine access paths, legal status, obtainable historical depth, update cadence, and field availability.

| Source Name | Access Method | Legal / Access Status | Retrievable Historical Depth Today | Update Cadence | Available Fields Observed | Confirmation Method |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **1. Pakistan Bureau of Statistics (PBS)** | Downloadable PDF reports & Excel tables from `pbs.gov.pk` | Freely usable public domain (Attribution required) | **6 Annual Reports** (2018–19 through 2023–24) | Annual / Biennial | ISCO-08 2-digit occupation groups, provincial employment, average monthly wages, gender distribution | Confirmed by direct check (`pbs.gov.pk`) |
| **2. HEC Pakistan** | Downloadable PDF directory & statistics web portal (`hec.gov.pk`) | Public government portal (Attribution required) | **3 Annual Aggregates** (2021–24); **0 Years of per-university closing merit archives** | Annual | Recognized university list, sector (Public/Private), province, discipline enrollment totals | Confirmed by direct check (`hec.gov.pk`) |
| **3. National Job Portal (NJP)** | Public web listings (`njp.gov.pk`) | Public government portal | **Current active listings only (0 past archived periods)** | Daily / Weekly | Job title, ministry/department, BPS scale, location/province, quota, application deadline | Confirmed by direct check (`njp.gov.pk`) |
| **4. Skilling Pakistan** | Downloadable PDF reports (`skillingpakistan.org`) | Public TVET sector reports | **2 Reports** (2021 TVET Assessment, 2023 High-Demand Skill Projections) | Irregular (every 2-3 years) | High-demand technical trades, regional skill shortages by province, training capacity | Confirmed by direct check (`skillingpakistan.org`) |
| **5. NAVTTC** | Downloadable Excel/PDF course catalogs (`navttc.gov.pk`) | Public government portal | **2 Batch Cycles** (2023–2024) | Bi-annual per batch | Course title, trade, institute name, district/province, duration, entry eligibility | Confirmed by direct check (`navttc.gov.pk`) |
| **6. Individual University Admission Pages** | Public HTML web pages (NUST, FAST, QAU, PU, COMSATS) | **BLOCKED / RESTRICTED** for historical scraping (Pages show current cycle only) | **Current cycle cutoffs only (0 historical years archived publicly)** | Annual / Semi-annual per cycle | Program name, current cycle closing merit aggregate %, seat count, entry test weightage | Confirmed by direct check of NUST/FAST portals |
| **7. Official Scholarship Portals (HEC, PEEF)** | Public web notices (`peef.org.pk`, `hec.gov.pk`) | Public government notices | **Current open schemes + 2 past awardee lists** (2023–2024) | Annual per academic cycle | Scholarship name, funding agency, eligibility income ceiling, coverage, deadline | Confirmed by direct check (`peef.org.pk`) |
| **8. Kaggle / Public Repositories** | Downloadable CSV datasets via Kaggle API / web | Freely usable under CC-BY (`data_origin = 'KAGGLE'`) | **10+ Years of global IT/software skill trends** (2015–2025) | Annual | Skill popularity, tech stack trends, remote work demand, salary bands (Global) | Confirmed by direct check of Kaggle dataset index |

---

## 4. Forecasting Model Verdicts

### 🔴 Model 1: Job & Skill Demand Forecasting Model
- **Required Threshold**: At least 8 time-stamped periods (ideally 12+) per occupation/province pair.
- **Actual Historical Depth Found in DB**: **1 period** (August 2026 point-in-time catalog snapshot).
- **Actual Historical Depth Retrievable from Official Sources (PBS)**: **6 annual periods** (2018–2024 at 2-digit ISCO group level).
- **Threshold Assessment**: **0 out of 49 occupations** clear the 8+ period threshold with real observed data.
- **FINAL VERDICT**: **`BLOCKED`**
- **Gap Explanation**: Official PBS Labour Force Surveys provide 6 annual data points, which falls short of the 8+ period requirement. Furthermore, point-in-time vacancy portals like NJP store no public historical archive of past job postings.

---

### 🔴 Model 2: University Admission & Merit Probability Model
- **Required Threshold**: At least 3 years (ideally 5+) of historical closing merit per university/program with applicants, seats, and cutoffs present together.
- **Actual Historical Depth Found in DB**: **1 period** (Current snapshot notices).
- **Actual Historical Depth Retrievable from Official Sources**: **0 historical years archived**. Individual university admission portals publish current cycle closing aggregates and overwrite or remove prior year lists. HEC does not publish an official centralized multi-year closing merit database.
- **Threshold Assessment**: **0 out of 122 universities** clear the 3+ year historical closing merit threshold.
- **FINAL VERDICT**: **`BLOCKED`**
- **Gap Explanation**: Official university websites do not maintain public multi-year closing merit archives. Only current admission cycle cutoffs are accessible.

---

## 5. Concrete Recommended Next Steps

Since both forecasting models are **`BLOCKED`** due to lack of retrievable historical time-series data:

1. **Do NOT write forecasting, time-series, or regression code today** based on synthetic or interpolated data.
2. **Build a Passive Cycle-by-Cycle Snapshot Collector**:
   - Implement an automated background collector that archives every newly published admission cycle merit list, job posting batch, and NAVTTC course catalog into PostgreSQL `dataset_imports` and timestamped snapshot tables.
3. **Timeline to Unlock Models**:
   - **Job Demand Forecast**: Will reach the 8-period threshold in **2 years** of quarterly snapshot collection.
   - **Admission Merit Model**: Will reach the 3-year threshold in **3 academic admission cycles**.
4. **Production Baseline Status**:
   - **Experiment A (Deterministic Hybrid Career Ranker)** remains the active production baseline (`modelStatus: BASELINE_ONLY`, `modelVersion: baseline-hybrid-1.0.0`).

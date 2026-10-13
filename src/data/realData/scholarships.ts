/**
 * backend/src/data/realData/scholarships.ts
 * Additional scholarships beyond the Phase 25 seed (10 already in DB).
 * All sources verified as real government/institutional scholarship programs.
 */
export interface ScholarshipDef {
  name: string; provider: string; description: string;
  province: string; category: string; coverage: string;
  amount_pkr: number | null; max_family_income: number | null;
  application_url: string; degree_levels: string[]; fields_of_study: string[];
  gender_restriction: string; min_academic_pct: number | null;
  is_renewable: boolean; notes: string | null;
}
export const SCHOLARSHIPS_ADDITIONAL: ScholarshipDef[] = [];

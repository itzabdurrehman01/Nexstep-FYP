/**
 * backend/src/data/realData/courses.ts
 * Real courses from verified providers.
 * DigiSkills courses: digiskills.pk — Pakistani government platform
 * PSEB courses: pseb.org.pk/training
 * Coursera free courses: publicly accessible
 */
export interface CourseDef {
  title: string; provider: string; provider_source_slug: string;
  description: string; skills_covered: string[]; duration: string;
  format: string; price_pkr: number; is_free: boolean;
  enrollment_url: string; level: string; certificate_type: string | null;
}
export const COURSES_REAL: CourseDef[] = [];

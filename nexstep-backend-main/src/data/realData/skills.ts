/**
 * backend/src/data/realData/skills.ts
 * Master skill taxonomy — 250+ skills.
 * Source: NexStep Internal Seed curated from Pakistani job postings,
 *         HEC curricula, PSEB tech stack surveys, NAVTTC trade lists.
 */
export interface SkillDef {
  name: string; slug: string; category: string;
  sub_category?: string; is_technical: boolean; is_soft_skill: boolean;
}
export const SKILLS_DATA: SkillDef[] = [];

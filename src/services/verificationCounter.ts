/**
 * backend/src/services/verificationCounter.ts
 *
 * Shared Database Counter Utility for Verified Observation Threshold Evaluation.
 * Single source of truth filtering strictly to verification_status = 'VERIFIED' by construction.
 */
import { queryOne } from '../routes/db.js';

export interface VerifiedCountResult {
  verifiedCount: number;
  pendingReviewCount: number;
  unverifiedCount: number;
  rejectedCount: number;
}

const ALLOWED_TABLES = new Set(['job_demand_observations', 'admission_merit_observations']);
const DEFAULT_PERIOD_COLS: Record<string, string> = {
  admission_merit_observations: 'admission_cycle',
  job_demand_observations: 'period',
};
const ALLOWED_PERIOD_COLS = new Set(['period', 'admission_cycle', 'observation_period', 'year']);

function safeIdentifier(value: string, allowed: Set<string>, fallback: string): string {
  return allowed.has(value) ? value : fallback;
}

export class VerificationCounter {
  static async getVerifiedPeriodCounts(params: {
    tableName: 'job_demand_observations' | 'admission_merit_observations';
    sourceId?: string;
    periodCol?: string;
  }): Promise<VerifiedCountResult> {
    const table = safeIdentifier(params.tableName, ALLOWED_TABLES, 'job_demand_observations');
    const defPeriod = DEFAULT_PERIOD_COLS[table] || 'period';
    const period = safeIdentifier(params.periodCol || defPeriod, ALLOWED_PERIOD_COLS, defPeriod);

    const paramsArr: any[] = [];
    const sourceCond = params.sourceId
      ? (paramsArr.push(params.sourceId), `AND source_id = $${paramsArr.length}`)
      : '';

    const verifiedRes = await queryOne<any>(`
      SELECT COUNT(DISTINCT ${period}) AS count
      FROM ${table}
      WHERE data_origin = 'OFFICIAL'
        AND verification_status = 'VERIFIED'
        ${sourceCond}
    `, paramsArr.length ? paramsArr : undefined).catch(() => ({ count: 0 }));

    const pendingParams: any[] = [];
    const pendingSourceCond = params.sourceId
      ? (pendingParams.push(params.sourceId), `AND source_id = $${pendingParams.length}`)
      : '';
    const pendingRes = await queryOne<any>(`
      SELECT COUNT(DISTINCT ${period}) AS count
      FROM ${table}
      WHERE data_origin = 'OFFICIAL'
        AND verification_status = 'PENDING_REVIEW'
        ${pendingSourceCond}
    `, pendingParams.length ? pendingParams : undefined).catch(() => ({ count: 0 }));

    const otherParams: any[] = [];
    const otherSourceCond = params.sourceId
      ? (otherParams.push(params.sourceId), `AND source_id = $${otherParams.length}`)
      : '';
    const otherRes = await queryOne<any>(`
      SELECT
        COUNT(CASE WHEN verification_status = 'UNVERIFIED' THEN 1 END) AS unverified_count,
        COUNT(CASE WHEN verification_status = 'REJECTED' THEN 1 END) AS rejected_count
      FROM ${table}
      WHERE data_origin = 'OFFICIAL'
        ${otherSourceCond}
    `, otherParams.length ? otherParams : undefined).catch(() => ({ unverified_count: 0, rejected_count: 0 }));

    return {
      verifiedCount: Number(verifiedRes?.count || 0),
      pendingReviewCount: Number(pendingRes?.count || 0),
      unverifiedCount: Number(otherRes?.unverified_count || 0),
      rejectedCount: Number(otherRes?.rejected_count || 0),
    };
  }
}

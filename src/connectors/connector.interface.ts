/**
 * backend/src/connectors/connector.interface.ts
 *
 * Base Interface & Metadata definitions for NexStep Data Connectors.
 */

export type VerificationStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'UNVERIFIED' | 'REJECTED' | 'EXPIRED';
export type FreshnessStatus    = 'FRESH' | 'AGING' | 'STALE' | 'EXPIRED' | 'UNVERIFIED';

export interface SourceMetadata {
  slug: string;
  name: string;
  publisher: string;
  sourceType: 'OFFICIAL' | 'THIRD_PARTY' | 'INTERNAL_SEED' | 'KAGGLE';
  isOfficial: boolean;
  baseUrl: string;
  officialUrl: string;
  license: string;
  description: string;
  refreshFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'MANUAL';
  verificationRules: string;
}

export interface IngestionResult {
  sourceSlug: string;
  recordsRead: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsRejected: number;
  errors: string[];
}

export interface SourceConnector<T = any> {
  metadata: SourceMetadata;
  fetchRaw(): Promise<any[]>;
  validate(item: any): { valid: boolean; errors: string[] };
  normalize(item: any): T;
  deduplicateKey(item: T): string;
  ingest(options?: { dryRun?: boolean; pool?: any }): Promise<IngestionResult>;
}

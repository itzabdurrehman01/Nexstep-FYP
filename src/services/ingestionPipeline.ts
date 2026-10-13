/**
 * backend/src/services/ingestionPipeline.ts
 *
 * End-to-End Modular Ingestion Pipeline with SHA-256 Deduplication,
 * Human Review Gate (PENDING_REVIEW), and Cadence Scheduler.
 */
import crypto from 'crypto';
import { pool } from '../routes/db.js';

export interface IngestionResult {
  status: 'INGESTED' | 'DUPLICATE_SKIPPED' | 'ERROR';
  snapshotId?: string;
  checksum: string;
  recordsExtracted: number;
  verificationStatus: string;
  message: string;
}

export class IngestionPipeline {
  /**
   * Generates a SHA-256 checksum for payload deduplication.
   */
  static computeChecksum(payload: string): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Ingests a raw snapshot with deduplication check and human review gate.
   */
  static async processRawSnapshot(params: {
    sourceId: string;
    sourceUrl: string;
    publisher: string;
    rawPayload: string;
    dataYear: string;
    dataOrigin?: 'OFFICIAL' | 'KAGGLE' | 'THIRD_PARTY';
    recordType: string;
    parsedPayload: any;
  }): Promise<IngestionResult> {
    const checksum = this.computeChecksum(params.rawPayload);
    const dataOrigin = params.dataOrigin || 'OFFICIAL';

    // 1. Deduplication check against existing raw_snapshots
    const existing = await pool.query(
      `SELECT id FROM raw_snapshots WHERE payload_checksum = $1`,
      [checksum]
    );

    if (existing.rows.length > 0) {
      return {
        status: 'DUPLICATE_SKIPPED',
        snapshotId: existing.rows[0].id,
        checksum,
        recordsExtracted: 0,
        verificationStatus: 'EXISTS',
        message: `Snapshot skipped: identical SHA-256 checksum (${checksum.slice(0, 12)}) already exists.`,
      };
    }

    // 2. Insert into raw_snapshots (Immutable)
    const rawRes = await pool.query(
      `INSERT INTO raw_snapshots (source_id, source_url, publisher, payload_checksum, raw_payload, data_year, data_origin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [params.sourceId, params.sourceUrl, params.publisher, checksum, params.rawPayload, params.dataYear, dataOrigin]
    );

    const snapshotId = rawRes.rows[0].id;

    // 3. Human Review Gate: Always lands as PENDING_REVIEW for OFFICIAL extractions
    const reviewStatus = dataOrigin === 'OFFICIAL' ? 'PENDING_REVIEW' : 'VERIFIED';

    await pool.query(
      `INSERT INTO parsed_records (raw_snapshot_id, record_type, extraction_payload, verification_status, data_origin)
       VALUES ($1, $2, $3, $4, $5)`,
      [snapshotId, params.recordType, JSON.stringify(params.parsedPayload), reviewStatus, dataOrigin]
    );

    return {
      status: 'INGESTED',
      snapshotId,
      checksum,
      recordsExtracted: 1,
      verificationStatus: reviewStatus,
      message: `Snapshot ingested successfully as ${reviewStatus} (Snapshot ID: ${snapshotId}).`,
    };
  }

  /**
   * Promotes a PENDING_REVIEW record to VERIFIED upon admin approval.
   */
  static async approveAndPublishRecord(parsedRecordId: string): Promise<boolean> {
    const res = await pool.query(
      `UPDATE parsed_records
       SET verification_status = 'VERIFIED', freshness_status = 'FRESH'
       WHERE id = $1
       RETURNING id`,
      [parsedRecordId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

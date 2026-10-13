/**
 * backend/src/services/scheduler.ts
 *
 * Restart-Safe, Database-Persisted Cron Scheduler for NexStep Data Connectors.
 * Synchronizes with database table `data_sources` (next_sync_at, last_successful_sync_at).
 */
import { HecUniversitiesConnector } from '../connectors/hecUniversities.connector.js';
import { NationalJobsConnector } from '../connectors/nationalJobs.connector.js';
import { HecScholarshipsConnector } from '../connectors/hecScholarships.connector.js';
import { TevtaCoursesConnector } from '../connectors/tevtaCourses.connector.js';
import { SkillsLaborConnector } from '../connectors/skillsLabor.connector.js';
import { SourceConnector } from '../connectors/connector.interface.js';

const CONNECTORS: Record<string, SourceConnector> = {
  'hec-pakistan': new HecUniversitiesConnector(),
  'national-job-portal': new NationalJobsConnector(),
  'hec-scholarships': new HecScholarshipsConnector(),
  'tevta-navttc': new TevtaCoursesConnector(),
  'skilling-pakistan': new SkillsLaborConnector(),
};

export async function processPendingScheduledSyncs(pool: any) {
  try {
    // Select data sources due for sync or newly added sources
    const { rows } = await pool.query(`
      SELECT slug, refresh_frequency, next_sync_at
      FROM data_sources
      WHERE next_sync_at IS NULL
         OR next_sync_at <= NOW()
         OR last_checked_at < NOW() - INTERVAL '12 hours'
      FOR UPDATE SKIP LOCKED
    `);

    if (!rows.length) return;

    console.log(`⚡ [Cron Scheduler] Processing ${rows.length} due data connector sync(s)...`);

    for (const row of rows) {
      const connector = CONNECTORS[row.slug];
      if (!connector) continue;

      try {
        console.log(`🔄 [Cron] Triggering sync for ${row.slug}...`);
        const res = await connector.ingest({ dryRun: false, pool });

        // Update database persistence fields for restart safety
        const nextSyncInterval = row.refresh_frequency === 'DAILY' ? "INTERVAL '1 day'" : "INTERVAL '7 days'";
        await pool.query(
          `UPDATE data_sources
           SET last_checked_at = NOW(),
               last_successful_sync_at = NOW(),
               next_sync_at = NOW() + ${nextSyncInterval},
               verification_status = 'VERIFIED'
           WHERE slug = $1`,
          [row.slug]
        );

        console.log(`✓ [Cron] Sync completed for ${row.slug} (${res.recordsInserted} inserted/updated).`);
      } catch (err: any) {
        console.error(`❌ [Cron] Sync failed for ${row.slug}:`, err.message);
        await pool.query(
          `UPDATE data_sources SET last_checked_at = NOW(), verification_status = 'UNVERIFIED' WHERE slug = $1`,
          [row.slug]
        ).catch(() => {});
      }
    }
  } catch (err: any) {
    console.error('[Cron Scheduler] Periodic check error:', err.message);
  }
}

export function startBackgroundScheduler(pool: any) {
  console.log('⚡ NexStep Database-Backed Restart-Safe Scheduler initialized.');

  // Run immediate startup check for missed jobs during server restart
  processPendingScheduledSyncs(pool);

  // Poll database schedule every 15 minutes
  const CHECK_INTERVAL_MS = 15 * 60 * 1000;
  setInterval(() => processPendingScheduledSyncs(pool), CHECK_INTERVAL_MS);
}

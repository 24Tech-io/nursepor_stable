import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Some DBs have an older shape for qbank_access_requests (e.g. `notes` instead of `reason`,
  // missing `rejection_reason`). This patch makes the table compatible with the current code/schema.
  const sql = `
  ALTER TABLE qbank_access_requests
    ADD COLUMN IF NOT EXISTS reason text;

  ALTER TABLE qbank_access_requests
    ADD COLUMN IF NOT EXISTS rejection_reason text;

  -- Backfill: if older column exists, copy notes -> reason (best effort)
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'qbank_access_requests'
        AND column_name = 'notes'
    ) THEN
      UPDATE qbank_access_requests
      SET reason = COALESCE(reason, notes)
      WHERE reason IS NULL AND notes IS NOT NULL;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_status
    ON qbank_access_requests(status);

  CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_student_id
    ON qbank_access_requests(student_id);

  CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_qbank_id
    ON qbank_access_requests(qbank_id);
  `;

  try {
    await pool.query(sql);
    console.log('✅ qbank_access_requests table ensured');
  } catch (error) {
    console.error('❌ Failed to ensure qbank_access_requests table', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ ensure-qbank-access-requests-table failed', e);
  process.exit(1);
});





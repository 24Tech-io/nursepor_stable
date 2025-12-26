import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const sql = `
  -- Ensure enrollments has the expected columns used across the app
  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS id serial;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_pkey') THEN
      ALTER TABLE enrollments ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);
    END IF;
  END $$;

  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at timestamp;

  CREATE UNIQUE INDEX IF NOT EXISTS user_course_enrollment_unique
    ON enrollments(user_id, course_id);
  `;

  try {
    await pool.query(sql);
    console.log('✅ enrollments table ensured');
  } catch (error) {
    console.error('❌ Failed to ensure enrollments table', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();




import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const sql = `
  -- Create modules table if it somehow does not exist
  CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    duration INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Ensure description column exists (older tables were missing it)
  ALTER TABLE modules ADD COLUMN IF NOT EXISTS description TEXT;

  -- Ensure duration column exists and is not null
  ALTER TABLE modules ADD COLUMN IF NOT EXISTS duration INTEGER;
  UPDATE modules SET duration = 0 WHERE duration IS NULL;
  ALTER TABLE modules ALTER COLUMN duration SET DEFAULT 0;
  ALTER TABLE modules ALTER COLUMN duration SET NOT NULL;

  -- Ensure created_at / updated_at columns exist
  ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
  ALTER TABLE modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  UPDATE modules SET created_at = COALESCE(created_at, now()), updated_at = COALESCE(updated_at, now());
  ALTER TABLE modules ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE modules ALTER COLUMN created_at SET NOT NULL;
  ALTER TABLE modules ALTER COLUMN updated_at SET DEFAULT now();
  ALTER TABLE modules ALTER COLUMN updated_at SET NOT NULL;

  -- Make sure "order" always has a default so inserts without explicit order work
  ALTER TABLE modules ALTER COLUMN "order" SET DEFAULT 0;

  -- Ensure course_id FK exists
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'modules_course_id_courses_id_fk'
    ) THEN
      ALTER TABLE modules
        ADD CONSTRAINT modules_course_id_courses_id_fk
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
  END $$;

  -- Helpful index for course-level lookups
  CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
  `;

  try {
    await pool.query(sql);
    console.log('✅ modules table ensured');
  } catch (error) {
    console.error('❌ Failed to ensure modules table', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();





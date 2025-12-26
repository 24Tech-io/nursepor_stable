import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = `
  CREATE TABLE IF NOT EXISTS notifications (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now()
  );

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_users_id_fk'
    ) THEN
      ALTER TABLE notifications
        ADD CONSTRAINT notifications_user_id_users_id_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  `;

  try {
    await pool.query(sql);
    console.log('✅ notifications table ensured');
  } catch (error) {
    console.error('❌ Failed to ensure notifications table', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();




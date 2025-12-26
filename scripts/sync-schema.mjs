import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function syncSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Syncing database schema...\n');

    // Create sessions table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        device_info TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ sessions table ready');

    // Create question_banks table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_banks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        instructor TEXT,
        thumbnail TEXT,
        pricing INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        course_id INTEGER,
        is_public BOOLEAN DEFAULT false,
        is_default_unlocked BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        status TEXT DEFAULT 'published',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ question_banks table ready');

    // Create qbank_enrollments table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS qbank_enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        qbank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT NOW(),
        last_accessed_at TIMESTAMP,
        progress INTEGER DEFAULT 0,
        questions_attempted INTEGER DEFAULT 0,
        questions_correct INTEGER DEFAULT 0,
        total_time_spent_minutes INTEGER DEFAULT 0,
        tests_completed INTEGER DEFAULT 0,
        tutorial_tests_completed INTEGER DEFAULT 0,
        timed_tests_completed INTEGER DEFAULT 0,
        assessment_tests_completed INTEGER DEFAULT 0,
        average_score INTEGER DEFAULT 0,
        highest_score INTEGER DEFAULT 0,
        lowest_score INTEGER DEFAULT 0,
        readiness_score INTEGER DEFAULT 0,
        UNIQUE(student_id, qbank_id)
      )
    `);
    console.log('✅ qbank_enrollments table ready');

    // Create qbank_access_requests table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS qbank_access_requests (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        qbank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        notes TEXT,
        UNIQUE(student_id, qbank_id)
      )
    `);
    console.log('✅ qbank_access_requests table ready');

    // Add missing columns to users table
    const alterStatements = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint_enrolled BOOLEAN DEFAULT false NOT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint_credential_id TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_date TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_secret TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`,
    ];

    for (const sql of alterStatements) {
      try {
        await client.query(sql);
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
        console.log(`✅ ${colName}`);
      } catch (err) {
        if (err.code === '42701') {
          // Column already exists
          const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
          console.log(`⏭️  ${colName} (already exists)`);
        } else {
          console.error(`❌ Error: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Schema sync complete!\n');

    // Verify admin user exists
    const adminCheck = await client.query(
      `SELECT id, email, role, is_active FROM users WHERE email = $1`,
      ['adhithiyanmaliackal@gmail.com']
    );

    if (adminCheck.rows.length === 0) {
      console.log('⚠️  Admin user not found. Creating...');
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('Adhi1234', 10);
      
      await client.query(
        `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at, joined_date)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())`,
        ['Admin', 'adhithiyanmaliackal@gmail.com', hashedPassword, 'admin', true]
      );
      console.log('✅ Admin user created');
    } else {
      const admin = adminCheck.rows[0];
      console.log(`📋 Admin user found: ID=${admin.id}, Role=${admin.role}, Active=${admin.is_active}`);
      
      // Ensure admin is active
      if (!admin.is_active) {
        await client.query(`UPDATE users SET is_active = true WHERE id = $1`, [admin.id]);
        console.log('✅ Admin user activated');
      }
      
      // Ensure role is admin
      if (admin.role !== 'admin') {
        await client.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.id]);
        console.log('✅ Admin role set');
      }
    }

    console.log('\n🎉 Database ready!');

  } finally {
    client.release();
    await pool.end();
  }
}

syncSchema().catch(console.error);










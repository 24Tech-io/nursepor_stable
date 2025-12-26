import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupUsers() {
  const client = await pool.connect();
  
  try {
    const email = 'adhithiyanmaliackal@gmail.com';
    const password = 'Adhi1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check existing users
    const existing = await client.query(
      `SELECT id, email, role, is_active FROM users WHERE email = $1`,
      [email]
    );
    
    console.log('📋 Existing users with this email:');
    existing.rows.forEach(u => console.log(`   ID=${u.id}, Role=${u.role}, Active=${u.is_active}`));

    // Ensure admin exists
    const adminExists = existing.rows.find(u => u.role === 'admin');
    if (!adminExists) {
      await client.query(
        `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at, joined_date, fingerprint_enrolled, two_factor_enabled)
         VALUES ($1, $2, $3, 'admin', true, NOW(), NOW(), NOW(), false, false)`,
        ['Admin User', email, hashedPassword]
      );
      console.log('✅ Admin user created');
    } else {
      await client.query(
        `UPDATE users SET password = $1, is_active = true WHERE id = $2`,
        [hashedPassword, adminExists.id]
      );
      console.log('✅ Admin password reset');
    }

    // Ensure student exists
    const studentExists = existing.rows.find(u => u.role === 'student');
    if (!studentExists) {
      await client.query(
        `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at, joined_date, fingerprint_enrolled, two_factor_enabled)
         VALUES ($1, $2, $3, 'student', true, NOW(), NOW(), NOW(), false, false)`,
        ['Student User', email, hashedPassword]
      );
      console.log('✅ Student user created');
    } else {
      await client.query(
        `UPDATE users SET password = $1, is_active = true WHERE id = $2`,
        [hashedPassword, studentExists.id]
      );
      console.log('✅ Student password reset');
    }

    console.log('\n🎉 Users ready!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('   Both admin and student logins should work now.');
    
  } finally {
    client.release();
    await pool.end();
  }
}

setupUsers().catch(console.error);










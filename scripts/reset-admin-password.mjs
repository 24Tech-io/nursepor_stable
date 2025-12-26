import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetAdminPassword() {
  const client = await pool.connect();
  
  try {
    const email = 'adhithiyanmaliackal@gmail.com';
    const password = 'Adhi1234';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the admin user's password
    const result = await client.query(
      `UPDATE users SET password = $1 WHERE email = $2 AND role = 'admin' RETURNING id, email, role`,
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password reset successfully');
      console.log(`   User ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('❌ Admin user not found, creating...');
      
      await client.query(
        `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at, joined_date, fingerprint_enrolled, two_factor_enabled)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW(), false, false)`,
        ['Admin', email, hashedPassword, 'admin', true]
      );
      console.log('✅ Admin user created');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdminPassword().catch(console.error);










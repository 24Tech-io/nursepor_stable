import { config } from 'dotenv';
import pg from 'pg';

// Load environment variables
config({ path: '.env' });

const { Client } = pg;

async function fixAdminAccount() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check current admin accounts
    const adminCheck = await client.query(
      "SELECT id, email, name, role, is_active FROM users WHERE role = 'admin'"
    );

    console.log(`📊 Current admin accounts: ${adminCheck.rows.length}\n`);
    adminCheck.rows.forEach((user) => {
      console.log(`   • ${user.email} (${user.name}) - Active: ${user.is_active}`);
    });

    // Check your specific account
    console.log('\n🔍 Checking adhithiyanmaliackal@gmail.com...');
    const userCheck = await client.query(
      "SELECT id, email, name, role, is_active FROM users WHERE email = 'adhithiyanmaliackal@gmail.com'"
    );

    if (userCheck.rows.length === 0) {
      console.log('❌ Account not found!\n');
    } else {
      const user = userCheck.rows[0];
      console.log(`   Current role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);

      if (user.role !== 'admin') {
        console.log('\n🔧 Converting to admin...');
        await client.query(
          "UPDATE users SET role = 'admin', is_active = true WHERE email = 'adhithiyanmaliackal@gmail.com'"
        );
        console.log('✅ Account updated to ADMIN!\n');
        console.log('🎉 You can now login at: http://localhost:3000/admin/login');
        console.log(`   Email: adhithiyanmaliackal@gmail.com`);
        console.log(`   Password: (your existing password)\n`);
      } else {
        console.log('✅ Account is already an admin!\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAdminAccount();


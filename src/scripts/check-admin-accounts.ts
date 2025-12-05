import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkAdminAccounts() {
  try {
    console.log('🔍 Checking for admin accounts...\n');

    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));

    if (adminUsers.length === 0) {
      console.log('❌ NO ADMIN ACCOUNTS FOUND!\n');
      console.log('Run: node src/scripts/create-admin.mjs');
      console.log('Or: npx tsx src/scripts/create-admin-account.ts\n');
    } else {
      console.log(`✅ Found ${adminUsers.length} admin account(s):\n`);
      adminUsers.forEach((user, idx) => {
        console.log(`${idx + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   ID: ${user.id}\n`);
      });
    }

    // Also check the specific account user is trying
    const specificUser = await db.select().from(users).where(eq(users.email, 'adhithiyanmaliackal@gmail.com')).limit(1);
    
    if (specificUser.length > 0) {
      console.log('📧 Account: adhithiyanmaliackal@gmail.com');
      console.log(`   Role: ${specificUser[0].role}`);
      console.log(`   Active: ${specificUser[0].isActive}`);
      console.log(`   ID: ${specificUser[0].id}\n`);
      
      if (specificUser[0].role !== 'admin') {
        console.log('⚠️  This account is NOT an admin!');
        console.log('   It has role: ' + specificUser[0].role);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAdminAccounts();


import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAdmin() {
    console.log('🔍 Checking for admin users...\n');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set in .env.local');
        process.exit(1);
    }

    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool);

        // Check all admin users using raw SQL
        const adminUsers = await db.execute(sql`
            SELECT id, email, name, role, is_active 
            FROM users 
            WHERE role = 'admin'
        `);

        console.log(`Found ${adminUsers.rows.length} admin user(s):\n`);
        
        if (adminUsers.rows.length === 0) {
            console.log('❌ No admin users found!\n');
            console.log('Creating default admin user...\n');
            
            const adminPassword = await bcrypt.hash('admin123', 10);
            
            await db.execute(sql`
                INSERT INTO users (name, email, password, role, is_active, created_at, updated_at)
                VALUES ('Admin User', 'admin@test.com', ${adminPassword}, 'admin', true, NOW(), NOW())
            `);
            
            console.log('✅ Admin user created successfully!');
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: admin123\n');
        } else {
            adminUsers.rows.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name} (${user.email})`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
                console.log('');
            });
            
            // Check if any admin is active
            const activeAdmins = adminUsers.rows.filter(u => u.is_active);
            if (activeAdmins.length === 0) {
                console.log('⚠️  WARNING: No active admin users found!');
                console.log('Activating first admin user...\n');
                
                await db.execute(sql`
                    UPDATE users 
                    SET is_active = true 
                    WHERE id = ${adminUsers.rows[0].id}
                `);
                
                console.log(`✅ Activated admin user: ${adminUsers.rows[0].email}\n`);
            }
        }
        
        // Check for the specific email the user tried
        const userEmail = 'adhithiyanmaliackal@gmal.com';
        console.log(`\n🔍 Checking for user: ${userEmail}`);
        
        const userCheck = await db.execute(sql`
            SELECT id, email, name, role, is_active
            FROM users
            WHERE email = ${userEmail.toLowerCase()}
        `);
        
        if (userCheck.rows.length > 0) {
            const user = userCheck.rows[0];
            console.log(`\n✅ Found user: ${user.name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
            
            if (user.role !== 'admin') {
                console.log(`\n⚠️  This user is a ${user.role}, not an admin!`);
                console.log('   You can either:');
                console.log('   1. Use the admin account: admin@test.com / admin123');
                console.log('   2. Create a new admin account with your email');
            }
        } else {
            console.log(`\n❌ User not found: ${userEmail}`);
            console.log('   Note: There might be a typo in the email (gmal.com vs gmail.com)');
            console.log('\n💡 You can use the test admin account:');
            console.log('   Email: admin@test.com');
            console.log('   Password: admin123');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkAdmin();



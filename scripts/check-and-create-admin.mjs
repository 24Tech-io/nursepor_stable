import { createClient } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../src/lib/db/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function getDatabase() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set in .env.local');
    }
    const client = createClient(process.env.DATABASE_URL);
    return drizzle(client);
}

async function checkAndCreateAdmin() {
    console.log('🔍 Checking for admin users...\n');

    try {
        const db = getDatabase();
        
        // Check all admin users
        const adminUsers = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.role, 'admin'));

        console.log(`Found ${adminUsers.length} admin user(s):\n`);
        
        if (adminUsers.length === 0) {
            console.log('❌ No admin users found!\n');
            console.log('Creating default admin user...\n');
            
            const adminPassword = await bcrypt.hash('admin123', 10);
            
            const [newAdmin] = await db
                .insert(users)
                .values({
                    name: 'Admin User',
                    email: 'admin@test.com',
                    password: adminPassword,
                    role: 'admin',
                    isActive: true,
                })
                .returning();
            
            console.log('✅ Admin user created successfully!');
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: admin123\n');
        } else {
            adminUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name} (${user.email})`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
                console.log('');
            });
            
            // Check if any admin is active
            const activeAdmins = adminUsers.filter(u => u.isActive);
            if (activeAdmins.length === 0) {
                console.log('⚠️  WARNING: No active admin users found!');
                console.log('Activating first admin user...\n');
                
                await db
                    .update(users)
                    .set({ isActive: true })
                    .where(eq(users.id, adminUsers[0].id));
                
                console.log(`✅ Activated admin user: ${adminUsers[0].email}\n`);
            }
        }
        
        // Check for the specific email the user tried
        const userEmail = 'adhithiyanmaliackal@gmal.com';
        console.log(`\n🔍 Checking for user: ${userEmail}`);
        
        const userCheck = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.email, userEmail.toLowerCase()));
        
        if (userCheck.length > 0) {
            console.log(`\n✅ Found user: ${userCheck[0].name}`);
            console.log(`   Role: ${userCheck[0].role}`);
            console.log(`   Active: ${userCheck[0].isActive ? '✅ Yes' : '❌ No'}`);
            
            if (userCheck[0].role !== 'admin') {
                console.log(`\n⚠️  This user is a ${userCheck[0].role}, not an admin!`);
                console.log('   To create an admin account with this email, run:');
                console.log(`   node scripts/create-admin.mjs ${userEmail}`);
            }
        } else {
            console.log(`\n❌ User not found: ${userEmail}`);
            console.log('   Note: There might be a typo in the email (gmal.com vs gmail.com)');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndCreateAdmin();



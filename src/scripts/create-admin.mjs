import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { users } from '../lib/db/schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function createAdminUser() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    console.log('🔌 Connecting to database...');
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql);

    const email = 'admin@lms.com';
    const password = 'Admin123!';
    const name = 'Admin User';

    console.log(`\n📧 Creating admin user: ${email}`);

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existing.length > 0) {
      console.log('⚠️  User already exists!');
      
      if (existing[0].role === 'admin') {
        console.log('✅ User is already an admin');
        console.log('\n🔑 Login credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`\n🌐 Login at: http://localhost:3001/admin/login`);
        return;
      } else {
        console.log('🔄 Updating user role to admin...');
        await db.update(users)
          .set({ role: 'admin', isActive: true })
          .where(eq(users.email, email));
        console.log('✅ User updated to admin!');
        console.log('\n🔑 Login credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: Use your existing password`);
        console.log(`\n🌐 Login at: http://localhost:3001/admin/login`);
        return;
      }
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n🔑 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log(`\n🌐 Login at: http://localhost:3001/admin/login`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();


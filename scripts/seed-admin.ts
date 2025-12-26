import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load .env files from parent directory
config({ path: '../.env.local' });
config({ path: '../.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

async function seedAdmin() {
  console.log('🌱 Seeding admin user...');

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    // Check if admin exists
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'admin@nursepro.com'),
    });

    if (existing) {
      console.log('✅ Admin user already exists');
      await pool.end();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.insert(schema.users).values({
      name: 'Admin User',
      email: 'admin@nursepro.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      profilePicture: null,
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@nursepro.com');
    console.log('🔑 Password: admin123');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await pool.end();
  }
}

seedAdmin();


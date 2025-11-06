import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './src/lib/db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema: { users } });

async function seedDatabase() {
  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Insert admin user
  await db.insert(users).values({
    name: 'Admin User',
    email: 'admin@lms.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    joinedDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Insert student user
  await db.insert(users).values({
    name: 'Student User',
    email: 'student@lms.com',
    password: hashedPassword,
    role: 'student',
    isActive: true,
    joinedDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Database seeded successfully!');
  console.log('Admin login: admin@lms.com / password123');
  console.log('Student login: student@lms.com / password123');

  process.exit(0);
}

seedDatabase().catch(console.error);

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sqlConnection = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlConnection, { schema });

async function seedCourses() {
  console.log('🌱 Starting Course Seeding...');

  try {
    // 1. Create Public Course
    console.log('Creating Public Course...');
    await db.insert(schema.courses).values({
      title: 'Public Health Nursing 101',
      description: 'Introduction to Public Health Nursing. Open to everyone.',
      instructor: 'Public Health Team',
      thumbnail: '/images/public-health.jpg',
      pricing: 0,
      status: 'published',
      isPublic: true,
      isRequestable: true,
    });

    // 2. Create Private + Requestable Course
    console.log('Creating Private Requestable Course...');
    await db.insert(schema.courses).values({
      title: 'Advanced Critical Care (Private)',
      description: 'Specialized training for ICU nurses. Requires approval.',
      instructor: 'Critical Care Specialists',
      thumbnail: '/images/icu.jpg',
      pricing: 199,
      status: 'published',
      isPublic: false,
      isRequestable: true,
    });

    // 3. Create Default Unlocked Course
    console.log('Creating Default Unlocked Course...');
    await db.insert(schema.courses).values({
      title: 'Orientation Module (Unlocked)',
      description: 'Mandatory orientation for all new students.',
      instructor: 'Orientation Team',
      thumbnail: '/images/orientation.jpg',
      pricing: 0,
      status: 'published',
      isDefaultUnlocked: true,
      isRequestable: false,
    });

    console.log('✅ Successfully seeded 3 courses.');
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
  }
}

seedCourses();

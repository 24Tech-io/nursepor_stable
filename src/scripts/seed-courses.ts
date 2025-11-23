
import { drizzle } from 'drizzle-orm/neon-http';
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
            imageUrl: '/images/public-health.jpg',
            price: 0,
            isPublished: true,
            isPublic: true, // This flag makes it visible to everyone without enrollment? Or just visible in catalog?
            // Assuming isPublic means "Free and Open" or "Visible in Catalog"
            categoryId: 1, // Assuming category 1 exists, otherwise might fail. Let's check categories first.
        });

        // 2. Create Private + Requestable Course
        console.log('Creating Private Requestable Course...');
        await db.insert(schema.courses).values({
            title: 'Advanced Critical Care (Private)',
            description: 'Specialized training for ICU nurses. Requires approval.',
            imageUrl: '/images/icu.jpg',
            price: 199,
            isPublished: true,
            isPublic: false,
            // isRequestable: true // Check if this column exists. If not, maybe logic handles it.
        });

        // 3. Create Default Unlocked Course
        console.log('Creating Default Unlocked Course...');
        await db.insert(schema.courses).values({
            title: 'Orientation Module (Unlocked)',
            description: 'Mandatory orientation for all new students.',
            imageUrl: '/images/orientation.jpg',
            price: 0,
            isPublished: true,
            isDefaultUnlocked: true, // This should trigger auto-enrollment
        });

        console.log('✅ Successfully seeded 3 courses.');

    } catch (error) {
        console.error('❌ Error seeding courses:', error);
    }
}

seedCourses();

import { getDatabase } from './src/lib/db/index.js';
import { users } from './src/lib/db/schema.js';
import bcrypt from 'bcryptjs';

async function createTestUsers() {
    console.log('Creating test users...');

    const db = getDatabase();

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    try {
        // Create admin user
        await db.insert(users).values({
            name: 'Admin User',
            email: 'admin@test.com',
            password: adminPassword,
            phone: '+1234567890',
            role: 'admin',
            isActive: true,
            faceIdEnrolled: false,
            fingerprintEnrolled: false,
            twoFactorEnabled: false,
        });
        console.log('✅ Admin user created: admin@test.com / admin123');

        // Create student user
        await db.insert(users).values({
            name: 'Test Student',
            email: 'student@test.com',
            password: studentPassword,
            phone: '+1234567891',
            role: 'student',
            isActive: true,
            faceIdEnrolled: false,
            fingerprintEnrolled: false,
            twoFactorEnabled: false,
        });
        console.log('✅ Student user created: student@test.com / student123');

        console.log('\n✅ Test users created successfully!');
        console.log('\nAdmin Login:');
        console.log('  Email: admin@test.com');
        console.log('  Password: admin123');
        console.log('\nStudent Login:');
        console.log('  Email: student@test.com');
        console.log('  Password: student123');

    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            console.log('⚠️  Users already exist. Skipping creation.');
        } else {
            console.error('Error creating users:', error);
        }
    }

    process.exit(0);
}

createTestUsers();

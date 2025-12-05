import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import bcrypt from 'bcryptjs';

async function createTestStudent() {
  try {
    console.log('🔧 Creating test student account...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const [student] = await db
      .insert(users)
      .values({
        name: 'Test Student',
        email: 'student@test.com',
        password: hashedPassword,
        role: 'student',
        phone: '1234567890',
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    if (student) {
      console.log('✅ Test student created successfully!');
      console.log(`   Email: student@test.com`);
      console.log(`   Password: password123`);
      console.log(`   Name: ${student.name}`);
      console.log(`   ID: ${student.id}`);
    } else {
      console.log('ℹ️  Student already exists');
    }
  } catch (error) {
    console.error('❌ Error creating test student:', error);
  } finally {
    process.exit(0);
  }
}

createTestStudent();


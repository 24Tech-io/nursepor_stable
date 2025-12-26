import { db } from '../src/lib/db/index.ts';
import { users } from '../src/lib/db/schema.ts';
import bcrypt from 'bcryptjs';

const createAdmin = async () => {
  try {
    const email = 'adhithiyanmaliackal@gmail.com';
    const password = '@Adhi1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existing) {
      console.log('✅ Admin account already exists:', email);
      return;
    }

    // Create new admin user
    const result = await db.insert(users).values({
      name: 'Admin User',
      email: email,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    }).returning();

    console.log('✅ Admin account created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', result[0]?.id);
    console.log('\nYou can now login at: http://localhost:3000/login');
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
};

createAdmin();

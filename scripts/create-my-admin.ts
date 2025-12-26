
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

async function main() {
    const email = 'myadmin@test.com';
    const password = 'password123';
    const hashedPassword = await hash(password, 10);

    try {
        try {
            await db.insert(users).values({
                name: 'Test Admin',
                email,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            console.log('User created');
        } catch (e: any) {
            // Update if exists
            await db.update(users).set({
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            }).where(eq(users.email, email));
            console.log('User updated');
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main();



import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { getDatabase } from '../src/lib/db/index';
import { courses, questionBanks, enrollments, qbankEnrollments, accessRequests, qbankAccessRequests, users } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function analyzeData() {
    try {
        const db = getDatabase();
        console.log('\n=== DATABASE ANALYSIS ===\n');

        // 1. Check all courses
        console.log('📚 COURSES:');
        const allCourses = await db.select({
            id: courses.id,
            title: courses.title,
            status: courses.status,
            isPublic: courses.isPublic,
            isRequestable: courses.isRequestable,
            isDefaultUnlocked: courses.isDefaultUnlocked
        }).from(courses);

        allCourses.forEach(c => {
            console.log(`  ID ${c.id}: "${c.title}" - Status: ${c.status}, Public: ${c.isPublic}, Requestable: ${c.isRequestable}, DefaultUnlocked: ${c.isDefaultUnlocked}`);
        });
        const publishedCourses = allCourses.filter(c => c.status?.toLowerCase() === 'published' || c.status?.toLowerCase() === 'active');
        console.log(`  Total: ${allCourses.length}, Published/Active: ${publishedCourses.length}\n`);

        // 2. Check all Q-Banks
        console.log('📋 QUESTION BANKS:');
        const allQbanks = await db.select({
            id: questionBanks.id,
            name: questionBanks.name,
            status: questionBanks.status,
            isActive: questionBanks.isActive,
            isPublic: questionBanks.isPublic
        }).from(questionBanks);

        allQbanks.forEach(q => {
            console.log(`  ID ${q.id}: "${q.name}" - Status: ${q.status}, isActive: ${q.isActive}, isPublic: ${q.isPublic}`);
        });
        console.log(`  Total: ${allQbanks.length}\n`);

        // 3. Check student user
        console.log('👤 STUDENT USER:');
        const student = await db.select().from(users).where(eq(users.email, 'student@test.com')).limit(1);
        if (student.length > 0) {
            const s = student[0];
            console.log(`  ID: ${s.id}, Name: ${s.name}, Email: ${s.email}, Role: ${s.role}, isActive: ${s.isActive}\n`);

            // 4. Check enrollments for this student
            console.log('📝 ENROLLMENTS for student ID', s.id, ':');
            const studentEnrollments = await db.select().from(enrollments).where(eq(enrollments.userId, s.id));
            if (studentEnrollments.length > 0) {
                studentEnrollments.forEach(e => {
                    console.log(`  Course ${e.courseId}: Status: ${e.status}, Progress: ${e.progress}`);
                });
            } else {
                console.log('  No enrollments found');
            }
            console.log('');

            // 5. Check Q-Bank enrollments
            console.log('📝 Q-BANK ENROLLMENTS for student ID', s.id, ':');
            const studentQbankEnrollments = await db.select().from(qbankEnrollments).where(eq(qbankEnrollments.studentId, s.id));
            if (studentQbankEnrollments.length > 0) {
                studentQbankEnrollments.forEach(e => {
                    console.log(`  Q-Bank ${e.qbankId}: Progress: ${e.progress}`);
                });
            } else {
                console.log('  No Q-Bank enrollments found');
            }
            console.log('');

            // 6. Check access requests
            console.log('📤 ACCESS REQUESTS for student ID', s.id, ':');
            const studentRequests = await db.select().from(accessRequests).where(eq(accessRequests.studentId, s.id));
            if (studentRequests.length > 0) {
                studentRequests.forEach(r => {
                    console.log(`  Course ${r.courseId}: Status: ${r.status}`);
                });
            } else {
                console.log('  No access requests found');
            }
        } else {
            console.log('  Student user not found!');
        }

        console.log('\n=== END ANALYSIS ===\n');
    } catch (e: any) {
        console.error('Error:', e.message);
        console.error(e.stack);
    }
    process.exit(0);
}

analyzeData();

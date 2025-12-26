import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../lib/db/schema';
import { studentProgress, enrollments, courseQuestionAssignments, courses } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../.env.local') });

const sqlConnection = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlConnection, { schema });

async function diagnose() {
  console.log('\n🔍 DIAGNOSING Q-BANK ACCESS FOR STUDENT 9...\n');

  const studentId = 9;

  // 1. Check studentProgress table
  const progress = await db.select().from(studentProgress).where(eq(studentProgress.studentId, studentId));
  console.log(`1️⃣ Student Progress Records: ${progress.length}`);
  progress.forEach((p: any) => console.log(`   - Course ${p.courseId} - Progress: ${p.totalProgress}%`));

  // 2. Check enrollments table
  const enroll = await db.select().from(enrollments).where(eq(enrollments.userId, studentId));
  console.log(`\n2️⃣ Enrollments Table Records: ${enroll.length}`);
  enroll.forEach((e: any) => console.log(`   - Course ${e.courseId} - Status: ${e.status}`));

  // 3. Check course question assignments
  console.log(`\n3️⃣ Question Assignments by Course:`);
  const allCourses = await db.select().from(courses);
  
  for (const course of allCourses) {
    const assignments = await db
      .select()
      .from(courseQuestionAssignments)
      .where(eq(courseQuestionAssignments.courseId, course.id));
    
    if (assignments.length > 0) {
      console.log(`   - Course ${course.id} (${course.title}): ${assignments.length} questions`);
    }
  }

  // 4. Check if course 8 specifically
  const course8Assignments = await db
    .select()
    .from(courseQuestionAssignments)
    .where(eq(courseQuestionAssignments.courseId, 8));

  console.log(`\n4️⃣ Course 8 (NCLEX-RN Fundamentals):`);
  console.log(`   - Questions assigned: ${course8Assignments.length}`);
  console.log(`   - Student enrolled (progress): ${progress.some((p: any) => p.courseId === 8) ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   - Student enrolled (enrollments): ${enroll.some((e: any) => e.courseId === 8) ? 'YES ✅' : 'NO ❌'}`);

  // 5. Summary
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`📊 DIAGNOSIS SUMMARY:`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`Student ${studentId} enrollment status:`);
  console.log(`  - Courses in studentProgress: ${progress.length}`);
  console.log(`  - Courses in enrollments: ${enroll.length}`);
  console.log(`\nCourse 8 status:`);
  console.log(`  - Has ${course8Assignments.length} Q-Bank questions`);
  console.log(`  - Student enrolled: ${progress.some((p: any) => p.courseId === 8) || enroll.some((e: any) => e.courseId === 8) ? 'YES ✅' : 'NO ❌'}`);
  console.log(`═══════════════════════════════════════════════\n`);

  process.exit(0);
}

diagnose();





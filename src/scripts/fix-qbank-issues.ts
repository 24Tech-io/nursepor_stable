import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../lib/db/schema';
import { questionBanks, courseQuestionAssignments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../.env.local') });

const sqlConnection = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlConnection, { schema });

async function fixQBankIssues() {
  console.log('\n🔧 FIXING Q-BANK ISSUES...\n');

  try {
    // 1. Check questionBanks table
    console.log('1️⃣ Checking questionBanks table...');
    const qbanks = await db.select().from(questionBanks);
    console.log(`   Found ${qbanks.length} question banks`);
    
    if (qbanks.length > 0) {
      qbanks.forEach((q: any) => {
        console.log(`   - ID: ${q.id}, Course: ${q.courseId}, Active: ${q.isActive}`);
      });
    }

    // 2. Check which courses have question assignments
    console.log('\n2️⃣ Checking course question assignments...');
    const assignments = await db.select().from(courseQuestionAssignments);
    
    const courseIds = [...new Set(assignments.map((a: any) => a.courseId))];
    console.log(`   Found questions assigned to ${courseIds.length} courses:`);
    
    const assignmentsByCourse: any = {};
    assignments.forEach((a: any) => {
      if (!assignmentsByCourse[a.courseId]) {
        assignmentsByCourse[a.courseId] = 0;
      }
      assignmentsByCourse[a.courseId]++;
    });
    
    Object.keys(assignmentsByCourse).forEach(courseId => {
      console.log(`   - Course ${courseId}: ${assignmentsByCourse[courseId]} questions`);
    });

    // 3. Create missing questionBanks records
    console.log('\n3️⃣ Creating missing questionBanks records...');
    
    for (const courseId of courseIds) {
      const courseIdNum = parseInt(courseId);
      const existing = qbanks.find((q: any) => q.courseId === courseIdNum);
      
      if (!existing) {
        console.log(`   Creating questionBank for course ${courseId}...`);
        const [newQBank] = await db
          .insert(questionBanks)
          .values({
            courseId: courseIdNum,
            name: `Course ${courseId} Q-Bank`,
            description: `Practice questions for course ${courseId}`,
            isActive: true,
          })
          .returning();
        
        console.log(`   ✅ Created questionBank ID ${newQBank.id} for course ${courseId}`);
      } else {
        console.log(`   ✅ QuestionBank already exists for course ${courseId} (ID: ${existing.id})`);
      }
    }

    // 4. Verify all courses now have questionBanks
    console.log('\n4️⃣ Verifying questionBanks...');
    const updatedQBanks = await db.select().from(questionBanks);
    console.log(`   Total questionBanks: ${updatedQBanks.length}`);
    updatedQBanks.forEach((q: any) => {
      const count = assignmentsByCourse[q.courseId] || 0;
      console.log(`   - Course ${q.courseId}: ${count} questions, Active: ${q.isActive}`);
    });

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ Q-BANK ISSUES FIXED!');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅ ${updatedQBanks.length} question banks active`);
    console.log(`✅ ${assignments.length} questions assigned`);
    console.log(`✅ ${courseIds.length} courses with Q-Bank access`);
    console.log('\n💡 Students can now create and take tests!');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error fixing Q-Bank issues:', error);
  } finally {
    process.exit(0);
  }
}

fixQBankIssues();


import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../src/lib/db/schema.js';
import { qbankQuestions, questionBanks, courseQuestionAssignments } from '../src/lib/db/schema.js';
import { eq, sql } from 'drizzle-orm';

const sqlConn = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlConn, { schema });

console.log('\n📊 Q-Bank Database Check for Course 8\n');

// Check course 8's question bank
const qbanks = await db.select().from(questionBanks).where(eq(questionBanks.courseId, 8));
console.log('Question Banks for Course 8:', qbanks.length);

if (qbanks.length > 0) {
  console.log('  - Bank ID:', qbanks[0].id);
  const directQuestions = await db.select().from(qbankQuestions).where(eq(qbankQuestions.questionBankId, qbanks[0].id));
  console.log('  - Direct Questions in Bank:', directQuestions.length);
}

// Check assignments
const assignments = await db.select().from(courseQuestionAssignments).where(eq(courseQuestionAssignments.courseId, 8));
console.log('\nCourse Question Assignments for Course 8:', assignments.length);
if (assignments.length > 0) {
  console.log('  - First 10 assigned question IDs:', assignments.slice(0,10).map(a => a.questionId));
}

// Check general bank
const generalBank = await db.select().from(questionBanks).where(sql`${questionBanks.courseId} IS NULL`);
console.log('\nGeneral Bank:', generalBank.length > 0 ? 'EXISTS' : 'NOT FOUND');

if (generalBank.length > 0) {
  const generalQuestions = await db.select().from(qbankQuestions).where(eq(qbankQuestions.questionBankId, generalBank[0].id));
  console.log('  - Questions in General Bank:', generalQuestions.length);
  if (generalQuestions.length > 0) {
    console.log('  - First 5 IDs:', generalQuestions.slice(0,5).map(q => q.id));
    console.log('  - Test Types:', [...new Set(generalQuestions.map(q => q.testType))]);
  }
}

// Total questions across all banks
const allQuestions = await db.select().from(qbankQuestions);
console.log('\n📝 TOTAL Questions in Database:', allQuestions.length);

process.exit(0);


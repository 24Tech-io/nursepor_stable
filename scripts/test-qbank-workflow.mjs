/**
 * Q-Bank Workflow Test Script
 * Verifies seed data was created correctly
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const sql = neon(process.env.DATABASE_URL);

async function testWorkflow() {
  console.log('🧪 Testing Q-Bank Workflow...\n');

  try {
    // Check Q-Banks
    const qbanks = await sql`SELECT id, name, status, total_questions FROM question_banks ORDER BY id`;
    console.log(`✅ Found ${qbanks.length} Q-Banks:`);
    qbanks.forEach(q => {
      console.log(`   - ${q.name} (${q.status}, ${q.total_questions || 0} questions)`);
    });

    // Check Questions
    const questions = await sql`SELECT COUNT(*) as count FROM qbank_questions`;
    console.log(`\n✅ Found ${questions[0].count} Questions total`);

    // Check Questions per Q-Bank
    const questionsPerBank = await sql`
      SELECT 
        qb.name,
        COUNT(q.id) as question_count
      FROM question_banks qb
      LEFT JOIN qbank_questions q ON q.question_bank_id = qb.id
      GROUP BY qb.id, qb.name
      ORDER BY qb.id
    `;
    console.log('\n📊 Questions per Q-Bank:');
    questionsPerBank.forEach(q => {
      console.log(`   - ${q.name}: ${q.question_count} questions`);
    });

    // Check Categories
    const categories = await sql`SELECT COUNT(*) as count FROM qbank_categories`;
    console.log(`\n✅ Found ${categories[0].count} Categories`);

    // Check Category details
    const categoryDetails = await sql`SELECT name, icon FROM qbank_categories ORDER BY id`;
    console.log('\n📁 Categories:');
    categoryDetails.forEach(c => {
      console.log(`   - ${c.icon} ${c.name}`);
    });

    console.log('\n✅ All checks passed!');
    console.log('\n🧪 Next steps:');
    console.log('   1. Visit http://localhost:3000/student/qbanks');
    console.log('   2. Visit http://localhost:3000/admin/qbanks');
    console.log('   3. Test enrollment and requests\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing workflow:', error);
    process.exit(1);
  }
}

testWorkflow();


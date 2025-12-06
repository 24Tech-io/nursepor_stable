// Quick fix for Q-Bank issues
// Run with: node fix-qbank-now.js

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function fix() {
  console.log('\n🔧 Creating questionBanks records...\n');

  try {
    // Create questionBank for course 8
    await sql`
      INSERT INTO question_banks (course_id, name, description, is_active, created_at, updated_at)
      VALUES (
        8,
        'NCLEX-RN Fundamentals Q-Bank',
        'Comprehensive practice questions for NCLEX-RN Fundamentals',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (course_id) DO UPDATE SET is_active = true
    `;
    console.log('✅ Created/updated questionBank for course 8');

    // Create for course 16 if needed
    await sql`
      INSERT INTO question_banks (course_id, name, description, is_active, created_at, updated_at)
      VALUES (
        16,
        'Course 16 Q-Bank',
        'Practice questions for course 16',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (course_id) DO UPDATE SET is_active = true
    `;
    console.log('✅ Created/updated questionBank for course 16');

    // Verify
    const result = await sql`SELECT * FROM question_banks`;
    console.log(`\n✅ Total questionBanks: ${result.length}`);
    result.forEach(qb => {
      console.log(`   - Course ${qb.course_id}: ${qb.name} (Active: ${qb.is_active})`);
    });

    console.log('\n🎉 Q-Bank issues fixed! Students can now create tests!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fix();





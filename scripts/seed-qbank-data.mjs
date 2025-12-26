/**
 * Q-Bank Seed Data Script
 * Creates sample Q-Banks, categories, and questions for testing
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const sql = neon(process.env.DATABASE_URL);

async function seedQBanks() {
  console.log('🌱 Seeding Q-Bank data...\n');

  try {
    // 0. Ensure base tables exist
    console.log('📁 Checking/creating base tables...');
    
    // Create question_banks if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS question_banks (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        instructor TEXT,
        thumbnail TEXT,
        pricing REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        is_requestable BOOLEAN NOT NULL DEFAULT TRUE,
        is_default_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        total_questions INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    // Create qbank_categories if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS qbank_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        parent_category_id INTEGER REFERENCES qbank_categories(id) ON DELETE CASCADE,
        description TEXT,
        color TEXT DEFAULT '#8B5CF6',
        icon TEXT DEFAULT '📁',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    // Create qbank_questions if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS qbank_questions (
        id SERIAL PRIMARY KEY,
        question_bank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES qbank_categories(id) ON DELETE SET NULL,
        question TEXT NOT NULL,
        question_type TEXT DEFAULT 'multiple_choice' NOT NULL,
        options TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        difficulty TEXT DEFAULT 'medium',
        subject TEXT,
        lesson TEXT,
        client_need_area TEXT,
        subcategory TEXT,
        test_type TEXT DEFAULT 'mixed' NOT NULL,
        points INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    console.log('✅ Base tables ready\n');

    // 1. Create Categories
    console.log('📁 Creating categories...');
    const categories = await sql`
      INSERT INTO qbank_categories (name, description, color, icon)
      VALUES 
        ('Adult Health', 'Adult health nursing questions', '#3B82F6', '🏥'),
        ('Pediatrics', 'Child health and development', '#10B981', '👶'),
        ('Pharmacology', 'Drug therapy and administration', '#8B5CF6', '💊'),
        ('Mental Health', 'Psychiatric nursing', '#F59E0B', '🧠'),
        ('Maternity', 'Maternal and newborn care', '#EC4899', '🤱'),
        ('Leadership', 'Nursing leadership and management', '#6366F1', '👔')
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `;
    console.log(`✅ Created ${categories.length} categories\n`);

    // 2. Create Public Q-Bank
    console.log('📚 Creating public Q-Bank...');
    const [publicQBank] = await sql`
      INSERT INTO question_banks (
        name, description, instructor, status,
        is_public, is_requestable, is_active,
        total_questions, pricing
      )
      VALUES (
        'NCLEX-RN Practice Q-Bank',
        'Comprehensive NCLEX review with 500+ questions covering all client need areas',
        'Dr. Sarah Johnson',
        'published',
        true, true, true,
        500, 0
      )
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `;
    console.log(`✅ Created: ${publicQBank?.name || 'Already exists'}\n`);

    // 3. Create Private/Requestable Q-Bank
    console.log('📚 Creating private Q-Bank...');
    const [privateQBank] = await sql`
      INSERT INTO question_banks (
        name, description, instructor, status,
        is_public, is_requestable, is_active,
        total_questions, pricing
      )
      VALUES (
        'Advanced Pharmacology Q-Bank',
        'In-depth pharmacology questions for advanced students preparing for specialty exams',
        'Dr. Michael Chen',
        'published',
        false, true, true,
        250, 29.99
      )
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `;
    console.log(`✅ Created: ${privateQBank?.name || 'Already exists'}\n`);

    // 4. Create Course-Linked Q-Bank (if course exists)
    console.log('📚 Creating course-linked Q-Bank...');
    const [courseQBank] = await sql`
      INSERT INTO question_banks (
        name, description, instructor, status,
        course_id, is_public, is_requestable, is_active,
        total_questions
      )
      SELECT 
        'Fundamentals Course Q-Bank',
        'Practice questions for Nursing Fundamentals course',
        'Dr. Emily Rodriguez',
        'published',
        id,
        true, false, true,
        150
      FROM courses
      WHERE id = 1
      LIMIT 1
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `;
    console.log(`✅ Created: ${courseQBank?.name || 'Skipped (no course ID 1)'}\n`);

    // 5. Get Q-Bank IDs
    const qbankIds = await sql`
      SELECT id, name FROM question_banks 
      WHERE status = 'published' 
      ORDER BY id DESC 
      LIMIT 3
    `;

    if (qbankIds.length === 0) {
      console.log('⚠️  No Q-Banks found. Please create Q-Banks first.\n');
      return;
    }

    // 6. Create Sample Questions
    console.log('❓ Creating sample questions...');
    const sampleQuestions = [
      {
        question: 'A patient with heart failure is prescribed furosemide (Lasix). Which lab value should the nurse monitor most closely?',
        options: [
          { id: 'A', text: 'Sodium' },
          { id: 'B', text: 'Potassium' },
          { id: 'C', text: 'Calcium' },
          { id: 'D', text: 'Magnesium' }
        ],
        correctAnswer: 'B',
        explanation: 'Furosemide is a loop diuretic that causes potassium loss, requiring close monitoring to prevent hypokalemia.',
        difficulty: 'medium',
        subject: 'Adult Health',
        clientNeedArea: 'Pharmacological Therapies',
        categoryId: categories.find(c => c.name === 'Pharmacology')?.id || categories[0].id
      },
      {
        question: 'A 2-year-old child is admitted with suspected bacterial meningitis. Which nursing intervention is priority?',
        options: [
          { id: 'A', text: 'Administer antibiotics immediately' },
          { id: 'B', text: 'Obtain blood cultures first' },
          { id: 'C', text: 'Perform lumbar puncture' },
          { id: 'D', text: 'Monitor neurological status' }
        ],
        correctAnswer: 'A',
        explanation: 'Antibiotics should be administered immediately, even before diagnostic tests, to prevent complications.',
        difficulty: 'hard',
        subject: 'Pediatrics',
        clientNeedArea: 'Physiological Adaptation',
        categoryId: categories.find(c => c.name === 'Pediatrics')?.id || categories[1].id
      },
      {
        question: 'A patient with schizophrenia is prescribed haloperidol. The nurse should monitor for which extrapyramidal side effect?',
        options: [
          { id: 'A', text: 'Dry mouth' },
          { id: 'B', text: 'Tardive dyskinesia' },
          { id: 'C', text: 'Constipation' },
          { id: 'D', text: 'Weight gain' }
        ],
        correctAnswer: 'B',
        explanation: 'Tardive dyskinesia is a serious extrapyramidal side effect of antipsychotic medications.',
        difficulty: 'medium',
        subject: 'Mental Health',
        clientNeedArea: 'Pharmacological Therapies',
        categoryId: categories.find(c => c.name === 'Mental Health')?.id || categories[3].id
      },
      {
        question: 'During labor, a patient\'s cervix is 8 cm dilated. The nurse recognizes this as which stage of labor?',
        options: [
          { id: 'A', text: 'First stage, latent phase' },
          { id: 'B', text: 'First stage, active phase' },
          { id: 'C', text: 'Second stage' },
          { id: 'D', text: 'Third stage' }
        ],
        correctAnswer: 'B',
        explanation: '8 cm dilation indicates the active phase of the first stage of labor (4-10 cm).',
        difficulty: 'easy',
        subject: 'Maternity',
        clientNeedArea: 'Health Promotion and Maintenance',
        categoryId: categories.find(c => c.name === 'Maternity')?.id || categories[4].id
      },
      {
        question: 'A nurse manager is implementing a new policy. Which leadership style promotes staff buy-in?',
        options: [
          { id: 'A', text: 'Autocratic' },
          { id: 'B', text: 'Democratic' },
          { id: 'C', text: 'Laissez-faire' },
          { id: 'D', text: 'Transactional' }
        ],
        correctAnswer: 'B',
        explanation: 'Democratic leadership involves staff in decision-making, promoting buy-in and engagement.',
        difficulty: 'easy',
        subject: 'Leadership',
        clientNeedArea: 'Management of Care',
        categoryId: categories.find(c => c.name === 'Leadership')?.id || categories[5].id
      },
      {
        question: 'A patient with type 2 diabetes is prescribed metformin. The nurse should teach the patient to monitor for which adverse effect?',
        options: [
          { id: 'A', text: 'Hypoglycemia' },
          { id: 'B', text: 'Lactic acidosis' },
          { id: 'C', text: 'Hyperglycemia' },
          { id: 'D', text: 'Ketoacidosis' }
        ],
        correctAnswer: 'B',
        explanation: 'Metformin can cause lactic acidosis, especially in patients with renal impairment or dehydration.',
        difficulty: 'medium',
        subject: 'Pharmacology',
        clientNeedArea: 'Pharmacological Therapies',
        categoryId: categories.find(c => c.name === 'Pharmacology')?.id || categories[2].id
      },
      {
        question: 'A 5-year-old child is scheduled for a tonsillectomy. Which preoperative teaching is most important?',
        options: [
          { id: 'A', text: 'Deep breathing exercises' },
          { id: 'B', text: 'Signs of bleeding' },
          { id: 'C', text: 'Pain management' },
          { id: 'D', text: 'Activity restrictions' }
        ],
        correctAnswer: 'B',
        explanation: 'Post-tonsillectomy bleeding is a serious complication. Parents must recognize signs of bleeding immediately.',
        difficulty: 'medium',
        subject: 'Pediatrics',
        clientNeedArea: 'Reduction of Risk Potential',
        categoryId: categories.find(c => c.name === 'Pediatrics')?.id || categories[1].id
      },
      {
        question: 'A patient with depression is started on fluoxetine (Prozac). The nurse should monitor for which initial side effect?',
        options: [
          { id: 'A', text: 'Weight gain' },
          { id: 'B', text: 'Increased anxiety' },
          { id: 'C', text: 'Sedation' },
          { id: 'D', text: 'Hypertension' }
        ],
        correctAnswer: 'B',
        explanation: 'Fluoxetine can initially cause increased anxiety and agitation before therapeutic effects are seen.',
        difficulty: 'medium',
        subject: 'Mental Health',
        clientNeedArea: 'Pharmacological Therapies',
        categoryId: categories.find(c => c.name === 'Mental Health')?.id || categories[3].id
      }
    ];

    let questionsCreated = 0;
    for (const qbank of qbankIds) {
      for (let i = 0; i < 20; i++) {
        const question = sampleQuestions[i % sampleQuestions.length];
        const questionText = `${question.question} (Question ${i + 1})`;
        try {
          const result = await sql`
            INSERT INTO qbank_questions (
              question_bank_id, category_id,
              question, question_type, options, correct_answer,
              explanation, difficulty, subject, client_need_area
            )
            VALUES (
              ${qbank.id},
              ${question.categoryId},
              ${questionText},
              'multiple_choice',
              ${JSON.stringify(question.options)},
              ${question.correctAnswer},
              ${question.explanation},
              ${question.difficulty},
              ${question.subject},
              ${question.clientNeedArea}
            )
            ON CONFLICT DO NOTHING
            RETURNING id
          `;
          if (result && result.length > 0) {
            questionsCreated++;
          }
        } catch (err) {
          console.error(`Error inserting question ${i + 1} for Q-Bank ${qbank.id}:`, err.message);
        }
      }
    }

    // Update total_questions count for all Q-Banks
    await sql`
      UPDATE question_banks
      SET total_questions = (
        SELECT COUNT(*)::INTEGER 
        FROM qbank_questions
        WHERE qbank_questions.question_bank_id = question_banks.id
      )
    `;

    console.log(`✅ Created ${questionsCreated} questions\n`);

    console.log('✅ Seed data complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Q-Banks: ${qbankIds.length}`);
    console.log(`   - Questions: ${questionsCreated}\n`);
    console.log('🧪 Test at: http://localhost:3000/student/qbanks\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedQBanks();


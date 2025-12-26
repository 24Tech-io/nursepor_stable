import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sqlConnection = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlConnection, { schema });

async function seedQBankQuestions() {
  console.log('🌱 Starting Q-Bank Seeding...');

  try {
    // 0. Verify Connection
    console.log('Testing database connection...');
    try {
      const result = await db
        .select({ value: sql`1` })
        .from(schema.users)
        .limit(1);
      console.log('✅ Database connected, found users table.');
    } catch (e) {
      console.log('⚠️ Connection check failed, but trying to proceed...', e);
    }

    // 1. Get or Create General Question Bank
    console.log('Fetching General Question Bank...');
    let qbank;
    const qbanks = await db
      .select()
      .from(schema.questionBanks)
      .where(sql`${schema.questionBanks.courseId} IS NULL`)
      .limit(1);

    qbank = qbanks[0];

    if (!qbank) {
      console.log('Creating new General Question Bank...');
      const newQbanks = await db
        .insert(schema.questionBanks)
        .values({
          name: 'General Nursing Q-Bank',
          description: 'Comprehensive nursing questions for NCLEX preparation',
          isActive: true,
        })
        .returning();
      qbank = newQbanks[0];
    }

    console.log(`✅ Using Question Bank: ${qbank.name} (ID: ${qbank.id})`);

    // 2. Define 10 CLASSIC Questions
    const classicQuestions = [
      {
        question: 'Which of the following is a primary symptom of hypoglycemia?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Bradycardia' },
          { id: 'b', text: 'Diaphoresis' },
          { id: 'c', text: 'Polyuria' },
          { id: 'd', text: 'Dry skin' },
        ]),
        correctAnswer: 'b',
        explanation:
          'Diaphoresis (sweating) is a common sign of hypoglycemia, along with tachycardia, tremors, and confusion.',
        difficulty: 'medium',
        subject: 'Adult Health',
        testType: 'classic',
      },
      {
        question: 'A patient with COPD should be administered oxygen at what rate?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: '2 L/min' },
          { id: 'b', text: '5 L/min' },
          { id: 'c', text: '10 L/min' },
          { id: 'd', text: '15 L/min' },
        ]),
        correctAnswer: 'a',
        explanation:
          'Patients with COPD rely on hypoxic drive; high oxygen levels can suppress breathing. 1-2 L/min is standard.',
        difficulty: 'medium',
        subject: 'Adult Health',
        testType: 'classic',
      },
      {
        question: 'Which electrolyte imbalance is associated with T-wave inversion?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Hyperkalemia' },
          { id: 'b', text: 'Hypokalemia' },
          { id: 'c', text: 'Hypercalcemia' },
          { id: 'd', text: 'Hypocalcemia' },
        ]),
        correctAnswer: 'b',
        explanation:
          'Hypokalemia often causes T-wave inversion and U waves. Hyperkalemia causes peaked T-waves.',
        difficulty: 'hard',
        subject: 'Physiology',
        testType: 'classic',
      },
      {
        question:
          'What is the priority nursing intervention for a patient with a suspected myocardial infarction?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Administer morphine' },
          { id: 'b', text: 'Administer oxygen' },
          { id: 'c', text: 'Obtain an ECG' },
          { id: 'd', text: 'Administer nitroglycerin' },
        ]),
        correctAnswer: 'b',
        explanation:
          'MONA protocol: Morphine, Oxygen, Nitroglycerin, Aspirin. Oxygen is usually the first priority to improve myocardial oxygenation.',
        difficulty: 'medium',
        subject: 'Critical Care',
        testType: 'classic',
      },
      {
        question: 'Which medication is an antidote for heparin overdose?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Vitamin K' },
          { id: 'b', text: 'Protamine Sulfate' },
          { id: 'c', text: 'Naloxone' },
          { id: 'd', text: 'Flumazenil' },
        ]),
        correctAnswer: 'b',
        explanation:
          'Protamine Sulfate reverses the effects of heparin. Vitamin K is for Warfarin.',
        difficulty: 'easy',
        subject: 'Pharmacology',
        testType: 'classic',
      },
      {
        question:
          'A patient is prescribed Lasix (furosemide). Which food should the nurse encourage?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Bananas' },
          { id: 'b', text: 'Cheese' },
          { id: 'c', text: 'Chicken' },
          { id: 'd', text: 'Rice' },
        ]),
        correctAnswer: 'a',
        explanation: 'Furosemide is a potassium-wasting diuretic. Bananas are high in potassium.',
        difficulty: 'medium',
        subject: 'Pharmacology',
        testType: 'classic',
      },
      {
        question: 'Which position is best for a patient post-lumbar puncture?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: "High Fowler's" },
          { id: 'b', text: 'Supine' },
          { id: 'c', text: 'Trendelenburg' },
          { id: 'd', text: 'Prone' },
        ]),
        correctAnswer: 'b',
        explanation: 'Supine position prevents cerebrospinal fluid leakage and headache.',
        difficulty: 'medium',
        subject: 'Fundamentals',
        testType: 'classic',
      },
      {
        question: 'What is the normal range for serum sodium?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: '135-145 mEq/L' },
          { id: 'b', text: '3.5-5.0 mEq/L' },
          { id: 'c', text: '8.5-10.5 mg/dL' },
          { id: 'd', text: '98-106 mEq/L' },
        ]),
        correctAnswer: 'a',
        explanation: 'Normal sodium is 135-145 mEq/L. 3.5-5.0 is Potassium.',
        difficulty: 'easy',
        subject: 'Lab Values',
        testType: 'classic',
      },
      {
        question: 'Which isolation precaution is used for Tuberculosis?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Contact' },
          { id: 'b', text: 'Droplet' },
          { id: 'c', text: 'Airborne' },
          { id: 'd', text: 'Standard' },
        ]),
        correctAnswer: 'c',
        explanation: 'TB requires airborne precautions (N95 mask, negative pressure room).',
        difficulty: 'medium',
        subject: 'Infection Control',
        testType: 'classic',
      },
      {
        question:
          'The nurse assesses a patient with a cast for compartment syndrome. Which is a late sign?',
        questionType: 'multiple_choice',
        options: JSON.stringify([
          { id: 'a', text: 'Pain' },
          { id: 'b', text: 'Pallor' },
          { id: 'c', text: 'Pulselessness' },
          { id: 'd', text: 'Paresthesia' },
        ]),
        correctAnswer: 'c',
        explanation:
          'Pulselessness is a late and ominous sign of compartment syndrome. Pain is usually the first sign.',
        difficulty: 'hard',
        subject: 'Med-Surg',
        testType: 'classic',
      },
    ];

    // 3. Define 10 NGN Questions (SATA, Case Study, etc.)
    const ngnQuestions = [
      {
        question: 'Select all signs of increased Intracranial Pressure (ICP) in an infant.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'High-pitched cry' },
          { id: 'b', text: 'Bulging fontanels' },
          { id: 'c', text: 'Increased head circumference' },
          { id: 'd', text: 'Sunken eyes' },
          { id: 'e', text: 'Irritability' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'c', 'e']),
        explanation:
          'Signs of increased ICP in infants include high-pitched cry, bulging fontanels, increased head circumference, and irritability. Sunken eyes are a sign of dehydration.',
        difficulty: 'hard',
        subject: 'Pediatrics',
        testType: 'ngn',
      },
      {
        question:
          'A client with heart failure is prescribed Digoxin. Which findings indicate toxicity? Select all that apply.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Bradycardia' },
          { id: 'b', text: 'Visual halos' },
          { id: 'c', text: 'Nausea/Vomiting' },
          { id: 'd', text: 'Hypertension' },
          { id: 'e', text: 'Diarrhea' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'c']),
        explanation:
          'Digoxin toxicity causes bradycardia, visual disturbances (yellow/green halos), and GI symptoms like nausea/vomiting.',
        difficulty: 'hard',
        subject: 'Pharmacology',
        testType: 'ngn',
      },
      {
        question: 'Which foods should be avoided by a patient on an MAOI? Select all that apply.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Aged cheese' },
          { id: 'b', text: 'Cured meats' },
          { id: 'c', text: 'Red wine' },
          { id: 'd', text: 'Fresh vegetables' },
          { id: 'e', text: 'Milk' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'c']),
        explanation:
          'MAOIs require a tyramine-free diet to prevent hypertensive crisis. Aged cheese, cured meats, and red wine contain high tyramine.',
        difficulty: 'medium',
        subject: 'Mental Health',
        testType: 'ngn',
      },
      {
        question:
          'Case Study: 65yo Male with COPD exacerbation. Select the appropriate interventions.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Administer Bronchodilators' },
          { id: 'b', text: 'High-flow oxygen' },
          { id: 'c', text: 'Encourage pursed-lip breathing' },
          { id: 'd', text: 'Administer Corticosteroids' },
          { id: 'e', text: 'Place in supine position' },
        ]),
        correctAnswer: JSON.stringify(['a', 'c', 'd']),
        explanation:
          'COPD management includes bronchodilators, corticosteroids, and pursed-lip breathing. High-flow O2 can be dangerous, and upright positioning is better than supine.',
        difficulty: 'hard',
        subject: 'Med-Surg',
        testType: 'ngn',
      },
      {
        question:
          'Which of the following are risk factors for Deep Vein Thrombosis (DVT)? Select all that apply.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Immobility' },
          { id: 'b', text: 'Smoking' },
          { id: 'c', text: 'Oral Contraceptives' },
          { id: 'd', text: 'Surgery' },
          { id: 'e', text: 'Low blood pressure' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'c', 'd']),
        explanation:
          "Virchow's Triad: Stasis (immobility), Endothelial injury (surgery, smoking), Hypercoagulability (OCPs). Low BP is not a direct risk factor.",
        difficulty: 'medium',
        subject: 'Med-Surg',
        testType: 'ngn',
      },
      {
        question:
          'Select the correct steps for insulin mixing (Regular and NPH). Select all that apply in order.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Inject air into NPH' },
          { id: 'b', text: 'Inject air into Regular' },
          { id: 'c', text: 'Draw up Regular' },
          { id: 'd', text: 'Draw up NPH' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'c', 'd']),
        explanation:
          'Mnemonic: RN (Regular before NPH). Air into NPH, Air into Regular, Draw Regular, Draw NPH.',
        difficulty: 'hard',
        subject: 'Pharmacology',
        testType: 'ngn',
      },
      {
        question:
          "Which assessment findings are consistent with Cushing's Syndrome? Select all that apply.",
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Moon face' },
          { id: 'b', text: 'Buffalo hump' },
          { id: 'c', text: 'Hypotension' },
          { id: 'd', text: 'Hyperglycemia' },
          { id: 'e', text: 'Weight loss' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'd']),
        explanation:
          "Cushing's (excess cortisol) causes moon face, buffalo hump, hyperglycemia, hypertension (not hypotension), and weight gain (not loss).",
        difficulty: 'medium',
        subject: 'Endocrine',
        testType: 'ngn',
      },
      {
        question:
          'Select the appropriate nursing actions for a patient having a tonic-clonic seizure. Select all that apply.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Turn patient to side' },
          { id: 'b', text: 'Insert tongue blade' },
          { id: 'c', text: 'Loosen restrictive clothing' },
          { id: 'd', text: 'Restrain limbs' },
          { id: 'e', text: 'Time the seizure' },
        ]),
        correctAnswer: JSON.stringify(['a', 'c', 'e']),
        explanation:
          'Safety first: Turn to side (aspiration), loosen clothing, time it. NEVER insert objects or restrain.',
        difficulty: 'medium',
        subject: 'Neurology',
        testType: 'ngn',
      },
      {
        question: 'Which vaccines are contraindicated in pregnancy? Select all that apply.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'MMR' },
          { id: 'b', text: 'Varicella' },
          { id: 'c', text: 'Influenza (Inactivated)' },
          { id: 'd', text: 'Tdap' },
          { id: 'e', text: 'Live Influenza (Nasal)' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'e']),
        explanation:
          'Live vaccines (MMR, Varicella, Nasal Flu) are contraindicated. Inactivated Flu and Tdap are recommended.',
        difficulty: 'hard',
        subject: 'Maternity',
        testType: 'ngn',
      },
      {
        question: 'Select the signs of Lithium toxicity. Select all that apply.',
        questionType: 'sata',
        options: JSON.stringify([
          { id: 'a', text: 'Coarse tremors' },
          { id: 'b', text: 'Confusion' },
          { id: 'c', text: 'Polyuria' },
          { id: 'd', text: 'Fine tremors' },
          { id: 'e', text: 'Ataxia' },
        ]),
        correctAnswer: JSON.stringify(['a', 'b', 'c', 'e']),
        explanation:
          'Fine tremors are a side effect. Coarse tremors, confusion, ataxia, and polyuria indicate toxicity (>1.5 mEq/L).',
        difficulty: 'hard',
        subject: 'Mental Health',
        testType: 'ngn',
      },
    ];

    // 4. Insert Questions
    console.log('Inserting CLASSIC questions...');
    for (const q of classicQuestions) {
      await db.insert(schema.qbankQuestions).values({
        questionBankId: qbank.id,
        ...q,
      });
    }

    console.log('Inserting NGN questions...');
    for (const q of ngnQuestions) {
      await db.insert(schema.qbankQuestions).values({
        questionBankId: qbank.id,
        ...q,
      });
    }

    console.log('✅ Successfully seeded 20 questions (10 CLASSIC, 10 NGN)');
  } catch (error) {
    console.error('❌ Error seeding Q-Bank:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

seedQBankQuestions();

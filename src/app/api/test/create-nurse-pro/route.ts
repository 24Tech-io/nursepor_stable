import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import {
  courses,
  questionBanks,
  qbankQuestions,
  users,
  qbankTests,
  qbankQuestionAttempts,
  qbankQuestionStatistics,
} from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';

// Prevent static generation - this route requires database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Comprehensive test endpoint to create Nurse Pro course with full Q-Bank data
 * Includes: Course, Question Bank, Questions, Tests, Attempts, and Statistics
 * No authentication required - for testing only
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    let course;
    let questionBank;

    // Step 1: Create or get course
    const existing = await db
      .select()
      .from(courses)
      .where(or(eq(courses.title, 'Nurse Pro'), eq(courses.title, 'Q-Bank')));

    if (existing.length > 0) {
      course = existing[0];
      await db
        .update(courses)
        .set({
          title: 'Nurse Pro',
          pricing: 0,
          status: 'published',
        })
        .where(eq(courses.id, course.id));
    } else {
      [course] = await db
        .insert(courses)
        .values({
          title: 'Nurse Pro',
          description:
            'Comprehensive nursing education platform with Q-Bank, live reviews, notes, and cheat sheets.',
          instructor: 'Nurse Pro Academy',
          thumbnail: null,
          pricing: 0,
          status: 'published',
          isRequestable: true,
          isDefaultUnlocked: false,
        })
        .returning();
    }

    // Step 2: Create or get question bank
    const existingQBank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, course.id));

    if (existingQBank.length > 0) {
      questionBank = existingQBank[0];
    } else {
      [questionBank] = await db
        .insert(questionBanks)
        .values({
          courseId: course.id,
          name: 'Nurse Pro Q-Bank',
          description: 'Comprehensive question bank for nursing exam preparation',
          isActive: true,
        })
        .returning();
    }

    // Step 3: Check if questions already exist
    const existingQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, questionBank.id))
      .limit(5);

    let questionsCreated = 0;

    if (existingQuestions.length === 0) {
      // Create comprehensive test questions
      const questions = generateTestQuestions(questionBank.id);

      for (const question of questions) {
        await db.insert(qbankQuestions).values(question);
        questionsCreated++;
      }
    }

    // Step 4: Get student users for test data
    const studentUsers = await db.select().from(users).where(eq(users.role, 'student')).limit(3);

    let testsCreated = 0;
    let attemptsCreated = 0;
    let statsCreated = 0;

    if (studentUsers.length > 0 && questionsCreated > 0) {
      // Get all questions for test creation
      const allQuestions = await db
        .select()
        .from(qbankQuestions)
        .where(eq(qbankQuestions.questionBankId, questionBank.id))
        .limit(100);

      // Create sample tests for each student
      for (const student of studentUsers) {
        // Create 2 tests per student (1 completed, 1 pending)
        const testData = [
          {
            questionBankId: questionBank.id,
            userId: student.id,
            testId: `TEST-${Date.now()}-${student.id}-1`,
            title: 'Practice Test 1',
            mode: 'tutorial',
            testType: 'mixed',
            organization: 'subject',
            questionIds: JSON.stringify(allQuestions.slice(0, 20).map((q) => q.id)),
            totalQuestions: 20,
            timeLimit: null,
            status: 'completed',
            score: 15,
            maxScore: 20,
            percentage: 75.0,
            startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          },
          {
            questionBankId: questionBank.id,
            userId: student.id,
            testId: `TEST-${Date.now()}-${student.id}-2`,
            title: 'Practice Test 2',
            mode: 'timed',
            testType: 'classic',
            organization: 'subject',
            questionIds: JSON.stringify(allQuestions.slice(20, 40).map((q) => q.id)),
            totalQuestions: 20,
            timeLimit: 60,
            status: 'pending',
            score: null,
            maxScore: 20,
            percentage: null,
            startedAt: null,
            completedAt: null,
          },
        ];

        for (const test of testData) {
          const [createdTest] = await db.insert(qbankTests).values(test).returning();
          testsCreated++;

          // Create attempts for completed tests
          if (test.status === 'completed') {
            const testQuestions = allQuestions.slice(0, 20);
            for (let i = 0; i < testQuestions.length; i++) {
              const question = testQuestions[i];
              const isCorrect = Math.random() > 0.25; // 75% correct rate

              await db.insert(qbankQuestionAttempts).values({
                testId: createdTest.id,
                questionId: question.id,
                userId: student.id,
                userAnswer: isCorrect ? question.correctAnswer : 'Wrong answer',
                isCorrect,
                isOmitted: false,
                isPartiallyCorrect: false,
                pointsEarned: isCorrect ? question.points : 0,
                timeSpent: Math.floor(Math.random() * 120) + 30,
              });
              attemptsCreated++;

              // Create or update statistics
              const existingStat = await db
                .select()
                .from(qbankQuestionStatistics)
                .where(
                  and(
                    eq(qbankQuestionStatistics.userId, student.id),
                    eq(qbankQuestionStatistics.questionId, question.id)
                  )
                )
                .limit(1);

              if (existingStat.length === 0) {
                await db.insert(qbankQuestionStatistics).values({
                  userId: student.id,
                  questionId: question.id,
                  questionBankId: questionBank.id,
                  timesAttempted: 1,
                  timesCorrect: isCorrect ? 1 : 0,
                  timesIncorrect: isCorrect ? 0 : 1,
                  timesOmitted: 0,
                  timesCorrectOnReattempt: 0,
                  confidenceLevel: isCorrect ? 'high_confidence' : 'low_confidence',
                  lastAttemptedAt: new Date(),
                });
                statsCreated++;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Nurse Pro course and Q-Bank data created successfully!',
      data: {
        course: {
          id: course.id.toString(),
          title: course.title,
          pricing: course.pricing,
          status: course.status,
        },
        questionBank: {
          id: questionBank.id.toString(),
          name: questionBank.name,
        },
        questionsCreated,
        testsCreated,
        attemptsCreated,
        statsCreated,
        studentsProcessed: studentUsers.length,
      },
    });
  } catch (error: any) {
    console.error('Test create course error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create course and test data',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

function generateTestQuestions(questionBankId: number) {
  const subjects = [
    'Adult Health',
    'Child Health',
    'Mental Health',
    'Pharmacology',
    'Fundamentals',
  ];
  const lessons = ['Cardiovascular', 'Respiratory', 'Endocrine', 'Gastrointestinal', 'Neurologic'];
  const clientNeeds = [
    'Physiological Adaptation',
    'Reduction of Risk Potential',
    'Pharmacological and Parenteral Therapies',
  ];
  const subcategories = [
    'Alterations in Body Systems',
    'Illness Management',
    'Medical Emergencies',
  ];

  const questions = [
    // Multiple Choice Questions
    {
      questionBankId,
      question:
        'A nurse is caring for a client with heart failure. Which assessment finding indicates fluid overload?',
      questionType: 'multiple_choice',
      options: JSON.stringify([
        'Decreased urine output',
        'Increased blood pressure',
        'Crackles in lungs',
        'All of the above',
      ]),
      correctAnswer: 'All of the above',
      explanation:
        'Fluid overload in heart failure manifests as decreased urine output, increased blood pressure, and crackles in lungs due to pulmonary congestion.',
      subject: 'Adult Health',
      lesson: 'Cardiovascular',
      clientNeedArea: 'Physiological Adaptation',
      subcategory: 'Alterations in Body Systems',
      testType: 'classic',
      difficulty: 'medium',
      points: 1,
    },
    {
      questionBankId,
      question:
        'A client with diabetes mellitus is prescribed insulin. What is the priority nursing action?',
      questionType: 'multiple_choice',
      options: JSON.stringify([
        'Monitor blood glucose levels',
        'Assess for hypoglycemia',
        'Teach injection technique',
        'All are important',
      ]),
      correctAnswer: 'All are important',
      explanation:
        'All actions are critical when a client is prescribed insulin to ensure safe administration and prevent complications.',
      subject: 'Adult Health',
      lesson: 'Endocrine',
      clientNeedArea: 'Pharmacological and Parenteral Therapies',
      subcategory: 'Medical Emergencies',
      testType: 'classic',
      difficulty: 'easy',
      points: 1,
    },
    {
      questionBankId,
      question: 'Which vital sign change indicates early hypovolemic shock?',
      questionType: 'multiple_choice',
      options: JSON.stringify([
        'Decreased heart rate',
        'Increased blood pressure',
        'Tachycardia',
        'Bradypnea',
      ]),
      correctAnswer: 'Tachycardia',
      explanation:
        'Tachycardia is an early compensatory mechanism in hypovolemic shock as the body attempts to maintain cardiac output.',
      subject: 'Adult Health',
      lesson: 'Cardiovascular',
      clientNeedArea: 'Physiological Adaptation',
      subcategory: 'Medical Emergencies',
      testType: 'classic',
      difficulty: 'medium',
      points: 1,
    },
    {
      questionBankId,
      question:
        'A client is receiving oxygen therapy. What is the maximum safe oxygen flow rate via nasal cannula?',
      questionType: 'multiple_choice',
      options: JSON.stringify(['2 L/min', '4 L/min', '6 L/min', '10 L/min']),
      correctAnswer: '6 L/min',
      explanation:
        'The maximum recommended oxygen flow rate via nasal cannula is 6 L/min to prevent drying of mucous membranes.',
      subject: 'Adult Health',
      lesson: 'Respiratory',
      clientNeedArea: 'Reduction of Risk Potential',
      subcategory: 'Alterations in Body Systems',
      testType: 'classic',
      difficulty: 'easy',
      points: 1,
    },
    {
      questionBankId,
      question: 'Which lab value indicates therapeutic range for warfarin (Coumadin)?',
      questionType: 'multiple_choice',
      options: JSON.stringify(['INR 1.0-1.5', 'INR 2.0-3.0', 'INR 4.0-5.0', 'INR 6.0-7.0']),
      correctAnswer: 'INR 2.0-3.0',
      explanation: 'The therapeutic INR range for most indications of warfarin therapy is 2.0-3.0.',
      subject: 'Pharmacology',
      lesson: 'Cardiovascular',
      clientNeedArea: 'Pharmacological and Parenteral Therapies',
      subcategory: 'Illness Management',
      testType: 'classic',
      difficulty: 'medium',
      points: 1,
    },
    // SATA Questions
    {
      questionBankId,
      question: 'Which of the following are signs of hypoglycemia? (Select all that apply)',
      questionType: 'sata',
      options: JSON.stringify(['Sweating', 'Tremors', 'Confusion', 'Dry skin', 'Fruity breath']),
      correctAnswer: JSON.stringify(['Sweating', 'Tremors', 'Confusion']),
      explanation:
        'Hypoglycemia presents with sweating, tremors, and confusion. Dry skin and fruity breath are signs of hyperglycemia.',
      subject: 'Adult Health',
      lesson: 'Endocrine',
      clientNeedArea: 'Physiological Adaptation',
      subcategory: 'Alterations in Body Systems',
      testType: 'ngn',
      difficulty: 'hard',
      points: 1,
    },
    {
      questionBankId,
      question:
        'What are appropriate interventions for a client experiencing chest pain? (Select all that apply)',
      questionType: 'sata',
      options: JSON.stringify([
        'Administer oxygen',
        'Place in supine position',
        'Obtain ECG',
        'Administer nitroglycerin',
        'Encourage ambulation',
      ]),
      correctAnswer: JSON.stringify([
        'Administer oxygen',
        'Obtain ECG',
        'Administer nitroglycerin',
      ]),
      explanation:
        'For chest pain, administer oxygen, obtain ECG, and give nitroglycerin as ordered. The client should be in semi-Fowler position, not supine, and should rest, not ambulate.',
      subject: 'Adult Health',
      lesson: 'Cardiovascular',
      clientNeedArea: 'Physiological Adaptation',
      subcategory: 'Medical Emergencies',
      testType: 'ngn',
      difficulty: 'hard',
      points: 1,
    },
    {
      questionBankId,
      question: 'Which findings indicate respiratory distress in a child? (Select all that apply)',
      questionType: 'sata',
      options: JSON.stringify([
        'Nasal flaring',
        'Bradypnea',
        'Retractions',
        'Grunting',
        'Pink skin color',
      ]),
      correctAnswer: JSON.stringify(['Nasal flaring', 'Retractions', 'Grunting']),
      explanation:
        'Nasal flaring, retractions, and grunting are signs of respiratory distress. Bradypnea and pink skin color are normal findings.',
      subject: 'Child Health',
      lesson: 'Respiratory',
      clientNeedArea: 'Physiological Adaptation',
      subcategory: 'Alterations in Body Systems',
      testType: 'ngn',
      difficulty: 'medium',
      points: 1,
    },
    {
      questionBankId,
      question: 'What are risk factors for pressure ulcer development? (Select all that apply)',
      questionType: 'sata',
      options: JSON.stringify([
        'Immobility',
        'Adequate nutrition',
        'Moisture',
        'Friction',
        'Young age',
      ]),
      correctAnswer: JSON.stringify(['Immobility', 'Moisture', 'Friction']),
      explanation:
        'Immobility, moisture, and friction increase pressure ulcer risk. Adequate nutrition prevents ulcers, and young age is not a risk factor.',
      subject: 'Fundamentals',
      lesson: 'Integumentary',
      clientNeedArea: 'Reduction of Risk Potential',
      subcategory: 'Alterations in Body Systems',
      testType: 'classic',
      difficulty: 'easy',
      points: 1,
    },
    {
      questionBankId,
      question: 'Which interventions promote patient safety? (Select all that apply)',
      questionType: 'sata',
      options: JSON.stringify([
        'Use two patient identifiers',
        'Skip hand hygiene if wearing gloves',
        'Keep bed in lowest position',
        'Use side rails appropriately',
        'Leave call light within reach',
      ]),
      correctAnswer: JSON.stringify([
        'Use two patient identifiers',
        'Keep bed in lowest position',
        'Use side rails appropriately',
        'Leave call light within reach',
      ]),
      explanation:
        'All options except skipping hand hygiene promote safety. Hand hygiene is required even when wearing gloves.',
      subject: 'Fundamentals',
      lesson: 'Safety',
      clientNeedArea: 'Reduction of Risk Potential',
      subcategory: 'Illness Management',
      testType: 'classic',
      difficulty: 'easy',
      points: 1,
    },
    // Add 40 more diverse questions
    ...Array.from({ length: 40 }, (_, i) => ({
      questionBankId,
      question: `Test question ${i + 11}: A nurse is assessing a client. What is the most appropriate action?`,
      questionType: i % 3 === 0 ? 'sata' : 'multiple_choice',
      options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
      correctAnswer: i % 3 === 0 ? JSON.stringify(['Option A', 'Option B']) : 'Option A',
      explanation: `This is a test explanation for question ${i + 11}. The correct answer demonstrates proper nursing judgment and prioritization.`,
      subject: subjects[i % subjects.length],
      lesson: lessons[i % lessons.length],
      clientNeedArea: clientNeeds[i % clientNeeds.length],
      subcategory: subcategories[i % subcategories.length],
      testType: i % 2 === 0 ? 'classic' : 'ngn',
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      points: 1,
    })),
  ];

  return questions;
}

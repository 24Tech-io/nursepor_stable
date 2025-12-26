import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, questionBanks, qbankQuestions, qbankTests, qbankQuestionAttempts, qbankQuestionStatistics, studentProgress, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: adminUser } = authResult;

    const db = await getDatabaseWithRetry();

    // Find or create the Q-Bank course
    let course = await db
      .select()
      .from(courses)
      .where(eq(courses.title, 'Q-Bank'))
      .limit(1);

    if (course.length === 0) {
      [course] = await db
        .insert(courses)
        .values({
          title: 'Q-Bank',
          description: 'Comprehensive nursing education platform with Q-Bank, live reviews, notes, and cheat sheets. Master nursing concepts and prepare for your exams.',
          instructor: 'Nurse Pro Academy',
          thumbnail: null,
          pricing: 0,
          status: 'published',
          isRequestable: true,
          isDefaultUnlocked: false,
        })
        .returning();
    } else {
      course = [course[0]];
    }

    const courseId = course[0].id;

    // Find or create question bank
    let questionBank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, courseId))
      .limit(1);

    if (questionBank.length === 0) {
      [questionBank] = await db
        .insert(questionBanks)
        .values({
          courseId: courseId,
          name: 'Nurse Pro Q-Bank',
          description: 'Comprehensive question bank for nursing exam preparation',
          isActive: true,
        })
        .returning();
    } else {
      questionBank = [questionBank[0]];
    }

    const qbankId = questionBank[0].id;

    // Check if demo data already exists
    const existingQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId))
      .limit(1);

    if (existingQuestions.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Demo data already exists. Use DELETE to reset.',
      });
    }

    // Get all students to create statistics for
    const allStudents = await db
      .select()
      .from(users)
      .where(eq(users.role, 'student'))
      .limit(10);

    // Define subjects, lessons, client need areas, and subcategories
    const subjects = [
      'Adult Health', 'Child Health', 'Critical Care', 'Fundamentals',
      'Leadership & Management', 'Maternal & Newborn Health', 'Mental Health', 'Pharmacology', 'Nutrition'
    ];

    const lessons = [
      'Cardiovascular', 'Endocrine', 'Gastrointestinal', 'Hematological/Oncological',
      'Immune', 'Infectious Disease', 'Integumentary', 'Musculoskeletal', 'Neurologic',
      'Reproductive', 'Respiratory', 'Urinary/Renal/Fluid and Electrolytes', 'Visual/Auditory',
      'Growth & Development', 'Critical Care Concepts', 'Basic Care & Comfort',
      'Safety / Infection Control', 'Skills/Procedures', 'Assignment/Delegation',
      'Ethical/Legal', 'Management Concepts', 'Prioritization', 'Antepartum',
      'Labor/Delivery', 'Newborn', 'Postpartum', 'Mental Health', 'Analgesics',
      'Psychiatric Medications', 'Reproductive and Maternity', 'Substance Abuse and other dependencies',
      'Abuse/Neglect', 'Cultural, Spiritual, and Religion Concepts', 'Dosage Calculation',
      'Environmental Emergencies', 'Perioperative Care', 'Medication Administration',
      'Blood and Blood Products', 'Acid-Base Imbalances', 'Immunizations', 'Nutrition'
    ];

    const clientNeedAreas = [
      'Physiological Adaptation', 'Reduction of Risk Potential', 'Health Promotion and Maintenance',
      'Basic Care and Comfort', 'Safety & Infection Control', 'Psychosocial Integrity',
      'Pharmacological and Parenteral Therapies', 'Management of Care'
    ];

    const subcategories = [
      'Alterations in Body Systems', 'F&E Imbalances', 'Hemodynamics', 'Illness Management',
      'Medical Emergencies', 'Pathophysiology', 'Unexpected Responses to Therapies',
      'Changes/Abnormalities in Vital Signs', 'Diagnostic Tests', 'Lab Values',
      'Potential for Alterations in Body Systems', 'Expected Actions/Outcomes',
      'Medication Administration', 'Parenteral/IV Therapies', 'Pharmacological Pain Management'
    ];

    // Generate comprehensive question data
    const questionTemplates = [
      {
        question: 'A nurse is caring for a client with heart failure. Which assessment finding indicates the client is experiencing fluid overload?',
        options: ['Decreased urine output', 'Increased blood pressure', 'Crackles in the lungs', 'All of the above'],
        correctAnswer: 'All of the above',
        explanation: 'Fluid overload in heart failure can manifest as decreased urine output, increased blood pressure, and crackles in the lungs due to pulmonary congestion.',
        difficulty: 'medium',
      },
      {
        question: 'Which of the following are signs of hypovolemic shock? (Select all that apply)',
        options: ['Rapid, weak pulse', 'Decreased blood pressure', 'Cool, clammy skin', 'Increased urine output', 'Confusion'],
        correctAnswer: ['Rapid, weak pulse', 'Decreased blood pressure', 'Cool, clammy skin', 'Confusion'],
        explanation: 'Hypovolemic shock presents with rapid weak pulse, decreased BP, cool clammy skin, and confusion. Urine output decreases, not increases.',
        difficulty: 'hard',
        questionType: 'sata',
      },
      {
        question: 'A client with diabetes mellitus is prescribed insulin. The nurse should monitor for which potential complication?',
        options: ['Hyperglycemia', 'Hypoglycemia', 'Hyperkalemia', 'Hypokalemia'],
        correctAnswer: 'Hypoglycemia',
        explanation: 'Insulin administration can cause hypoglycemia if the dose is too high or if the client does not eat adequately.',
        difficulty: 'easy',
      },
      {
        question: 'The nurse is assessing a client with chronic obstructive pulmonary disease (COPD). Which finding is most indicative of respiratory distress?',
        options: ['Barrel chest', 'Clubbing of fingers', 'Use of accessory muscles', 'Decreased breath sounds'],
        correctAnswer: 'Use of accessory muscles',
        explanation: 'Use of accessory muscles indicates the client is working harder to breathe, which is a sign of respiratory distress.',
        difficulty: 'medium',
      },
      {
        question: 'A nurse is preparing to administer a blood transfusion. Which action should the nurse take first?',
        options: ['Verify the blood type with another nurse', 'Check the client\'s vital signs', 'Obtain informed consent', 'Start an IV line'],
        correctAnswer: 'Verify the blood type with another nurse',
        explanation: 'Blood type verification with another nurse is a critical safety measure that must be done before any blood product administration.',
        difficulty: 'medium',
      },
    ];

    const questions: any[] = [];
    let questionId = 1;

    // Generate questions for Classic (2010 questions)
    for (let i = 0; i < 2010; i++) {
      const template = questionTemplates[i % questionTemplates.length];
      const subject = subjects[i % subjects.length];
      const lesson = lessons[i % lessons.length];
      const clientNeed = clientNeedAreas[i % clientNeedAreas.length];
      const subcategory = subcategories[i % subcategories.length];
      
      const isSATA = i % 20 === 0; // 5% SATA questions
      const questionType = isSATA ? 'sata' : 'multiple_choice';
      let correctAnswer: string;
      if (isSATA) {
        correctAnswer = Array.isArray(template.correctAnswer) 
          ? JSON.stringify(template.correctAnswer)
          : JSON.stringify([template.correctAnswer]);
      } else {
        correctAnswer = Array.isArray(template.correctAnswer)
          ? template.correctAnswer[0]
          : (template.correctAnswer as string);
      }

      questions.push({
        questionBankId: qbankId,
        question: `${template.question} (Question ${i + 1})`,
        questionType: questionType,
        options: JSON.stringify(template.options),
        correctAnswer: correctAnswer,
        explanation: template.explanation,
        subject: subject,
        lesson: lesson,
        clientNeedArea: clientNeed,
        subcategory: subcategory,
        testType: 'classic',
        difficulty: template.difficulty,
        points: 1,
      });
    }

    // Generate questions for NGN (1171 questions)
    for (let i = 0; i < 1171; i++) {
      const template = questionTemplates[i % questionTemplates.length];
      const subject = subjects[i % subjects.length];
      const lesson = lessons[i % lessons.length];
      const clientNeed = clientNeedAreas[i % clientNeedAreas.length];
      const subcategory = subcategories[i % subcategories.length];
      
      const isUnfolding = i % 20 === 0; // 5% unfolding case studies
      const isStandalone = i % 10 === 0 && !isUnfolding; // 10% standalone case studies
      const isSATA = i % 8 === 0 && !isUnfolding && !isStandalone; // SATA questions
      
      let questionType = 'multiple_choice';
      if (isUnfolding) questionType = 'unfolding_ngn';
      else if (isStandalone) questionType = 'ngn_case_study';
      else if (isSATA) questionType = 'sata';

      let correctAnswer: string;
      if (isSATA) {
        correctAnswer = Array.isArray(template.correctAnswer) 
          ? JSON.stringify(template.correctAnswer)
          : JSON.stringify([template.correctAnswer]);
      } else {
        correctAnswer = Array.isArray(template.correctAnswer)
          ? template.correctAnswer[0]
          : (template.correctAnswer as string);
      }

      questions.push({
        questionBankId: qbankId,
        question: `NGN: ${template.question} (Question ${i + 1})`,
        questionType: questionType,
        options: JSON.stringify(template.options),
        correctAnswer: correctAnswer,
        explanation: template.explanation,
        subject: subject,
        lesson: lesson,
        clientNeedArea: clientNeed,
        subcategory: subcategory,
        testType: 'ngn',
        difficulty: template.difficulty,
        points: 1,
      });
    }

    // Insert all questions in batches
    const batchSize = 100;
    for (let i = 0; i < questions.length; i += batchSize) {
      await db.insert(qbankQuestions).values(questions.slice(i, i + batchSize));
    }

    // Get the inserted questions for creating statistics
    const allInsertedQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId));

    // Create statistics and test attempts for each student
    for (const student of allStudents) {
      // Enroll student in course if not already enrolled
      const enrollment = await db
        .select()
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, student.id),
            eq(studentProgress.courseId, courseId)
          )
        )
        .limit(1);

      if (enrollment.length === 0) {
        await db.insert(studentProgress).values({
          studentId: student.id,
          courseId: courseId,
          completedChapters: '[]',
          watchedVideos: '[]',
          quizAttempts: '[]',
          totalProgress: 0,
        });
      }

      // Create question statistics
      const statsToInsert: any[] = [];
      const attemptsToInsert: any[] = [];
      
      // Use 1594 questions (79% of 2010)
      const usedQuestionIds = allInsertedQuestions.slice(0, 1594).map(q => q.id);
      const unusedQuestionIds = allInsertedQuestions.slice(1594, 2010).map(q => q.id);

      // Create statistics for used questions
      for (const questionId of usedQuestionIds) {
        const question = allInsertedQuestions.find(q => q.id === questionId);
        if (!question) continue;

        const timesAttempted = Math.floor(Math.random() * 5) + 1;
        const timesCorrect = Math.floor(timesAttempted * (0.4 + Math.random() * 0.2)); // 40-60% correct
        const timesIncorrect = timesAttempted - timesCorrect;
        const timesOmitted = Math.random() < 0.1 ? 1 : 0;
        const timesCorrectOnReattempt = timesIncorrect > 0 && Math.random() < 0.1 ? 1 : 0;

        let confidenceLevel = 'pending_review';
        if (timesCorrectOnReattempt > 0) confidenceLevel = 'correct_on_reattempt';
        else if (timesCorrect / timesAttempted > 0.7) confidenceLevel = 'high_confidence';
        else if (timesCorrect / timesAttempted < 0.5) confidenceLevel = 'low_confidence';

        statsToInsert.push({
          userId: student.id,
          questionId: questionId,
          questionBankId: qbankId,
          timesAttempted: timesAttempted,
          timesCorrect: timesCorrect,
          timesIncorrect: timesIncorrect,
          timesOmitted: timesOmitted,
          timesCorrectOnReattempt: timesCorrectOnReattempt,
          confidenceLevel: confidenceLevel,
          lastAttemptedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        });
      }

      // Insert statistics in batches
      for (let i = 0; i < statsToInsert.length; i += batchSize) {
        try {
          await db.insert(qbankQuestionStatistics).values(statsToInsert.slice(i, i + batchSize));
        } catch (error) {
          // Skip duplicates
          logger.info('Skipping duplicate statistics');
        }
      }

      // Create sample tests
      const testModes = ['tutorial', 'cat', 'timed', 'readiness_assessment'];
      const testTypes = ['classic', 'ngn', 'mixed'];
      
      // Create 10 pending tests
      for (let i = 0; i < 10; i++) {
        const mode = testModes[Math.floor(Math.random() * testModes.length)];
        const testType = testTypes[Math.floor(Math.random() * testTypes.length)];
        const questionCount = Math.floor(Math.random() * 50) + 20;
        
        const selectedQuestions = allInsertedQuestions
          .filter(q => testType === 'mixed' || q.testType === testType)
          .slice(0, questionCount)
          .map(q => q.id);

        const testId = `TEST${Date.now()}${i}`;
        
        await db.insert(qbankTests).values({
          questionBankId: qbankId,
          userId: student.id,
          testId: testId,
          title: `${testType.toUpperCase()} Test ${i + 1}`,
          mode: mode,
          testType: testType,
          organization: Math.random() > 0.5 ? 'subject' : 'client_need',
          questionIds: JSON.stringify(selectedQuestions),
          totalQuestions: questionCount,
          timeLimit: mode === 'timed' ? 60 : null,
          status: 'pending',
          createdAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        });
      }

      // Create 28 completed tests
      for (let i = 0; i < 28; i++) {
        const mode = testModes[Math.floor(Math.random() * testModes.length)];
        const testType = testTypes[Math.floor(Math.random() * testTypes.length)];
        const questionCount = Math.floor(Math.random() * 50) + 20;
        
        const selectedQuestions = allInsertedQuestions
          .filter(q => testType === 'mixed' || q.testType === testType)
          .slice(0, questionCount)
          .map(q => q.id);

        const testId = `TEST${Date.now()}${i + 1000}`;
        const score = Math.floor(Math.random() * questionCount);
        const percentage = (score / questionCount) * 100;
        
        const test = await db.insert(qbankTests).values({
          questionBankId: qbankId,
          userId: student.id,
          testId: testId,
          title: `${testType.toUpperCase()} Test ${i + 1}`,
          mode: mode,
          testType: testType,
          organization: Math.random() > 0.5 ? 'subject' : 'client_need',
          questionIds: JSON.stringify(selectedQuestions),
          totalQuestions: questionCount,
          timeLimit: mode === 'timed' ? 60 : null,
          status: 'completed',
          score: score,
          maxScore: questionCount,
          percentage: percentage,
          startedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        }).returning();

        // Create attempts for completed tests
        if (test.length > 0) {
          const testRecord = test[0];
          const questionIdsArray = JSON.parse(testRecord.questionIds as string);
          
          for (const qId of questionIdsArray.slice(0, Math.min(10, questionIdsArray.length))) {
            const question = allInsertedQuestions.find(q => q.id === qId);
            if (!question) continue;

            const isCorrect = Math.random() > 0.4; // 60% correct
            let userAnswer: string;
            if (isCorrect) {
              userAnswer = question.correctAnswer;
            } else {
              // For incorrect answer, pick a wrong option
              try {
                const optionsArray = JSON.parse(question.options);
                if (question.questionType === 'sata') {
                  // For SATA, pick a subset that doesn't match
                  userAnswer = JSON.stringify([optionsArray[0]]);
                } else {
                  userAnswer = optionsArray[0];
                }
              } catch {
                userAnswer = 'Incorrect answer';
              }
            }

            await db.insert(qbankQuestionAttempts).values({
              testId: testRecord.id,
              questionId: qId,
              userId: student.id,
              userAnswer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
              isCorrect: isCorrect,
              isOmitted: false,
              isPartiallyCorrect: false,
              pointsEarned: isCorrect ? 1 : 0,
              timeSpent: Math.floor(Math.random() * 120) + 30,
              attemptedAt: testRecord.completedAt || new Date(),
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo Q-Bank data created successfully',
      stats: {
        questions: questions.length,
        students: allStudents.length,
        tests: allStudents.length * 38, // 10 pending + 28 completed per student
      },
    });
  } catch (error: any) {
    logger.error('Demo data creation error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create demo data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


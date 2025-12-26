import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, questionBanks, qbankQuestions, studentProgress, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Use requireAdmin helper which properly validates session
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user: decoded } = authResult;

    const db = await getDatabaseWithRetry();

    // Check if course already exists (check both "Nurse Pro" and "Q-Bank")
    let existingCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.title, 'Nurse Pro'))
      .limit(1);
    
    if (existingCourse.length === 0) {
      existingCourse = await db
        .select()
        .from(courses)
        .where(eq(courses.title, 'Q-Bank'))
        .limit(1);
    }

    let course;
    if (existingCourse.length > 0) {
      course = existingCourse[0];
    } else {
      // Create the course
      [course] = await db
        .insert(courses)
        .values({
          title: 'Nurse Pro',
          description: 'Comprehensive nursing education platform with Q-Bank, live reviews, notes, and cheat sheets. Master nursing concepts and prepare for your exams.',
          instructor: 'Nurse Pro Academy',
          thumbnail: null,
          pricing: 0, // Free enrollment
          status: 'published',
          isRequestable: true,
          isDefaultUnlocked: false, // Students need to "purchase" it for free
        })
        .returning();
    }

    // Check if question bank exists
    const existingQBank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, course.id))
      .limit(1);

    let questionBank;
    if (existingQBank.length > 0) {
      questionBank = existingQBank[0];
    } else {
      // Create question bank
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

    // Check if user is enrolled
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, decoded.id),
          eq(studentProgress.courseId, course.id)
        )
      )
      .limit(1);

    // Don't auto-enroll - let students "purchase" for free
    // Enrollment will happen when they click "Enroll for Free"

    // Add some sample questions if none exist
    const existingQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, questionBank.id))
      .limit(1);

    if (existingQuestions.length === 0) {
      // Add sample questions
      const sampleQuestions = [
        {
          questionBankId: questionBank.id,
          question: 'A nurse is caring for a client with heart failure. Which assessment finding indicates the client is experiencing fluid overload?',
          questionType: 'multiple_choice',
          options: JSON.stringify([
            'Decreased urine output',
            'Increased blood pressure',
            'Crackles in the lungs',
            'All of the above'
          ]),
          correctAnswer: 'All of the above',
          explanation: 'Fluid overload in heart failure can manifest as decreased urine output, increased blood pressure, and crackles in the lungs due to pulmonary congestion.',
          subject: 'Adult Health',
          lesson: 'Cardiovascular',
          clientNeedArea: 'Physiological Adaptation',
          subcategory: 'Alterations in Body Systems',
          testType: 'classic',
          difficulty: 'medium',
          points: 1,
        },
        {
          questionBankId: questionBank.id,
          question: 'Which of the following are signs of hypovolemic shock? (Select all that apply)',
          questionType: 'sata',
          options: JSON.stringify([
            'Rapid, weak pulse',
            'Decreased blood pressure',
            'Cool, clammy skin',
            'Increased urine output',
            'Confusion'
          ]),
          correctAnswer: JSON.stringify(['Rapid, weak pulse', 'Decreased blood pressure', 'Cool, clammy skin', 'Confusion']),
          explanation: 'Hypovolemic shock presents with rapid weak pulse, decreased BP, cool clammy skin, and confusion. Urine output decreases, not increases.',
          subject: 'Adult Health',
          lesson: 'Cardiovascular',
          clientNeedArea: 'Physiological Adaptation',
          subcategory: 'Alterations in Body Systems',
          testType: 'ngn',
          difficulty: 'hard',
          points: 1,
        },
        {
          questionBankId: questionBank.id,
          question: 'A client with diabetes mellitus is prescribed insulin. The nurse should monitor for which potential complication?',
          questionType: 'multiple_choice',
          options: JSON.stringify([
            'Hyperglycemia',
            'Hypoglycemia',
            'Hyperkalemia',
            'Hypokalemia'
          ]),
          correctAnswer: 'Hypoglycemia',
          explanation: 'Insulin administration can cause hypoglycemia if the dose is too high or if the client does not eat adequately.',
          subject: 'Adult Health',
          lesson: 'Endocrine',
          clientNeedArea: 'Pharmacological and Parenteral Therapies',
          subcategory: 'Expected Actions/Outcomes',
          testType: 'classic',
          difficulty: 'easy',
          points: 1,
        },
      ];

      await db.insert(qbankQuestions).values(sampleQuestions);
    }

    // Ensure course is published
    if (course.status !== 'published') {
      await db
        .update(courses)
        .set({ status: 'published' })
        .where(eq(courses.id, course.id));
      course.status = 'published';
    }

    return NextResponse.json({
      success: true,
      message: 'Nurse Pro Academy course setup completed',
      course: {
        id: course.id.toString(),
        title: course.title,
        status: 'published',
      },
      questionBank: {
        id: questionBank.id.toString(),
        name: questionBank.name,
      },
    });
  } catch (error: any) {
    logger.error('Setup error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to setup course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


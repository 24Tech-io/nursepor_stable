/**
 * Quiz Helper Functions
 * Utilities for fetching and formatting quiz questions from both Q-Bank and legacy sources
 */

import { getDatabase } from '@/lib/db';
import { quizzes, quizQuestions, quizQbankQuestions, qbankQuestions } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

/**
 * Safely parse JSON string
 */
function safeJsonParse(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Get quiz questions from appropriate source based on questionSource
 */
export async function getQuizQuestions(quizId: number) {
  const db = getDatabase();

  // Get quiz to determine question source
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  if (quiz.questionSource === 'qbank') {
    return await getQBankQuestions(quizId);
  } else {
    return await getLegacyQuestions(quizId);
  }
}

/**
 * Get questions from Q-Bank source
 */
async function getQBankQuestions(quizId: number) {
  const db = getDatabase();

  // Get question links with sort order
  const questionLinks = await db
    .select({
      questionId: quizQbankQuestions.questionId,
      sortOrder: quizQbankQuestions.sortOrder,
    })
    .from(quizQbankQuestions)
    .where(eq(quizQbankQuestions.quizId, quizId))
    .orderBy(quizQbankQuestions.sortOrder);

  if (questionLinks.length === 0) {
    return [];
  }

  // Get actual questions
  const questionIds = questionLinks.map(link => link.questionId);
  const questions = await db
    .select()
    .from(qbankQuestions)
    .where(inArray(qbankQuestions.id, questionIds));

  // Create a map for quick lookup
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Sort by sortOrder and format
  return questionLinks
    .map(link => {
      const question = questionMap.get(link.questionId);
      if (!question) return null;

      return formatQBankQuestionForQuiz(question, link.sortOrder);
    })
    .filter(Boolean) as any[];
}

/**
 * Get questions from legacy source
 */
async function getLegacyQuestions(quizId: number) {
  const db = getDatabase();

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.order);

  return questions.map(q => ({
    id: q.id,
    question: q.question,
    options: safeJsonParse(q.options, []),
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    order: q.order,
    questionType: 'multiple_choice', // Legacy questions are always MCQ
  }));
}

/**
 * Format Q-Bank question for quiz display
 */
export function formatQBankQuestionForQuiz(qbankQuestion: any, order?: number) {
  const options = safeJsonParse(qbankQuestion.options, []);
  const correctAnswer = safeJsonParse(qbankQuestion.correctAnswer, null);

  // Format options for frontend if needed
  const formattedOptions = Array.isArray(options)
    ? options.map((opt: any, idx: number) => {
        if (typeof opt === 'string') {
          return {
            id: String.fromCharCode(97 + idx), // a, b, c, d...
            text: opt,
          };
        }
        return {
          id: opt.id || String.fromCharCode(97 + idx),
          text: opt.text || opt,
        };
      })
    : [];

  return {
    id: qbankQuestion.id,
    question: qbankQuestion.question,
    questionType: qbankQuestion.questionType || 'multiple_choice',
    options: formattedOptions,
    correctAnswer: correctAnswer,
    explanation: qbankQuestion.explanation,
    order: order ?? 0,
    points: qbankQuestion.points || 1,
    subject: qbankQuestion.subject,
    lesson: qbankQuestion.lesson,
    difficulty: qbankQuestion.difficulty,
  };
}

/**
 * Validate quiz answer for both Q-Bank and legacy question types
 */
export function validateQuizAnswer(
  question: any,
  userAnswer: any,
  questionSource: 'qbank' | 'legacy'
): { isCorrect: boolean; pointsEarned: number } {
  if (questionSource === 'qbank') {
    return validateQBankAnswer(question, userAnswer);
  } else {
    return validateLegacyAnswer(question, userAnswer);
  }
}

/**
 * Validate Q-Bank question answer (handles SATA, NGN, MCQ)
 */
function validateQBankAnswer(question: any, userAnswer: any): { isCorrect: boolean; pointsEarned: number } {
  const correctAnswer = safeJsonParse(question.correctAnswer, null);
  const points = question.points || 1;

  if (!correctAnswer) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  // Handle SATA (Select All That Apply) questions
  if (question.questionType === 'sata') {
    const correctArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const userArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];

    // For SATA, all correct answers must be selected and no incorrect ones
    const correctSet = new Set(correctArray.map(String));
    const userSet = new Set(userArray.map(String));

    if (correctSet.size !== userSet.size) {
      return { isCorrect: false, pointsEarned: 0 };
    }

    const allCorrect = Array.from(correctSet).every(ans => userSet.has(ans));
    return { isCorrect: allCorrect, pointsEarned: allCorrect ? points : 0 };
  }

  // Handle NGN case study questions (can have multiple correct answers)
  if (question.questionType === 'ngn_case_study' || question.questionType === 'unfolding_ngn') {
    const correctArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const userArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];

    // Check if user selected all correct answers
    const correctSet = new Set(correctArray.map(String));
    const userSet = new Set(userArray.map(String));

    const allCorrect = Array.from(correctSet).every(ans => userSet.has(ans)) &&
                      correctSet.size === userSet.size;

    return { isCorrect: allCorrect, pointsEarned: allCorrect ? points : 0 };
  }

  // Handle standard MCQ
  const correctStr = String(correctAnswer);
  const userStr = String(userAnswer);

  const isCorrect = correctStr === userStr;
  return { isCorrect, pointsEarned: isCorrect ? points : 0 };
}

/**
 * Validate legacy question answer (always MCQ)
 */
function validateLegacyAnswer(question: any, userAnswer: any): { isCorrect: boolean; pointsEarned: number } {
  const correctAnswer = String(question.correctAnswer || '');
  const userAnswerStr = String(userAnswer || '');

  const isCorrect = correctAnswer === userAnswerStr;
  return { isCorrect, pointsEarned: isCorrect ? 1 : 0 };
}

/**
 * Get quiz with questions from appropriate source
 */
export async function getQuizWithQuestions(quizId: number) {
  const db = getDatabase();

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!quiz) {
    return null;
  }

  const questions = await getQuizQuestions(quizId);

  return {
    ...quiz,
    questions,
  };
}


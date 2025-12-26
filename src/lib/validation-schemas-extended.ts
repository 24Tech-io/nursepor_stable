/**
 * Extended Validation Schemas
 * Additional schemas for all API endpoints
 */

import { z } from 'zod';
import { isIP } from 'net';

// Enrollment schemas
export const enrollStudentSchema = z.object({
  courseId: z.union([
    z.number().int().positive('Course ID must be positive'),
    z.string().regex(/^\d+$/, 'Invalid course ID').transform(Number),
  ]).transform(val => typeof val === 'string' ? parseInt(val) : val),
});

export const unenrollStudentSchema = z.object({
  courseId: z.union([
    z.number().int().positive('Course ID must be positive'),
    z.string().regex(/^\d+$/, 'Invalid course ID').transform(Number),
  ]).transform(val => typeof val === 'string' ? parseInt(val) : val),
});

// Course schemas
export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000).trim(),
  instructor: z.string().min(2, 'Instructor name required').max(100).trim(),
  pricing: z.number().min(0, 'Price cannot be negative'),
  status: z.enum(['draft', 'published', 'active']).default('draft'),
  isRequestable: z.boolean().default(true),
  isPublic: z.boolean().default(false),
  isDefaultUnlocked: z.boolean().default(false),
  thumbnail: z.string().url().optional().or(z.literal('')),
});

export const updateCourseSchema = createCourseSchema.partial();

// Chapter schemas
export const createChapterSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  content: z.string().max(100000).optional(), // For text/reading chapters
  type: z.enum(['video', 'text', 'textbook', 'quiz', 'assignment', 'document', 'mcq']),
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().default(false),
  prerequisiteChapterId: z.number().int().positive().optional(),
  videoUrl: z.string().max(2048).optional().nullable(),
  videoProvider: z.enum(['youtube', 'vimeo', 'custom']).optional(),
  videoDuration: z.number().int().min(0).optional(),
  transcript: z.string().max(50000).optional(),
  textbookContent: z.string().max(100000).optional(),
  textbookFileUrl: z.string().max(2048).optional(),
  readingTime: z.number().int().min(0).optional(),
  mcqData: z.any().optional(),
  documentUrl: z.string().max(2048).optional(),
  documentType: z.string().max(50).optional(),
});

export const updateChapterSchema = createChapterSchema.partial();

// Module schemas
export const createModuleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  order: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

// Quiz schemas
export const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.any()),
  timeTaken: z.number().int().min(0, 'Time taken must be positive'),
});

// Video progress schemas
export const videoProgressSchema = z.object({
  chapterId: z.string().regex(/^\d+$/, 'Invalid chapter ID').transform(Number),
  currentTime: z.number().min(0, 'Current time must be positive'),
  duration: z.number().positive('Duration must be positive'),
  completed: z.boolean().optional(),
});

// Chapter completion schema
export const chapterCompleteSchema = z.object({
  chapterId: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).pipe(z.number().int().positive()),
  courseId: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).pipe(z.number().int().positive()),
});

// Request schemas
export const createRequestSchema = z.object({
  courseId: z.number().int().positive('Course ID must be positive'),
  reason: z.string().max(500).trim().optional(),
});

export const updateRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  reason: z.string().max(500).trim().optional(),
});

// Student schemas
export const updateStudentSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

// Q-Bank schemas
export const createQBankSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  courseId: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const createQuestionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(2000).trim(),
  questionType: z.enum(['standard', 'sata', 'ordering', 'calculation', 'casestudy', 'bowtie', 'matrix', 'trend', 'drag_drop', 'highlight', 'cloze', 'multiple_choice', 'sata_classic', 'ngn_case_study', 'unfolding_ngn']).optional(),
  type: z.enum(['standard', 'sata', 'ordering', 'calculation', 'casestudy', 'bowtie', 'matrix', 'trend', 'drag_drop', 'highlight', 'cloze', 'multiple_choice', 'sata_classic', 'ngn_case_study', 'unfolding_ngn']).optional(),
  options: z.union([z.array(z.string()).min(2, 'At least 2 options required').max(10, 'Maximum 10 options'), z.string()]).optional(),
  correctAnswer: z.any().optional(),
  explanation: z.string().max(2000).trim().optional(),
  points: z.number().int().min(1).max(100).default(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium').optional(),
  category: z.string().max(100).trim().optional(),
  tags: z.array(z.string()).max(10).optional(),
  subject: z.string().max(100).trim().optional(),
  lesson: z.string().max(100).trim().optional(),
  clientNeedArea: z.string().max(100).trim().optional(),
  subcategory: z.string().max(100).trim().optional(),
  testType: z.enum(['classic', 'ngn', 'mixed']).optional(),
  stem: z.string().min(10).max(2000).trim().optional(),
  bowtieData: z.any().optional(),
  stepQuestions: z.any().optional(),
  rankingData: z.any().optional(),
  caseData: z.any().optional(),
  caseTitle: z.string().optional(),
  caseDescription: z.string().optional(),
}).refine((data) => data.question || data.stem, {
  message: 'Either question or stem is required',
});

// Blog schemas
export const createBlogSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/).trim(),
  content: z.string().min(10).max(50000),
  author: z.string().min(1).max(100).trim().optional(),
  cover: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  excerpt: z.string().max(500).trim().optional(),
  published: z.boolean().default(false),
  featured: z.boolean().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  seoTitle: z.string().max(70).trim().optional(),
  seoDescription: z.string().max(160).trim().optional(),
  scheduledPublish: z.string().datetime().optional().nullable(),
  readingTime: z.number().int().positive().optional().nullable(),
  category: z.string().max(50).trim().optional(),
});

// Profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().or(z.literal('')),
  bio: z.string().max(500).trim().optional(),
});

// 2FA schemas
export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Token is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  email: z.string().email().optional(),
});

// Certificate schemas
export const generateCertificateSchema = z.object({
  courseId: z.number().int().positive('Course ID must be positive'),
});

// Coupon schemas
export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50).trim(),
  courseId: z.number().int().positive().optional(),
  amount: z.number().min(0, 'Amount must be positive').optional(),
});

// Course question schemas
export const createCourseQuestionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(2000).trim(),
  chapterId: z.number().int().positive().optional(),
});

// Video progress schemas (legacy endpoint)
export const videoProgressLegacySchema = z.object({
  chapterId: z.number().int().positive('Chapter ID must be positive'),
  currentTime: z.number().min(0, 'Current time must be positive'),
  duration: z.number().positive('Duration must be positive'),
});

// Wishlist schemas
export const wishlistSchema = z.object({
  courseId: z.number().int().positive('Course ID must be positive'),
});

// Blog update schema
export const updateBlogSchema = createBlogSchema.partial();

// Q-Bank update schema
export const updateQBankSchema = createQBankSchema.partial();

// Q-Bank category schemas
export const createQBankCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100).trim(),
  description: z.string().max(500).trim().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional(),
  icon: z.string().max(50).trim().optional(),
  parentCategoryId: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateQBankCategorySchema = createQBankCategorySchema.partial();

// Q-Bank clone schema
export const cloneQuestionSchema = z.object({
  questionId: z.number().int().positive('Question ID must be positive'),
  targetCategoryId: z.number().int().positive().optional(),
});

// Quiz question assignment schemas
export const assignQuizQuestionsSchema = z.object({
  questionIds: z.array(z.number().int().positive()).min(1, 'At least one question ID required'),
});

export const removeQuizQuestionsSchema = z.object({
  questionIds: z.array(z.number().int().positive()).optional(),
});

// Course question assignment schemas
export const assignCourseQuestionsSchema = z.object({
  questionIds: z.array(z.number().int().positive()).min(1, 'At least one question ID required'),
  moduleId: z.number().int().positive().optional(),
  isModuleSpecific: z.boolean().default(false),
});

export const removeCourseQuestionsSchema = z.object({
  questionIds: z.array(z.number().int().positive()).optional(),
  moduleId: z.number().int().positive().optional(),
});

// Q-Bank request schema
export const createQBankRequestSchema = z.object({
  qbankId: z.number().int().positive('Q-Bank ID must be positive'),
  reason: z.string().max(500).trim().optional(),
});

// Q-Bank test schemas
export const startQBankTestSchema = z.object({
  mode: z.enum(['tutorial', 'exam', 'practice', 'timed', 'assessment']).optional(),
  questionCount: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  timeLimit: z.number().int().positive().optional(),
});

export const submitQBankTestSchema = z.object({
  answers: z.record(z.string(), z.any()),
  timeSpent: z.number().int().min(0).optional(),
});

// Course review schema
export const createCourseReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  review: z.string().max(2000).trim().optional(),
});

// Textbook schemas
export const createTextbookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).trim(),
  author: z.string().max(255).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  isbn: z.string().max(20).trim().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().max(10).trim().optional(),
  pdfFileUrl: z.string().url().max(500).trim(),
  thumbnail: z.string().url().max(500).trim().optional(),
  courseId: z.number().int().positive().optional(),
  status: z.enum(['draft', 'published']).optional(),
  totalPages: z.number().int().positive().optional(),
  fileSize: z.number().int().positive().optional(),
});

export const updateTextbookSchema = createTextbookSchema.partial();

// Textbook progress schema
export const textbookProgressSchema = z.object({
  currentPage: z.number().int().min(1, 'Current page must be at least 1'),
  totalPagesRead: z.number().int().min(0).optional(),
});

// Q-Bank test creation schema
export const createQBankTestSchema = z.object({
  title: z.string().max(200).trim().optional(),
  mode: z.enum(['tutorial', 'exam', 'practice']).optional(),
  testType: z.enum(['classic', 'ngn', 'mixed']).optional(),
  organization: z.string().max(50).trim().optional(),
  questionIds: z.array(z.number().int().positive()).optional(),
  timeLimit: z.number().int().positive().optional(),
});

// Q-Bank request rejection schema
export const rejectQBankRequestSchema = z.object({
  reason: z.string().max(500).trim().optional(),
});

// Sync repair schema
export const syncRepairSchema = z.object({
  progressOnly: z.array(z.object({
    studentId: z.number().int().positive(),
    courseId: z.number().int().positive(),
  })).optional(),
  enrollmentsOnly: z.array(z.object({
    userId: z.number().int().positive(),
    courseId: z.number().int().positive(),
  })).optional(),
  pendingEnrolled: z.array(z.object({
    requestId: z.number().int().positive(),
  })).optional(),
});

// AI Assist schema
export const aiAssistSchema = z.object({
  action: z.enum(['suggest', 'explain', 'fix', 'generate', 'review', 'chat']),
  code: z.string().optional(),
  error: z.string().optional(),
  description: z.string().optional(),
  language: z.string().optional(),
  question: z.string().optional(),
  context: z.string().optional(),
});

// Security unblock schema
export const unblockIPSchema = z.object({
  ip: z
    .string()
    .trim()
    .refine((val) => isIP(val) !== 0, { message: 'Invalid IP address' }),
});

// Export all schemas
export const validationSchemas = {
  enrollStudent: enrollStudentSchema,
  unenrollStudent: unenrollStudentSchema,
  createCourse: createCourseSchema,
  updateCourse: updateCourseSchema,
  createChapter: createChapterSchema,
  updateChapter: updateChapterSchema,
  createModule: createModuleSchema,
  updateModule: updateModuleSchema,
  submitQuiz: submitQuizSchema,
  videoProgress: videoProgressSchema,
  chapterComplete: chapterCompleteSchema,
  createRequest: createRequestSchema,
  updateRequest: updateRequestSchema,
  updateStudent: updateStudentSchema,
  createQBank: createQBankSchema,
  createQuestion: createQuestionSchema,
  createBlog: createBlogSchema,
  updateProfile: updateProfileSchema,
  verify2FA: verify2FASchema,
  generateCertificate: generateCertificateSchema,
  validateCoupon: validateCouponSchema,
  createCourseQuestion: createCourseQuestionSchema,
  videoProgressLegacy: videoProgressLegacySchema,
  wishlist: wishlistSchema,
  updateBlog: updateBlogSchema,
  updateQBank: updateQBankSchema,
  createQBankCategory: createQBankCategorySchema,
  updateQBankCategory: updateQBankCategorySchema,
  cloneQuestion: cloneQuestionSchema,
  assignQuizQuestions: assignQuizQuestionsSchema,
  removeQuizQuestions: removeQuizQuestionsSchema,
  assignCourseQuestions: assignCourseQuestionsSchema,
  removeCourseQuestions: removeCourseQuestionsSchema,
  createQBankRequest: createQBankRequestSchema,
  startQBankTest: startQBankTestSchema,
  submitQBankTest: submitQBankTestSchema,
  createCourseReview: createCourseReviewSchema,
  createTextbook: createTextbookSchema,
  updateTextbook: updateTextbookSchema,
  textbookProgress: textbookProgressSchema,
  createQBankTest: createQBankTestSchema,
  rejectQBankRequest: rejectQBankRequestSchema,
  syncRepair: syncRepairSchema,
  aiAssist: aiAssistSchema,
  unblockIP: unblockIPSchema,
};



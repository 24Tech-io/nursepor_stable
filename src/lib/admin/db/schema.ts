import {
  pgTable,
  text,
  serial,
  integer,
  real,
  boolean,
  timestamp,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    phone: text('phone'),
    role: text('role').notNull().default('student'),
    isActive: boolean('is_active').notNull().default(true),
    faceIdEnrolled: boolean('face_id_enrolled').notNull().default(false),
    faceTemplate: text('face_template'),
    fingerprintEnrolled: boolean('fingerprint_enrolled').notNull().default(false),
    fingerprintCredentialId: text('fingerprint_credential_id'),
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    twoFactorSecret: text('two_factor_secret'),
    twoFactorBackupCodes: text('two_factor_backup_codes'),
    bio: text('bio'),
    profilePicture: text('profile_picture'),
    joinedDate: timestamp('joined_date').notNull().defaultNow(),
    lastLogin: timestamp('last_login'),
    resetToken: text('reset_token'),
    resetTokenExpiry: timestamp('reset_token_expiry'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailRoleUnique: unique('users_email_role_unique').on(table.email, table.role),
  })
);

// Courses table
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  instructor: text('instructor').notNull(),
  thumbnail: text('thumbnail'),
  pricing: real('pricing'),
  status: text('status').notNull().default('draft'),
  isRequestable: boolean('is_requestable').notNull().default(true),
  isDefaultUnlocked: boolean('is_default_unlocked').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(false), // true = direct enrollment, false = requires approval
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Modules table
export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  duration: integer('duration').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chapters table
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  moduleId: integer('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'video', 'textbook', 'mcq'
  order: integer('order').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  prerequisiteChapterId: integer('prerequisite_chapter_id'),

  // Video specific fields
  videoUrl: text('video_url'),
  videoProvider: text('video_provider'),
  videoDuration: integer('video_duration'),
  transcript: text('transcript'),

  // Textbook specific fields
  textbookContent: text('textbook_content'),
  textbookFileUrl: text('textbook_file_url'),
  readingTime: integer('reading_time'),

  // MCQ specific fields
  mcqData: text('mcq_data'), // JSON string of quiz data

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Access Requests table
export const accessRequests = pgTable('access_requests', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
});

// Student Progress table
export const studentProgress = pgTable('student_progress', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  totalProgress: real('total_progress').notNull().default(0),
  lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
});

// Daily Videos table
export const dailyVideos = pgTable('daily_videos', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  day: integer('day').notNull(), // Day of year (0-365)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Quizzes table
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }), // Optional: can be standalone or linked to chapter
  title: text('title').notNull(),
  passMark: integer('pass_mark').notNull().default(70),
  timeLimit: integer('time_limit'), // in minutes
  showAnswers: boolean('show_answers').notNull().default(true),
  maxAttempts: integer('max_attempts').notNull().default(3),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quiz Questions table
export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: text('options').notNull(), // JSON string of options
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  order: integer('order').notNull(),
});

// ✅ FIX: Quiz Q-Bank Questions - Links quizzes to Q-Bank questions
export const quizQbankQuestions = pgTable('quiz_qbank_questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionId: integer('question_id')
    .notNull()
    .references(() => qbankQuestions.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Quiz Attempts table
export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  passed: boolean('passed').notNull(),
  timeSpent: integer('time_spent'), // in seconds
  answers: text('answers'), // JSON string of answers
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Blog Posts table
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  author: text('author').notNull(),
  cover: text('cover'),
  tags: text('tags').notNull().default('[]'), // JSON array
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Question Banks table (legacy/alternative to quizzes)
export const questionBanks = pgTable('question_banks', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }), // nullable for general Q-Bank
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Q-Bank Questions table
// Q-Bank: Question Categories (Folders)
export const qbankCategories = pgTable('qbank_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentCategoryId: integer('parent_category_id').references((): any => qbankCategories.id, {
    onDelete: 'cascade',
  }),
  description: text('description'),
  color: text('color').default('#8B5CF6'),
  icon: text('icon').default('📁'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const qbankQuestions = pgTable('qbank_questions', {
  id: serial('id').primaryKey(),
  questionBankId: integer('question_bank_id')
    .notNull()
    .references(() => questionBanks.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => qbankCategories.id, { onDelete: 'set null' }),
  question: text('question').notNull(),
  questionType: text('question_type').notNull().default('multiple_choice'), // multiple_choice, sata, ngn_case_study
  options: text('options').notNull().default('[]'), // JSON array
  correctAnswer: text('correct_answer').notNull().default('{}'), // JSON
  explanation: text('explanation'),
  subject: text('subject'), // Adult Health, Child Health, etc.
  lesson: text('lesson'), // Cardiovascular, Endocrine, etc.
  clientNeedArea: text('client_need_area'), // Physiological Adaptation, etc.
  subcategory: text('subcategory'), // Alterations in Body Systems, etc.
  testType: text('test_type').notNull().default('mixed'), // classic, ngn, mixed
  difficulty: text('difficulty').default('medium'), // easy, medium, hard
  points: integer('points').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Course Question Assignments
export const courseQuestionAssignments = pgTable('course_question_assignments', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  moduleId: integer('module_id').references(() => modules.id, { onDelete: 'cascade' }),
  questionId: integer('question_id')
    .notNull()
    .references(() => qbankQuestions.id, { onDelete: 'cascade' }),
  isModuleSpecific: boolean('is_module_specific').notNull().default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Payments table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id),
  amount: real('amount').notNull(),
  status: text('status').notNull(), // 'pending', 'completed', 'failed'
  paymentId: text('payment_id'), // Stripe payment intent ID
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Activity Logs table (Admin activities)
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  adminName: text('admin_name').notNull(),
  action: text('action').notNull(), // 'created', 'updated', 'deleted', 'activated', 'deactivated'
  entityType: text('entity_type').notNull(), // 'course', 'student', 'question', 'module', etc.
  entityId: integer('entity_id'),
  entityName: text('entity_name'), // Name/title of the entity for display
  details: text('details'), // Additional details in JSON format
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Student Activity Logs table
export const studentActivityLogs = pgTable('student_activity_logs', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(), // 'login', 'logout', 'course_view', 'module_access', 'test_attempt', 'test_result', 'video_watch', 'document_view', etc.
  title: text('title').notNull(), // Human-readable title
  description: text('description'), // Additional details
  metadata: text('metadata'), // JSON string for additional data (courseId, moduleId, quizId, score, etc.)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Enrollments table (new source of truth for enrollment status)
export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'), // active, completed, cancelled
    progress: integer('progress').notNull().default(0), // percentage
    enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    userCourseUnique: unique('user_course_enrollment_unique').on(table.userId, table.courseId),
  })
);

// Define relations
export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
  accessRequests: many(accessRequests),
  studentProgress: many(studentProgress),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  module: one(modules, {
    fields: [chapters.moduleId],
    references: [modules.id],
  }),
}));

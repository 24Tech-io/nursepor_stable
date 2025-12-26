import { pgTable, text, serial, integer, real, boolean, timestamp, unique, jsonb, index } from 'drizzle-orm/pg-core';
import type { NursingCandidateFormPayload } from '@/types/nursing-candidate';
import { relations } from 'drizzle-orm';

// Users table
// Changed: email is no longer unique alone - now (email, role) must be unique together
// This allows same email to have both student and admin accounts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().default('student'),
  isActive: boolean('is_active').notNull().default(true),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  bio: text('bio'),
  profilePicture: text('profile_picture'),
  phone: text('phone'),
  lastLogin: timestamp('last_login'), // Last login timestamp
  lastLoginPhoto: text('last_login_photo'),
  lastLoginIp: text('last_login_ip'),
  joinedDate: timestamp('joined_date').notNull().defaultNow(), // Account creation date (distinct from createdAt)
  resetToken: text('reset_token'), // Password reset token
  resetTokenExpiry: timestamp('reset_token_expiry'), // Password reset token expiry
  // otpSecret: text('otp_secret'), // 2FA OTP secret
  // otpExpiry: timestamp('otp_expiry'), // 2FA OTP expiry
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: same email can have student AND admin accounts
  // But cannot have duplicate student or duplicate admin with same email
  emailRoleUnique: unique('users_email_role_unique').on(table.email, table.role),
}));

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
}, (table) => ({
  courseIdIdx: index('modules_course_id_idx').on(table.courseId),
}));

// Chapters table
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  moduleId: integer('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
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
  mcqData: text('mcq_data'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  moduleIdIdx: index('chapters_module_id_idx').on(table.moduleId),
}));

// Quizzes table
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  passMark: integer('pass_mark').notNull().default(70),
  timeLimit: integer('time_limit'),
  showAnswers: boolean('show_answers').notNull().default(true),
  maxAttempts: integer('max_attempts').notNull().default(3),
  isPublished: boolean('is_published').notNull().default(true),
  questionSource: text('question_source').notNull().default('legacy'), // 'qbank' | 'legacy'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  courseIdIdx: index('quizzes_course_id_idx').on(table.courseId),
}));

// Quiz Questions table (Legacy - for old quizzes)
export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: text('question_type').notNull().default('mcq'), // mcq, sata, ngn_case_study, bowtie, trend, etc.
  options: text('options').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  imageUrl: text('image_url'), // URL to uploaded question image
  order: integer('order').notNull(),
});

// Q-Bank Tables - MOVED HERE to avoid forward reference errors
// Q-Bank: Question Categories (Folders)
export const qbankCategories = pgTable('qbank_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentCategoryId: integer('parent_category_id').references((): any => qbankCategories.id, { onDelete: 'cascade' }),
  description: text('description'),
  color: text('color').default('#8B5CF6'),
  icon: text('icon').default('📁'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const questionBanks = pgTable('question_banks', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }), // Nullable for standalone Q-Banks
  name: text('name').notNull(),
  description: text('description'),
  instructor: text('instructor'),
  thumbnail: text('thumbnail'),
  pricing: real('pricing').default(0),
  status: text('status').notNull().default('draft'), // draft | published | archived
  isRequestable: boolean('is_requestable').notNull().default(true),
  isDefaultUnlocked: boolean('is_default_unlocked').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  totalQuestions: integer('total_questions').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Q-Bank Questions
export const qbankQuestions = pgTable('qbank_questions', {
  id: serial('id').primaryKey(),
  questionBankId: integer('question_bank_id').notNull().references(() => questionBanks.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => qbankCategories.id, { onDelete: 'set null' }),
  question: text('question').notNull(),
  questionType: text('question_type').notNull().default('multiple_choice'), // multiple_choice, sata, ngn_case_study, unfolding_ngn
  options: text('options').notNull(), // JSON array of options
  correctAnswer: text('correct_answer').notNull(), // JSON array for SATA, single value for MCQ
  explanation: text('explanation'),
  subject: text('subject'), // Adult Health, Child Health, etc.
  lesson: text('lesson'), // Cardiovascular, Endocrine, etc.
  clientNeedArea: text('client_need_area'), // Physiological Adaptation, etc.
  subcategory: text('subcategory'), // Alterations in Body Systems, etc.
  testType: text('test_type').notNull().default('mixed'), // classic, ngn, mixed
  difficulty: text('difficulty').default('medium'), // easy, medium, hard
  points: integer('points').notNull().default(1),
  timesAttempted: integer('times_attempted').default(0),
  timesCorrect: integer('times_correct').default(0),
  averageTimeSeconds: real('average_time_seconds').default(0),
  globalAccuracyPercentage: real('global_accuracy_percentage').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  qbankIdIdx: index('qbank_questions_qbank_id_idx').on(table.questionBankId),
}));

// Quiz Q-Bank Questions (NEW - links quizzes to Q-Bank questions)
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

// Blog Posts table
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  content: text('content').notNull(),
  author: text('author').notNull(),
  cover: text('cover'),
  tags: text('tags').notNull().default('[]'),
  status: text('status').notNull().default('draft'),
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
  status: text('status').notNull().default('pending'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
});

// Student Progress table
export const studentProgress = pgTable('student_progress', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  completedChapters: text('completed_chapters').notNull().default('[]'),
  watchedVideos: text('watched_videos').notNull().default('[]'),
  quizAttempts: text('quiz_attempts').notNull().default('[]'),
  totalProgress: integer('total_progress').notNull().default(0),
  lastAccessed: timestamp('last_accessed').notNull().defaultNow(),
}, (table) => ({
  userCourseProgressUnique: unique('user_course_progress_unique').on(table.studentId, table.courseId),
  studentIdIdx: index('student_progress_student_id_idx').on(table.studentId),
  courseIdIdx: index('student_progress_course_id_idx').on(table.courseId),
}));


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

// Sessions table for session management
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').unique().notNull(),
  deviceInfo: text('device_info'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Activity Logs table (Admin activities)
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(), // 'login', 'logout', 'course_view', 'module_access', 'test_attempt', 'test_result', 'video_watch', 'document_view', etc.
  title: text('title').notNull(), // Human-readable title
  description: text('description'), // Additional details
  metadata: text('metadata'), // JSON string for additional data (courseId, moduleId, quizId, score, etc.)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Daily Videos table
export const dailyVideos = pgTable('daily_videos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  videoUrl: text('video_url').notNull(), // URL to video file or external video URL
  scheduledDate: timestamp('scheduled_date').notNull(), // Date when video should be shown
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Textbooks table (moved before payments to avoid forward reference)
export const textbooks = pgTable('textbooks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author'),
  description: text('description'),
  isbn: text('isbn'),
  price: real('price').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  pdfFileUrl: text('pdf_file_url').notNull(), // Path to PDF file
  thumbnail: text('thumbnail'), // Cover image
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }), // Optional link to course
  status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
  totalPages: integer('total_pages'),
  fileSize: integer('file_size'), // in bytes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Textbook purchases table (moved here to avoid forward reference in relations)
export const textbookPurchases = pgTable('textbook_purchases', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  textbookId: integer('textbook_id').notNull().references(() => textbooks.id, { onDelete: 'cascade' }),
  paymentId: integer('payment_id'), // Link to payment record (no FK constraint to avoid circular dependency)
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('completed'), // 'completed' | 'refunded'
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Optional: set expiration date
}, (table) => ({
  studentTextbookUnique: unique('student_textbook_purchase_unique').on(table.studentId, table.textbookId),
}));

// Textbook access logs table
export const textbookAccessLogs = pgTable('textbook_access_logs', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  textbookId: integer('textbook_id').notNull().references(() => textbooks.id, { onDelete: 'cascade' }),
  accessedAt: timestamp('accessed_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionDuration: integer('session_duration'), // in seconds
  pagesViewed: text('pages_viewed'), // JSON array of page numbers
});

// Textbook reading progress table
export const textbookReadingProgress = pgTable('textbook_reading_progress', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  textbookId: integer('textbook_id').notNull().references(() => textbooks.id, { onDelete: 'cascade' }),
  currentPage: integer('current_page').notNull().default(1),
  totalPages: integer('total_pages').notNull(),
  lastReadAt: timestamp('last_read_at').notNull().defaultNow(),
  completionPercentage: real('completion_percentage').notNull().default(0),
}, (table) => ({
  studentTextbookUnique: unique('student_textbook_progress_unique').on(table.studentId, table.textbookId),
}));

// Payments/Transactions table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'cascade' }), // Made nullable for textbooks
  textbookId: integer('textbook_id').references(() => textbooks.id, { onDelete: 'cascade' }), // Link to textbook purchases
  itemType: text('item_type').notNull().default('course'), // 'course' | 'textbook'
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  status: text('status').notNull().default('pending'), // pending, completed, failed, refunded
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeSessionId: text('stripe_session_id'),
  paymentMethod: text('payment_method'),
  transactionId: text('transaction_id'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations (paymentsRelations moved after textbooks to avoid forward reference)
export const usersRelations = relations(users, ({ many }) => ({
  accessRequests: many(accessRequests),
  studentProgress: many(studentProgress),
  notifications: many(notifications),
  sessions: many(sessions),
  reviewedRequests: many(accessRequests, { relationName: 'reviewer' }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
  accessRequests: many(accessRequests),
  studentProgress: many(studentProgress),
  // questionBanks relation defined after questionBanks table
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  module: one(modules, {
    fields: [chapters.moduleId],
    references: [modules.id],
  }),
  prerequisiteChapter: one(chapters, {
    fields: [chapters.prerequisiteChapterId],
    references: [chapters.id],
  }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, {
    fields: [quizzes.courseId],
    references: [courses.id],
  }),
  chapter: one(chapters, {
    fields: [quizzes.chapterId],
    references: [chapters.id],
  }),
  legacyQuestions: many(quizQuestions),
  qbankQuestions: many(quizQbankQuestions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizQbankQuestionsRelations = relations(quizQbankQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQbankQuestions.quizId],
    references: [quizzes.id],
  }),
  question: one(qbankQuestions, {
    fields: [quizQbankQuestions.questionId],
    references: [qbankQuestions.id],
  }),
}));

export const accessRequestsRelations = relations(accessRequests, ({ one }) => ({
  student: one(users, {
    fields: [accessRequests.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [accessRequests.courseId],
    references: [courses.id],
  }),
  reviewer: one(users, {
    fields: [accessRequests.reviewedBy],
    references: [users.id],
    relationName: 'reviewer',
  }),
}));

export const studentProgressRelations = relations(studentProgress, ({ one }) => ({
  student: one(users, {
    fields: [studentProgress.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [studentProgress.courseId],
    references: [courses.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Note: paymentsRelations is defined after textbooks to avoid forward reference issues

// Course Reviews & Ratings
export const courseReviews = pgTable(
  'course_reviews',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1-5 stars
    review: text('review'),
    isPublished: boolean('is_published').notNull().default(true),
    helpful: integer('helpful').notNull().default(0), // Number of helpful votes
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // One review per user per course
    userCourseUnique: unique('user_course_review_unique').on(table.userId, table.courseId),
  })
);

export const courseReviewsRelations = relations(courseReviews, ({ one }) => ({
  course: one(courses, {
    fields: [courseReviews.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseReviews.userId],
    references: [users.id],
  }),
}));

// Wishlist / Favorites
export const wishlist = pgTable(
  'wishlist',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').notNull().defaultNow(),
  },
  (table) => ({
    // One wishlist entry per user per course
    userCourseUnique: unique('user_course_wishlist_unique').on(table.userId, table.courseId),
  })
);

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, {
    fields: [wishlist.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [wishlist.courseId],
    references: [courses.id],
  }),
}));

// Course Categories
export const courseCategories = pgTable('course_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  parentId: integer('parent_id').references((): any => courseCategories.id),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const categoriesRelations = relations(courseCategories, ({ one, many }) => ({
  // Removed self-referential parent/children relations to avoid circular dependency
  // Use manual joins when needed: courseCategories.parentId → courseCategories.id
  courses: many(courses),
}));

// Course-Category mapping (many-to-many)
export const courseCategoryMapping = pgTable(
  'course_category_mapping',
  {
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => courseCategories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: unique('course_category_pk').on(table.courseId, table.categoryId),
  })
);

// Completion Certificates
export const certificates = pgTable(
  'certificates',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    certificateNumber: text('certificate_number').notNull().unique(),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
    pdfUrl: text('pdf_url'),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
  },
  (table) => ({
    // One certificate per user per course
    userCourseUnique: unique('user_course_certificate_unique').on(table.userId, table.courseId),
  })
);

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [certificates.courseId],
    references: [courses.id],
  }),
}));

// Student Notes (Timestamped)
export const courseNotes = pgTable('course_notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp'), // Video timestamp in seconds
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courseNotesRelations = relations(courseNotes, ({ one }) => ({
  user: one(users, {
    fields: [courseNotes.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [courseNotes.chapterId],
    references: [chapters.id],
  }),
}));

// Course Bookmarks
export const courseBookmarks = pgTable('course_bookmarks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp'), // Video timestamp in seconds
  title: text('title'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const courseBookmarksRelations = relations(courseBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [courseBookmarks.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [courseBookmarks.chapterId],
    references: [chapters.id],
  }),
}));

// Course Q&A
export const courseQuestions = pgTable('course_questions', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  isAnswered: boolean('is_answered').notNull().default(false),
  upvotes: integer('upvotes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courseQuestionsRelations = relations(courseQuestions, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseQuestions.courseId],
    references: [courses.id],
  }),
  chapter: one(chapters, {
    fields: [courseQuestions.chapterId],
    references: [chapters.id],
  }),
  user: one(users, {
    fields: [courseQuestions.userId],
    references: [users.id],
  }),
  answers: many(courseAnswers),
}));

// Course Answers
export const courseAnswers = pgTable('course_answers', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id')
    .notNull()
    .references(() => courseQuestions.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  isInstructorAnswer: boolean('is_instructor_answer').notNull().default(false),
  upvotes: integer('upvotes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courseAnswersRelations = relations(courseAnswers, ({ one }) => ({
  question: one(courseQuestions, {
    fields: [courseAnswers.questionId],
    references: [courseQuestions.id],
  }),
  user: one(users, {
    fields: [courseAnswers.userId],
    references: [users.id],
  }),
}));

// Coupons & Discount Codes
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description'),
  discountType: text('discount_type').notNull(), // 'percentage' or 'fixed'
  discountValue: real('discount_value').notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  validFrom: timestamp('valid_from').notNull().defaultNow(),
  validUntil: timestamp('valid_until'),
  isActive: boolean('is_active').notNull().default(true),
  applicableCourses: text('applicable_courses'), // JSON array of course IDs, null = all courses
  minPurchaseAmount: real('min_purchase_amount'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Coupon Usage Tracking
export const couponUsage = pgTable('coupon_usage', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id')
    .notNull()
    .references(() => coupons.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  paymentId: integer('payment_id').references(() => payments.id),
  discountAmount: real('discount_amount').notNull(),
  usedAt: timestamp('used_at').notNull().defaultNow(),
});

// Video Progress Tracking (Detailed)
export const videoProgress = pgTable(
  'video_progress',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    currentTime: integer('current_time').notNull().default(0), // In seconds
    duration: integer('duration').notNull(), // In seconds
    watchedPercentage: real('watched_percentage').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    lastWatchedAt: timestamp('last_watched_at').notNull().defaultNow(),
  },
  (table) => ({
    userChapterUnique: unique('user_chapter_progress_unique').on(table.userId, table.chapterId),
  })
);

export const videoProgressRelations = relations(videoProgress, ({ one }) => ({
  user: one(users, {
    fields: [videoProgress.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [videoProgress.chapterId],
    references: [chapters.id],
  }),
}));

// Course Announcements
export const courseAnnouncements = pgTable('course_announcements', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courseAnnouncementsRelations = relations(courseAnnouncements, ({ one }) => ({
  course: one(courses, {
    fields: [courseAnnouncements.courseId],
    references: [courses.id],
  }),
}));

// Nursing Candidate Registration Forms
export const nursingCandidateForms = pgTable('nursing_candidate_forms', {
  id: serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull(),
  personalDetails: jsonb('personal_details').$type<NursingCandidateFormPayload['personalDetails']>().notNull(),
  educationDetails: jsonb('education_details').$type<NursingCandidateFormPayload['educationDetails']>().notNull(),
  registrationDetails: jsonb('registration_details').$type<NursingCandidateFormPayload['registrationDetails']>().notNull(),
  employmentHistory: jsonb('employment_history').$type<NursingCandidateFormPayload['employmentHistory']>().notNull(),
  canadaEmploymentHistory: jsonb('canada_employment_history').$type<NursingCandidateFormPayload['canadaEmploymentHistory']>().notNull(),
  nclexHistory: jsonb('nclex_history').$type<NursingCandidateFormPayload['nclexHistory']>().notNull().default({ hasTakenBefore: 'No', attempts: [] }),
  targetCountry: text('target_country').notNull().default('Canada'),
  documentChecklistAcknowledged: boolean('document_checklist_acknowledged').notNull().default(false),
  disciplinaryAction: text('disciplinary_action').notNull(),
  documentEmailStatus: text('document_email_status').notNull().default('pending'),
  documentEmailError: text('document_email_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});


// Course Question Assignments - Link questions to courses/modules
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

// Q-Bank Tests
export const qbankTests = pgTable('qbank_tests', {
  id: serial('id').primaryKey(),
  questionBankId: integer('question_bank_id')
    .notNull()
    .references(() => questionBanks.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  testId: text('test_id').notNull().unique(), // Unique test identifier
  title: text('title'),
  mode: text('mode').notNull().default('tutorial'), // cat, tutorial, timed, readiness_assessment
  testType: text('test_type').notNull().default('mixed'), // classic, ngn, mixed
  organization: text('organization').notNull().default('subject'), // subject, client_need
  questionIds: text('question_ids').notNull(), // JSON array of question IDs
  totalQuestions: integer('total_questions').notNull(),
  timeLimit: integer('time_limit'), // in minutes, null for untimed
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, abandoned
  score: integer('score'),
  maxScore: integer('max_score'),
  percentage: real('percentage'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Q-Bank Test Attempts (individual question attempts within a test)
export const qbankQuestionAttempts = pgTable('qbank_question_attempts', {
  id: serial('id').primaryKey(),
  testId: integer('test_id')
    .notNull()
    .references(() => qbankTests.id, { onDelete: 'cascade' }),
  questionId: integer('question_id')
    .notNull()
    .references(() => qbankQuestions.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userAnswer: text('user_answer').notNull(), // JSON array for SATA, single value for MCQ
  selectedAnswer: text('selected_answer'), // For new structure
  correctAnswer: text('correct_answer'), // For new structure
  isCorrect: boolean('is_correct').notNull(),
  isOmitted: boolean('is_omitted').notNull().default(false),
  isPartiallyCorrect: boolean('is_partially_correct').notNull().default(false),
  pointsEarned: integer('points_earned').notNull().default(0),
  timeSpent: integer('time_spent'), // in seconds
  markedForReview: boolean('marked_for_review').default(false),
  confidenceLevel: text('confidence_level'), // low | medium | high
  isFirstAttempt: boolean('is_first_attempt').default(true),
  attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});

// Q-Bank Enrollments
export const qbankEnrollments = pgTable('qbank_enrollments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  qbankId: integer('qbank_id').notNull().references(() => questionBanks.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at'),
  progress: integer('progress').default(0),
  questionsAttempted: integer('questions_attempted').default(0),
  questionsCorrect: integer('questions_correct').default(0),
  totalTimeSpentMinutes: integer('total_time_spent_minutes').default(0),
  testsCompleted: integer('tests_completed').default(0),
  tutorialTestsCompleted: integer('tutorial_tests_completed').default(0),
  timedTestsCompleted: integer('timed_tests_completed').default(0),
  assessmentTestsCompleted: integer('assessment_tests_completed').default(0),
  averageScore: real('average_score').default(0.0),
  highestScore: real('highest_score').default(0.0),
  lowestScore: real('lowest_score').default(0.0),
  readinessScore: integer('readiness_score').default(0),
  readinessLevel: text('readiness_level'),
  lastReadinessCalculation: timestamp('last_readiness_calculation'),
}, (table) => ({
  uniqueEnrollment: unique('qbank_enrollment_unique').on(table.studentId, table.qbankId),
}));

// Q-Bank Access Requests
export const qbankAccessRequests = pgTable('qbank_access_requests', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  qbankId: integer('qbank_id').notNull().references(() => questionBanks.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
});



// Q-Bank Question Statistics (aggregated per user per question)
export const qbankQuestionStatistics = pgTable(
  'qbank_question_statistics',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => qbankQuestions.id, { onDelete: 'cascade' }),
    questionBankId: integer('question_bank_id')
      .notNull()
      .references(() => questionBanks.id, { onDelete: 'cascade' }),
    timesAttempted: integer('times_attempted').notNull().default(0),
    timesCorrect: integer('times_correct').notNull().default(0),
    timesIncorrect: integer('times_incorrect').notNull().default(0),
    timesOmitted: integer('times_omitted').notNull().default(0),
    timesCorrectOnReattempt: integer('times_correct_on_reattempt').notNull().default(0),
    confidenceLevel: text('confidence_level'), // pending_review, low_confidence, high_confidence, correct_on_reattempt
    lastAttemptedAt: timestamp('last_attempted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userQuestionUnique: unique('user_question_statistics_unique').on(
      table.userId,
      table.questionId
    ),
  })
);

// Q-Bank Marked Questions (questions marked for review by students)
export const qbankMarkedQuestions = pgTable(
  'qbank_marked_questions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => qbankQuestions.id, { onDelete: 'cascade' }),
    questionBankId: integer('question_bank_id')
      .notNull()
      .references(() => questionBanks.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    markedAt: timestamp('marked_at').notNull().defaultNow(),
  },
  (table) => ({
    userQuestionUnique: unique('user_marked_question_unique').on(
      table.userId,
      table.questionId
    ),
  })
);

// Q-Bank Relations
export const questionBanksRelations = relations(questionBanks, ({ one, many }) => ({
  course: one(courses, {
    fields: [questionBanks.courseId],
    references: [courses.id],
  }),
  questions: many(qbankQuestions),
  tests: many(qbankTests),
  enrollments: many(qbankEnrollments),
  accessRequests: many(qbankAccessRequests),
  testAttempts: many(qbankTestAttempts),
}));

export const qbankCategoriesRelations = relations(qbankCategories, ({ one, many }) => ({
  parentCategory: one(qbankCategories, {
    fields: [qbankCategories.parentCategoryId],
    references: [qbankCategories.id],
    relationName: 'subcategories',
  }),
  subcategories: many(qbankCategories, { relationName: 'subcategories' }),
  questions: many(qbankQuestions),
}));

export const qbankQuestionsRelations = relations(qbankQuestions, ({ one, many }) => ({
  questionBank: one(questionBanks, {
    fields: [qbankQuestions.questionBankId],
    references: [questionBanks.id],
  }),
  category: one(qbankCategories, {
    fields: [qbankQuestions.categoryId],
    references: [qbankCategories.id],
  }),
  attempts: many(qbankQuestionAttempts),
  statistics: many(qbankQuestionStatistics),
  quizLinks: many(quizQbankQuestions),
}));

export const qbankTestsRelations = relations(qbankTests, ({ one, many }) => ({
  questionBank: one(questionBanks, {
    fields: [qbankTests.questionBankId],
    references: [questionBanks.id],
  }),
  user: one(users, {
    fields: [qbankTests.userId],
    references: [users.id],
  }),
  questionAttempts: many(qbankQuestionAttempts),
}));

export const qbankQuestionAttemptsRelations = relations(qbankQuestionAttempts, ({ one }) => ({
  test: one(qbankTests, {
    fields: [qbankQuestionAttempts.testId],
    references: [qbankTests.id],
  }),
  question: one(qbankQuestions, {
    fields: [qbankQuestionAttempts.questionId],
    references: [qbankQuestions.id],
  }),
  user: one(users, {
    fields: [qbankQuestionAttempts.userId],
    references: [users.id],
  }),
}));

export const qbankQuestionStatisticsRelations = relations(qbankQuestionStatistics, ({ one }) => ({
  user: one(users, {
    fields: [qbankQuestionStatistics.userId],
    references: [users.id],
  }),
  question: one(qbankQuestions, {
    fields: [qbankQuestionStatistics.questionId],
    references: [qbankQuestions.id],
  }),
  questionBank: one(questionBanks, {
    fields: [qbankQuestionStatistics.questionBankId],
    references: [questionBanks.id],
  }),
}));

// Q-Bank Test Attempts (Archer-style)
export const qbankTestAttempts = pgTable('qbank_test_attempts', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => qbankEnrollments.id, { onDelete: 'cascade' }),
  qbankId: integer('qbank_id').notNull().references(() => questionBanks.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  testMode: text('test_mode').notNull(), // tutorial | timed | assessment
  testType: text('test_type'),
  categoryFilter: integer('category_filter').references(() => qbankCategories.id),
  difficultyFilter: text('difficulty_filter'), // easy | medium | hard | mixed
  questionCount: integer('question_count').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  timeLimitMinutes: integer('time_limit_minutes'),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  score: real('score'),
  correctCount: integer('correct_count'),
  incorrectCount: integer('incorrect_count'),
  unansweredCount: integer('unanswered_count').default(0),
  flaggedCount: integer('flagged_count').default(0), // Questions marked for review
  visitedCount: integer('visited_count').default(0), // Questions that were viewed
  skippedCount: integer('skipped_count').default(0), // Questions visited but not answered
  markedForReviewCount: integer('marked_for_review_count').default(0), // Questions marked during test
  questionsData: text('questions_data'), // JSON: detailed per-question status array
  isCompleted: boolean('is_completed').notNull().default(false),
  isPassed: boolean('is_passed'),
  averageTimePerQuestion: real('average_time_per_question'),
  confidenceLevel: text('confidence_level'), // low | medium | high
  performanceBreakdown: text('performance_breakdown'), // JSON: {bySubject, byDifficulty, byQuestionType}
});

// Q-Bank Category Performance
export const qbankCategoryPerformance = pgTable('qbank_category_performance', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => qbankEnrollments.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => qbankCategories.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionsAttempted: integer('questions_attempted').default(0),
  questionsCorrect: integer('questions_correct').default(0),
  accuracyPercentage: real('accuracy_percentage').default(0.0),
  averageTimeSeconds: real('average_time_seconds').default(0.0),
  performanceLevel: text('performance_level'), // weak | developing | proficient | mastery
  needsRemediation: boolean('needs_remediation').default(false),
  lastAttemptAt: timestamp('last_attempt_at'),
  firstAttemptAt: timestamp('first_attempt_at').defaultNow(),
}, (table) => ({
  enrollmentCategoryUnique: unique('qbank_category_perf_unique').on(table.enrollmentId, table.categoryId),
}));

// Q-Bank Subject Performance
export const qbankSubjectPerformance = pgTable('qbank_subject_performance', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => qbankEnrollments.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  lesson: text('lesson'),
  clientNeedArea: text('client_need_area'),
  subcategory: text('subcategory'),
  questionsAttempted: integer('questions_attempted').default(0),
  questionsCorrect: integer('questions_correct').default(0),
  accuracyPercentage: real('accuracy_percentage').default(0.0),
  performanceLevel: text('performance_level'),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Q-Bank Remediation Tracking
export const qbankRemediationTracking = pgTable('qbank_remediation_tracking', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => qbankEnrollments.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => qbankQuestions.id, { onDelete: 'cascade' }),
  needsRemediation: boolean('needs_remediation').default(true),
  remediationCompleted: boolean('remediation_completed').default(false),
  firstIncorrectAt: timestamp('first_incorrect_at').notNull().defaultNow(),
  remediationStartedAt: timestamp('remediation_started_at'),
  masteredAt: timestamp('mastered_at'),
  totalAttempts: integer('total_attempts').default(1),
  consecutiveCorrect: integer('consecutive_correct').default(0),
  recommendedResources: text('recommended_resources'), // JSON array
}, (table) => ({
  enrollmentQuestionUnique: unique('qbank_remediation_unique').on(table.enrollmentId, table.questionId),
}));

// Q-Bank Study Recommendations
export const qbankStudyRecommendations = pgTable('qbank_study_recommendations', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').notNull().references(() => qbankEnrollments.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recommendationType: text('recommendation_type').notNull(), // focus_area | test_strategy | time_management | confidence
  priority: text('priority').notNull(), // high | medium | low
  title: text('title').notNull(),
  description: text('description').notNull(),
  actionItems: text('action_items'), // JSON array
  categoryId: integer('category_id').references(() => qbankCategories.id),
  subject: text('subject'),
  isDismissed: boolean('is_dismissed').default(false),
  isCompleted: boolean('is_completed').default(false),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Q-Bank Test Question Details - Precise per-question status tracking (ArcherReview-style)
// Tracks each question's status within a specific test attempt
export const qbankTestQuestionDetails = pgTable('qbank_test_question_details', {
  id: serial('id').primaryKey(),
  testAttemptId: integer('test_attempt_id').notNull().references(() => qbankTestAttempts.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => qbankQuestions.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionOrder: integer('question_order').notNull(), // Position in the test

  // Question Status Tracking
  status: text('status').notNull().default('unvisited'), // 'unvisited' | 'visited' | 'answered' | 'skipped'
  isFlagged: boolean('is_flagged').notNull().default(false), // User flagged for later review
  isMarkedForReview: boolean('is_marked_for_review').notNull().default(false), // User wants to return
  isConfident: boolean('is_confident'), // User's self-assessed confidence

  // Answer Details
  userAnswer: text('user_answer'), // JSON for SATA, single value for MCQ
  isCorrect: boolean('is_correct'),
  isPartiallyCorrect: boolean('is_partially_correct').default(false),
  pointsEarned: real('points_earned').default(0),
  maxPoints: real('max_points').default(1),

  // Timing Tracking
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  visitedAt: timestamp('visited_at'), // When question was first viewed
  answeredAt: timestamp('answered_at'), // When answer was submitted
  lastModifiedAt: timestamp('last_modified_at'), // Last answer change

  // Additional Metadata
  answerChanges: integer('answer_changes').default(0), // Number of times answer was changed
  exhibitsViewed: text('exhibits_viewed'), // JSON array of exhibit IDs viewed
  rationales: text('rationales'), // JSON: user selected rationale choices

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  testQuestionUnique: unique('qbank_test_question_detail_unique').on(table.testAttemptId, table.questionId),
}));
export const qbankEnrollmentsRelations = relations(qbankEnrollments, ({ one, many }) => ({
  student: one(users, {
    fields: [qbankEnrollments.studentId],
    references: [users.id],
  }),
  qbank: one(questionBanks, {
    fields: [qbankEnrollments.qbankId],
    references: [questionBanks.id],
  }),
  testAttempts: many(qbankTestAttempts),
  categoryPerformance: many(qbankCategoryPerformance),
  subjectPerformance: many(qbankSubjectPerformance),
  remediationTracking: many(qbankRemediationTracking),
  studyRecommendations: many(qbankStudyRecommendations),
}));

export const qbankAccessRequestsRelations = relations(qbankAccessRequests, ({ one }) => ({
  student: one(users, {
    fields: [qbankAccessRequests.studentId],
    references: [users.id],
  }),
  qbank: one(questionBanks, {
    fields: [qbankAccessRequests.qbankId],
    references: [questionBanks.id],
  }),
  reviewer: one(users, {
    fields: [qbankAccessRequests.reviewedBy],
    references: [users.id],
    relationName: 'reviewer',
  }),
}));

export const qbankTestAttemptsRelations = relations(qbankTestAttempts, ({ one, many }) => ({
  enrollment: one(qbankEnrollments, {
    fields: [qbankTestAttempts.enrollmentId],
    references: [qbankEnrollments.id],
  }),
  qbank: one(questionBanks, {
    fields: [qbankTestAttempts.qbankId],
    references: [questionBanks.id],
  }),
  student: one(users, {
    fields: [qbankTestAttempts.studentId],
    references: [users.id],
  }),
  categoryFilter: one(qbankCategories, {
    fields: [qbankTestAttempts.categoryFilter],
    references: [qbankCategories.id],
  }),
  questionDetails: many(qbankTestQuestionDetails), // Detailed per-question status
}));

// Q-Bank Test Question Details Relations
export const qbankTestQuestionDetailsRelations = relations(qbankTestQuestionDetails, ({ one }) => ({
  testAttempt: one(qbankTestAttempts, {
    fields: [qbankTestQuestionDetails.testAttemptId],
    references: [qbankTestAttempts.id],
  }),
  question: one(qbankQuestions, {
    fields: [qbankTestQuestionDetails.questionId],
    references: [qbankQuestions.id],
  }),
  student: one(users, {
    fields: [qbankTestQuestionDetails.studentId],
    references: [users.id],
  }),
}));

export const qbankCategoryPerformanceRelations = relations(qbankCategoryPerformance, ({ one }) => ({
  enrollment: one(qbankEnrollments, {
    fields: [qbankCategoryPerformance.enrollmentId],
    references: [qbankEnrollments.id],
  }),
  category: one(qbankCategories, {
    fields: [qbankCategoryPerformance.categoryId],
    references: [qbankCategories.id],
  }),
  student: one(users, {
    fields: [qbankCategoryPerformance.studentId],
    references: [users.id],
  }),
}));

export const qbankSubjectPerformanceRelations = relations(qbankSubjectPerformance, ({ one }) => ({
  enrollment: one(qbankEnrollments, {
    fields: [qbankSubjectPerformance.enrollmentId],
    references: [qbankEnrollments.id],
  }),
  student: one(users, {
    fields: [qbankSubjectPerformance.studentId],
    references: [users.id],
  }),
}));

export const qbankRemediationTrackingRelations = relations(qbankRemediationTracking, ({ one }) => ({
  enrollment: one(qbankEnrollments, {
    fields: [qbankRemediationTracking.enrollmentId],
    references: [qbankEnrollments.id],
  }),
  student: one(users, {
    fields: [qbankRemediationTracking.studentId],
    references: [users.id],
  }),
  question: one(qbankQuestions, {
    fields: [qbankRemediationTracking.questionId],
    references: [qbankQuestions.id],
  }),
}));

export const qbankStudyRecommendationsRelations = relations(qbankStudyRecommendations, ({ one }) => ({
  enrollment: one(qbankEnrollments, {
    fields: [qbankStudyRecommendations.enrollmentId],
    references: [qbankEnrollments.id],
  }),
  student: one(users, {
    fields: [qbankStudyRecommendations.studentId],
    references: [users.id],
  }),
  category: one(qbankCategories, {
    fields: [qbankStudyRecommendations.categoryId],
    references: [qbankCategories.id],
  }),
}));

// Textbook Relations
export const textbooksRelations = relations(textbooks, ({ one, many }) => ({
  course: one(courses, {
    fields: [textbooks.courseId],
    references: [courses.id],
  }),
  purchases: many(textbookPurchases),
  accessLogs: many(textbookAccessLogs),
  readingProgress: many(textbookReadingProgress),
}));

export const textbookPurchasesRelations = relations(textbookPurchases, ({ one }) => ({
  student: one(users, {
    fields: [textbookPurchases.studentId],
    references: [users.id],
  }),
  textbook: one(textbooks, {
    fields: [textbookPurchases.textbookId],
    references: [textbooks.id],
  }),
  // Removed payment relation to break circular dependency:
  // payments → textbooks → textbookPurchases → payments
  // Use manual join when needed: textbookPurchases.paymentId → payments.id
}));

export const textbookAccessLogsRelations = relations(textbookAccessLogs, ({ one }) => ({
  student: one(users, {
    fields: [textbookAccessLogs.studentId],
    references: [users.id],
  }),
  textbook: one(textbooks, {
    fields: [textbookAccessLogs.textbookId],
    references: [textbooks.id],
  }),
}));

export const textbookReadingProgressRelations = relations(textbookReadingProgress, ({ one }) => ({
  student: one(users, {
    fields: [textbookReadingProgress.studentId],
    references: [users.id],
  }),
  textbook: one(textbooks, {
    fields: [textbookReadingProgress.textbookId],
    references: [textbooks.id],
  }),
}));

// Payments Relations
// Note: textbook relation removed to break circular dependency:
// payments → textbooks → textbookPurchases → payments
// To access textbook from payment, use manual join: payments.textbookId → textbooks.id
export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [payments.courseId],
    references: [courses.id],
  }),
  // Removed textbook relation to break circular dependency
  // Use manual join when needed: payments.textbookId → textbooks.id
}));

// Note: questionBanks relation to courses is handled via foreign key,
// but if needed, it can be added to coursesRelations above

// Enrollments table
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
    updatedAt: timestamp('updated_at').notNull().defaultNow(), // ADD updatedAt for tracking
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    userCourseUnique: unique('user_course_enrollment_unique').on(table.userId, table.courseId),
  })
);

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

// Quiz Attempts table (for Course Quizzes)
export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }), // Direct reference to quiz
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }), // Kept for backward compatibility and easier queries
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').notNull(),
  answers: text('answers').notNull(), // JSON string of answers
  timeTaken: integer('time_taken').notNull(), // seconds
  passed: boolean('passed').notNull().default(false),
  attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  chapter: one(chapters, {
    fields: [quizAttempts.chapterId],
    references: [chapters.id],
  }),
}));

// Idempotency Keys table - prevents duplicate processing of operations
export const idempotencyKeys = pgTable('idempotency_keys', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  operation: text('operation').notNull(), // e.g., 'payment_webhook', 'enrollment'
  result: text('result'), // JSON string of the operation result
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  keyUnique: unique('idempotency_key_unique').on(table.key),
}));

// NOTE: Textbook tables (textbookPurchases, textbookAccessLogs, textbookReadingProgress) moved earlier in file (lines 260-297) to avoid forward reference



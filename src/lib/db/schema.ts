import { pgTable, text, serial, integer, real, boolean, timestamp, unique, jsonb } from 'drizzle-orm/pg-core';
import type { NursingCandidateFormPayload } from '@/types/nursing-candidate';
import { relations } from 'drizzle-orm';

// Users table
// Changed: email is no longer unique alone - now (email, role) must be unique together
// This allows same email to have both student and admin accounts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(), // Removed .unique() - now part of composite unique
  password: text('password').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('student'),
  isActive: boolean('is_active').notNull().default(true),
  faceIdEnrolled: boolean('face_id_enrolled').notNull().default(false),
  faceTemplate: text('face_template'),
  fingerprintEnrolled: boolean('fingerprint_enrolled').notNull().default(false),
  fingerprintCredentialId: text('fingerprint_credential_id'), // WebAuthn credential ID
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: text('two_factor_secret'), // TOTP secret
  twoFactorBackupCodes: text('two_factor_backup_codes'), // JSON array of backup codes
  bio: text('bio'),
  profilePicture: text('profile_picture'), // URL or path to profile picture
  joinedDate: timestamp('joined_date').notNull().defaultNow(),
  lastLogin: timestamp('last_login'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Modules table
export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
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
  moduleId: integer('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
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
});

// Quizzes table
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  passMark: integer('pass_mark').notNull().default(70),
  timeLimit: integer('time_limit'),
  showAnswers: boolean('show_answers').notNull().default(true),
  maxAttempts: integer('max_attempts').notNull().default(3),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quiz Questions table
export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: text('options').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
  order: integer('order').notNull(),
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
  studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
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
});

// Daily Videos table
export const dailyVideos = pgTable('daily_videos', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  day: integer('day').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Sessions table for session management
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').unique().notNull(),
  deviceInfo: text('device_info'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Payments/Transactions table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
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

// Relations
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
  dailyVideos: many(dailyVideos),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  chapter: one(chapters, {
    fields: [quizzes.chapterId],
    references: [chapters.id],
  }),
  questions: many(quizQuestions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
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

export const dailyVideosRelations = relations(dailyVideos, ({ one }) => ({
  chapter: one(chapters, {
    fields: [dailyVideos.chapterId],
    references: [chapters.id],
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

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [payments.courseId],
    references: [courses.id],
  }),
}));

// Course Reviews & Ratings
export const courseReviews = pgTable('course_reviews', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  review: text('review'),
  isPublished: boolean('is_published').notNull().default(true),
  helpful: integer('helpful').notNull().default(0), // Number of helpful votes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // One review per user per course
  userCourseUnique: unique('user_course_review_unique').on(table.userId, table.courseId),
}));

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
export const wishlist = pgTable('wishlist', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => ({
  // One wishlist entry per user per course
  userCourseUnique: unique('user_course_wishlist_unique').on(table.userId, table.courseId),
}));

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
  parent: one(courseCategories, {
    fields: [courseCategories.parentId],
    references: [courseCategories.id],
    relationName: 'parent',
  }),
  children: many(courseCategories, { relationName: 'parent' }),
  courses: many(courses),
}));

// Course-Category mapping (many-to-many)
export const courseCategoryMapping = pgTable('course_category_mapping', {
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => courseCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: unique('course_category_pk').on(table.courseId, table.categoryId),
}));

// Completion Certificates
export const certificates = pgTable('certificates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  certificateNumber: text('certificate_number').notNull().unique(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  pdfUrl: text('pdf_url'),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
}, (table) => ({
  // One certificate per user per course
  userCourseUnique: unique('user_course_certificate_unique').on(table.userId, table.courseId),
}));

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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
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
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  questionId: integer('question_id').notNull().references(() => courseQuestions.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  couponId: integer('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentId: integer('payment_id').references(() => payments.id),
  discountAmount: real('discount_amount').notNull(),
  usedAt: timestamp('used_at').notNull().defaultNow(),
});

// Video Progress Tracking (Detailed)
export const videoProgress = pgTable('video_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  currentTime: integer('current_time').notNull().default(0), // In seconds
  duration: integer('duration').notNull(), // In seconds
  watchedPercentage: real('watched_percentage').notNull().default(0),
  completed: boolean('completed').notNull().default(false),
  lastWatchedAt: timestamp('last_watched_at').notNull().defaultNow(),
}, (table) => ({
  userChapterUnique: unique('user_chapter_progress_unique').on(table.userId, table.chapterId),
}));

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
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
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
  documentChecklistAcknowledged: boolean('document_checklist_acknowledged').notNull().default(false),
  disciplinaryAction: text('disciplinary_action').notNull(),
  documentEmailStatus: text('document_email_status').notNull().default('pending'),
  documentEmailError: text('document_email_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
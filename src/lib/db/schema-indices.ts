import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enhanced users table with indices
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    role: varchar('role', { length: 50 }).notNull().default('student'),
    phoneNumber: varchar('phone_number', { length: 20 }),
    profilePicture: text('profile_picture'),
    bio: text('bio'),
    isActive: boolean('is_active').notNull().default(true),
    faceIdEnrolled: boolean('face_id_enrolled').notNull().default(false),
    faceTemplate: text('face_template'),
    fingerprintEnrolled: boolean('fingerprint_enrolled').notNull().default(false),
    fingerprintTemplate: text('fingerprint_template'),
    lastLogin: timestamp('last_login'),
    emailVerified: boolean('email_verified').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Add indices for better query performance
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
    lastLoginIdx: index('users_last_login_idx').on(table.lastLogin),
  })
);

// Enhanced studentProgress with indices
export const studentProgress = pgTable(
  'student_progress',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    totalProgress: integer('total_progress').notNull().default(0),
    completedChapters: text('completed_chapters').default('[]'),
    lastAccessed: timestamp('last_accessed').defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentIdIdx: index('student_progress_student_id_idx').on(table.studentId),
    courseIdIdx: index('student_progress_course_id_idx').on(table.courseId),
    uniqueEnrollment: uniqueIndex('student_course_unique').on(table.studentId, table.courseId),
  })
);

// Enhanced accessRequests with status index
export const accessRequests = pgTable(
  'access_requests',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    note: text('note'),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('access_requests_status_idx').on(table.status),
    studentIdIdx: index('access_requests_student_id_idx').on(table.studentId),
    courseIdIdx: index('access_requests_course_id_idx').on(table.courseId),
    createdAtIdx: index('access_requests_created_at_idx').on(table.createdAt),
  })
);

// Enhanced sessions table for force logout
export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    deviceInfo: text('device_info'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    tokenIdx: index('sessions_token_idx').on(table.token),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  })
);

// Enhanced notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    type: varchar('type', { length: 50 }).notNull().default('info'),
    isRead: boolean('is_read').notNull().default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  })
);

// Import index and uniqueIndex from drizzle-orm/pg-core
import { index, uniqueIndex } from 'drizzle-orm/pg-core';

// Export all other existing tables (courses, modules, chapters, etc.)
// ... (keep all existing table definitions)

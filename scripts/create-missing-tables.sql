-- Create missing tables for LMS Platform
-- Run this script directly in your PostgreSQL database

-- 1. Create access_requests table
CREATE TABLE IF NOT EXISTS "access_requests" (
  "id" SERIAL PRIMARY KEY,
  "student_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" INTEGER NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requested_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "reviewed_at" TIMESTAMP,
  "reviewed_by" INTEGER REFERENCES "users"("id")
);

-- 2. Create enrollments table
CREATE TABLE IF NOT EXISTS "enrollments" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" INTEGER NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'active',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "enrolled_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  UNIQUE("user_id", "course_id")
);

-- 3. Create student_progress table
CREATE TABLE IF NOT EXISTS "student_progress" (
  "id" SERIAL PRIMARY KEY,
  "student_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" INTEGER NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "completed_chapters" TEXT NOT NULL DEFAULT '[]',
  "watched_videos" TEXT NOT NULL DEFAULT '[]',
  "quiz_attempts" TEXT NOT NULL DEFAULT '[]',
  "total_progress" INTEGER NOT NULL DEFAULT 0,
  "last_accessed" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("student_id", "course_id")
);

-- 4. Create payments table (if missing)
CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" INTEGER REFERENCES "courses"("id") ON DELETE CASCADE,
  "amount" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payment_method" TEXT,
  "transaction_id" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "access_requests_student_id_idx" ON "access_requests"("student_id");
CREATE INDEX IF NOT EXISTS "access_requests_course_id_idx" ON "access_requests"("course_id");
CREATE INDEX IF NOT EXISTS "access_requests_status_idx" ON "access_requests"("status");

CREATE INDEX IF NOT EXISTS "enrollments_user_id_idx" ON "enrollments"("user_id");
CREATE INDEX IF NOT EXISTS "enrollments_course_id_idx" ON "enrollments"("course_id");
CREATE INDEX IF NOT EXISTS "enrollments_status_idx" ON "enrollments"("status");

CREATE INDEX IF NOT EXISTS "student_progress_student_id_idx" ON "student_progress"("student_id");
CREATE INDEX IF NOT EXISTS "student_progress_course_id_idx" ON "student_progress"("course_id");

CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "payments_course_id_idx" ON "payments"("course_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");





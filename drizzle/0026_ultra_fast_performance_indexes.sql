-- Ultra-Fast Performance Indexes Migration
-- Date: 2025-01-XX
-- Purpose: Add comprehensive indexes to achieve <100ms API response times
-- These indexes dramatically improve query performance for large datasets

-- ============================================
-- COMPOSITE INDEXES (Multi-column WHERE clauses)
-- ============================================

-- Enrollment composite indexes (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course_status 
  ON enrollments(user_id, course_id, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_status 
  ON enrollments(user_id, status) WHERE status = 'active';

-- Student Progress composite indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_student_course_composite 
  ON student_progress(student_id, course_id);

-- Access Requests composite indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_student_course_status_composite 
  ON access_requests(student_id, course_id, status);

CREATE INDEX IF NOT EXISTS idx_access_requests_student_status 
  ON access_requests(student_id, status);

-- Payments composite indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_course_status_created 
  ON payments(user_id, course_id, status, created_at DESC) 
  WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_user_status 
  ON payments(user_id, status);

-- Users composite index (matches unique constraint)
CREATE INDEX IF NOT EXISTS idx_users_email_role_composite 
  ON users(email, role);

-- Video Progress composite index
CREATE INDEX IF NOT EXISTS idx_video_progress_user_chapter_composite 
  ON video_progress(user_id, chapter_id);

-- Q-Bank composite indexes
CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_student_status 
  ON qbank_access_requests(student_id, status);

CREATE INDEX IF NOT EXISTS idx_qbank_enrollments_student_qbank 
  ON qbank_enrollments(student_id, qbank_id);

CREATE INDEX IF NOT EXISTS idx_qbank_test_attempts_student_qbank 
  ON qbank_test_attempts(student_id, qbank_id);

-- ============================================
-- COVERING INDEXES (Include frequently selected columns)
-- ============================================

-- Courses covering index for listings (most common query)
CREATE INDEX IF NOT EXISTS idx_courses_status_created_covering 
  ON courses(status, created_at DESC) 
  INCLUDE (id, title, description, instructor, thumbnail, pricing, is_public, is_requestable, is_default_unlocked)
  WHERE status IN ('published', 'active');

-- Enrollments covering index
CREATE INDEX IF NOT EXISTS idx_enrollments_user_covering 
  ON enrollments(user_id, status) 
  INCLUDE (course_id, progress, enrolled_at, updated_at)
  WHERE status = 'active';

-- Student Progress covering index
CREATE INDEX IF NOT EXISTS idx_student_progress_student_covering 
  ON student_progress(student_id) 
  INCLUDE (course_id, total_progress, last_accessed);

-- ============================================
-- PARTIAL INDEXES (Filtered queries)
-- ============================================

-- Courses partial indexes (only published/active)
CREATE INDEX IF NOT EXISTS idx_courses_published_active 
  ON courses(id, created_at DESC) 
  WHERE status IN ('published', 'active');

-- Enrollments partial index (only active)
CREATE INDEX IF NOT EXISTS idx_enrollments_active_only 
  ON enrollments(user_id, course_id, enrolled_at DESC) 
  WHERE status = 'active';

-- Access Requests partial indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_pending 
  ON access_requests(student_id, course_id, requested_at DESC) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_access_requests_approved 
  ON access_requests(student_id, course_id, requested_at DESC) 
  WHERE status = 'approved';

-- Payments partial index (only completed)
CREATE INDEX IF NOT EXISTS idx_payments_completed 
  ON payments(user_id, course_id, created_at DESC) 
  WHERE status = 'completed';

-- Users partial index (only active)
CREATE INDEX IF NOT EXISTS idx_users_active_students 
  ON users(id, email, name, role) 
  WHERE role = 'student' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_active_admins 
  ON users(id, email, name, role) 
  WHERE role = 'admin' AND is_active = true;

-- ============================================
-- TIMESTAMP INDEXES (For sorting and filtering)
-- ============================================

-- Courses timestamp indexes
CREATE INDEX IF NOT EXISTS idx_courses_created_at_desc 
  ON courses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_updated_at_desc 
  ON courses(updated_at DESC);

-- Enrollments timestamp indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at_desc 
  ON enrollments(enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrollments_updated_at_desc 
  ON enrollments(updated_at DESC);

-- Access Requests timestamp indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at_desc 
  ON access_requests(requested_at DESC);

-- Payments timestamp indexes
CREATE INDEX IF NOT EXISTS idx_payments_created_at_desc 
  ON payments(created_at DESC);

-- Student Progress timestamp indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_last_accessed_desc 
  ON student_progress(last_accessed DESC NULLS LAST);

-- Video Progress timestamp indexes
CREATE INDEX IF NOT EXISTS idx_video_progress_updated_at_desc 
  ON video_progress(updated_at DESC);

-- Activity Logs timestamp indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc 
  ON activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_activity_logs_created_at_desc 
  ON student_activity_logs(created_at DESC);

-- ============================================
-- COMPUTED EXPRESSION INDEXES
-- ============================================

-- Case-insensitive status lookups
CREATE INDEX IF NOT EXISTS idx_courses_status_lower 
  ON courses(LOWER(status));

CREATE INDEX IF NOT EXISTS idx_enrollments_status_lower 
  ON enrollments(LOWER(status));

-- ============================================
-- GIN INDEXES (For JSONB columns)
-- ============================================

-- Users settings JSONB index (if settings column is frequently queried)
CREATE INDEX IF NOT EXISTS idx_users_settings_gin 
  ON users USING GIN(settings) 
  WHERE settings IS NOT NULL;

-- ============================================
-- ADDITIONAL FOREIGN KEY INDEXES (If missing)
-- ============================================

-- Ensure all foreign keys have indexes for JOIN performance
CREATE INDEX IF NOT EXISTS idx_modules_course_id_fk 
  ON modules(course_id);

CREATE INDEX IF NOT EXISTS idx_chapters_module_id_fk 
  ON chapters(module_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id_fk 
  ON quizzes(chapter_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id_fk 
  ON quiz_questions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz 
  ON quiz_attempts(user_id, quiz_id);

CREATE INDEX IF NOT EXISTS idx_course_questions_course_user 
  ON course_questions(course_id, user_id);

CREATE INDEX IF NOT EXISTS idx_course_answers_question_user 
  ON course_answers(question_id, user_id);

-- ============================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================

ANALYZE courses;
ANALYZE enrollments;
ANALYZE student_progress;
ANALYZE access_requests;
ANALYZE users;
ANALYZE payments;
ANALYZE video_progress;
ANALYZE qbank_enrollments;
ANALYZE qbank_access_requests;


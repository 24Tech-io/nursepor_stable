-- Performance Optimization: Add indexes for frequently queried columns
-- This migration improves query performance significantly

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_public ON courses(is_public);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);

-- Modules table indexes
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_published ON modules(is_published);
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules(course_id, "order");

-- Chapters table indexes
CREATE INDEX IF NOT EXISTS idx_chapters_module_id ON chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_chapters_published ON chapters(is_published);
CREATE INDEX IF NOT EXISTS idx_chapters_type ON chapters(type);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(module_id, "order");

-- Enrollments table indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);

-- Student Progress table indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course_id ON student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_course ON student_progress(student_id, course_id);

-- Access Requests table indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_student_id ON access_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_course_id ON access_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_student_status ON access_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at DESC);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Q-Bank indexes
CREATE INDEX IF NOT EXISTS idx_qbank_questions_category_id ON qbank_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_qbank_questions_course_id ON qbank_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_qbank_questions_difficulty ON qbank_questions(difficulty);

-- Quiz indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published);

-- Blog posts indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Daily videos indexes
CREATE INDEX IF NOT EXISTS idx_daily_videos_day ON daily_videos(day);
CREATE INDEX IF NOT EXISTS idx_daily_videos_active ON daily_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_videos_priority ON daily_videos(priority DESC, day);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);


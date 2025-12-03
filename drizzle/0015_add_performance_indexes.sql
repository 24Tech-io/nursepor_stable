-- Performance Optimization: Add indexes to speed up common queries
-- These indexes dramatically improve query performance for large datasets

-- Course-related indexes
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Module and Chapter indexes
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_module_id ON chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_chapters_type ON chapters(type);

-- Q-Bank indexes
CREATE INDEX IF NOT EXISTS idx_qbank_questions_category ON qbank_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_qbank_questions_test_type ON qbank_questions(test_type);
CREATE INDEX IF NOT EXISTS idx_qbank_questions_question_type ON qbank_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_qbank_categories_name ON qbank_categories(name);

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Student Progress indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course_id ON student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_composite ON student_progress(student_id, course_id);

-- Quiz and Attempt indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);

-- Quiz-QBank linking indexes
CREATE INDEX IF NOT EXISTS idx_quiz_qbank_questions_quiz_id ON quiz_qbank_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_qbank_questions_question_id ON quiz_qbank_questions(question_id);

-- Course Question Assignment indexes
CREATE INDEX IF NOT EXISTS idx_course_question_assignments_course_id ON course_question_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_question_assignments_question_id ON course_question_assignments(question_id);

-- Access Request indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_course_id ON access_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Activity Log indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_user_module ON student_progress(student_id, module_id);


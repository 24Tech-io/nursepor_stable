-- Migration: Add Database Indexes for Performance
-- Date: 2025-12-16
-- Purpose: Add indexes on foreign keys and commonly queried columns

-- Indexes on foreign keys (improves JOIN performance)
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_module_id ON chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter_id ON quizzes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_student_id ON access_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_course_id ON access_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course_id ON student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_textbook_id ON payments(textbook_id) WHERE textbook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_course_id ON wishlist(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user_id ON course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_chapter_id ON course_notes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_bookmarks_user_id ON course_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_course_bookmarks_chapter_id ON course_bookmarks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_questions_course_id ON course_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_questions_chapter_id ON course_questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_questions_user_id ON course_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_answers_question_id ON course_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_course_answers_user_id ON course_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_payment_id ON coupon_usage(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_chapter_id ON video_progress(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_announcements_course_id ON course_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_chapter_id ON quiz_attempts(chapter_id);

-- Q-Bank indexes
CREATE INDEX IF NOT EXISTS idx_question_banks_course_id ON question_banks(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qbank_questions_question_bank_id ON qbank_questions(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_questions_category_id ON qbank_questions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qbank_tests_question_bank_id ON qbank_tests(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_tests_user_id ON qbank_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_qbank_enrollments_student_id ON qbank_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_enrollments_qbank_id ON qbank_enrollments(qbank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_student_id ON qbank_access_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_qbank_id ON qbank_access_requests(qbank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_question_attempts_test_id ON qbank_question_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_qbank_question_attempts_question_id ON qbank_question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_qbank_question_attempts_user_id ON qbank_question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_qbank_question_statistics_question_id ON qbank_question_statistics(question_id);
CREATE INDEX IF NOT EXISTS idx_qbank_question_statistics_question_bank_id ON qbank_question_statistics(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_test_attempts_enrollment_id ON qbank_test_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qbank_test_attempts_qbank_id ON qbank_test_attempts(qbank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_test_attempts_student_id ON qbank_test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_category_performance_enrollment_id ON qbank_category_performance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qbank_category_performance_category_id ON qbank_category_performance(category_id);
CREATE INDEX IF NOT EXISTS idx_qbank_category_performance_student_id ON qbank_category_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_subject_performance_enrollment_id ON qbank_subject_performance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qbank_subject_performance_student_id ON qbank_subject_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_remediation_tracking_enrollment_id ON qbank_remediation_tracking(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qbank_remediation_tracking_student_id ON qbank_remediation_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_remediation_tracking_question_id ON qbank_remediation_tracking(question_id);
CREATE INDEX IF NOT EXISTS idx_qbank_study_recommendations_enrollment_id ON qbank_study_recommendations(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qbank_study_recommendations_student_id ON qbank_study_recommendations(student_id);

-- Textbook indexes
CREATE INDEX IF NOT EXISTS idx_textbooks_course_id ON textbooks(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_textbook_purchases_student_id ON textbook_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_textbook_purchases_textbook_id ON textbook_purchases(textbook_id);
CREATE INDEX IF NOT EXISTS idx_textbook_purchases_payment_id ON textbook_purchases(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_textbook_access_logs_student_id ON textbook_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_textbook_access_logs_textbook_id ON textbook_access_logs(textbook_id);
CREATE INDEX IF NOT EXISTS idx_textbook_reading_progress_student_id ON textbook_reading_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_textbook_reading_progress_textbook_id ON textbook_reading_progress(textbook_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_user_course ON student_progress(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_student_status ON access_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_student_status ON qbank_access_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_item_type ON payments(item_type) WHERE item_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_textbook_purchases_student_textbook ON textbook_purchases(student_id, textbook_id);

-- Indexes on status fields (for filtering)
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_question_banks_status ON question_banks(status);
CREATE INDEX IF NOT EXISTS idx_textbooks_status ON textbooks(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_status ON qbank_access_requests(status);

-- Indexes on timestamps (for sorting and filtering)
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_qbank_access_requests_requested_at ON qbank_access_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON enrollments(enrolled_at);


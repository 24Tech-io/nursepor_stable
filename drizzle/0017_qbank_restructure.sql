-- Q-Bank System Restructuring Migration
-- Adds support for standalone Q-Banks, enrollments, analytics, and Archer-style features
-- Migration: 0017_qbank_restructure.sql

-- 1. Enhance questionBanks table with access control and metadata
ALTER TABLE question_banks
ADD COLUMN IF NOT EXISTS instructor TEXT,
ADD COLUMN IF NOT EXISTS thumbnail TEXT,
ADD COLUMN IF NOT EXISTS pricing REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS is_requestable BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_default_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;

-- Make courseId nullable for standalone Q-Banks
ALTER TABLE question_banks
ALTER COLUMN course_id DROP NOT NULL;

-- Add status constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_question_banks_status'
  ) THEN
    ALTER TABLE question_banks
    ADD CONSTRAINT check_question_banks_status CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- 2. Create qbankEnrollments table
CREATE TABLE IF NOT EXISTS qbank_enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qbank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  progress INTEGER DEFAULT 0,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  total_time_spent_minutes INTEGER DEFAULT 0,
  tests_completed INTEGER DEFAULT 0,
  tutorial_tests_completed INTEGER DEFAULT 0,
  timed_tests_completed INTEGER DEFAULT 0,
  assessment_tests_completed INTEGER DEFAULT 0,
  average_score REAL DEFAULT 0.0,
  highest_score REAL DEFAULT 0.0,
  lowest_score REAL DEFAULT 0.0,
  readiness_score INTEGER DEFAULT 0,
  readiness_level TEXT,
  last_readiness_calculation TIMESTAMP,
  CONSTRAINT qbank_enrollments_unique UNIQUE(student_id, qbank_id)
);

-- 3. Create qbankAccessRequests table
CREATE TABLE IF NOT EXISTS qbank_access_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qbank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  CONSTRAINT check_qbank_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 4. Create qbankTestAttempts table (Archer-style test tracking)
CREATE TABLE IF NOT EXISTS qbank_test_attempts (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES qbank_enrollments(id) ON DELETE CASCADE,
  qbank_id INTEGER NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_mode TEXT NOT NULL,
  test_type TEXT,
  category_filter INTEGER REFERENCES qbank_categories(id),
  difficulty_filter TEXT,
  question_count INTEGER NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_limit_minutes INTEGER,
  time_spent_seconds INTEGER DEFAULT 0,
  score REAL,
  correct_count INTEGER,
  incorrect_count INTEGER,
  unanswered_count INTEGER DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_passed BOOLEAN,
  average_time_per_question REAL,
  confidence_level TEXT,
  CONSTRAINT check_test_mode CHECK (test_mode IN ('tutorial', 'timed', 'assessment')),
  CONSTRAINT check_difficulty_filter CHECK (difficulty_filter IN ('easy', 'medium', 'hard', 'mixed') OR difficulty_filter IS NULL)
);

-- 5. Enhance qbankQuestionAttempts table
ALTER TABLE qbank_question_attempts
ADD COLUMN IF NOT EXISTS marked_for_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence_level TEXT,
ADD COLUMN IF NOT EXISTS is_first_attempt BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS selected_answer TEXT,
ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- Add constraint for confidence level
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_question_attempt_confidence'
  ) THEN
    ALTER TABLE qbank_question_attempts
    ADD CONSTRAINT check_question_attempt_confidence CHECK (confidence_level IN ('low', 'medium', 'high') OR confidence_level IS NULL);
  END IF;
END $$;

-- 6. Create qbankCategoryPerformance table
CREATE TABLE IF NOT EXISTS qbank_category_performance (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES qbank_enrollments(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES qbank_categories(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy_percentage REAL DEFAULT 0.0,
  average_time_seconds REAL DEFAULT 0.0,
  performance_level TEXT,
  needs_remediation BOOLEAN DEFAULT FALSE,
  last_attempt_at TIMESTAMP,
  first_attempt_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT qbank_category_perf_unique UNIQUE(enrollment_id, category_id),
  CONSTRAINT check_category_perf_level CHECK (performance_level IN ('weak', 'developing', 'proficient', 'mastery') OR performance_level IS NULL)
);

-- 7. Create qbankSubjectPerformance table
CREATE TABLE IF NOT EXISTS qbank_subject_performance (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES qbank_enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  lesson TEXT,
  client_need_area TEXT,
  subcategory TEXT,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy_percentage REAL DEFAULT 0.0,
  performance_level TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- 8. Create qbankRemediationTracking table
CREATE TABLE IF NOT EXISTS qbank_remediation_tracking (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES qbank_enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES qbank_questions(id) ON DELETE CASCADE,
  needs_remediation BOOLEAN DEFAULT TRUE,
  remediation_completed BOOLEAN DEFAULT FALSE,
  first_incorrect_at TIMESTAMP NOT NULL DEFAULT NOW(),
  remediation_started_at TIMESTAMP,
  mastered_at TIMESTAMP,
  total_attempts INTEGER DEFAULT 1,
  consecutive_correct INTEGER DEFAULT 0,
  recommended_resources TEXT,
  CONSTRAINT qbank_remediation_unique UNIQUE(enrollment_id, question_id)
);

-- 9. Create qbankStudyRecommendations table
CREATE TABLE IF NOT EXISTS qbank_study_recommendations (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES qbank_enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT,
  category_id INTEGER REFERENCES qbank_categories(id),
  subject TEXT,
  is_dismissed BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  CONSTRAINT check_recommendation_type CHECK (recommendation_type IN ('focus_area', 'test_strategy', 'time_management', 'confidence')),
  CONSTRAINT check_recommendation_priority CHECK (priority IN ('high', 'medium', 'low'))
);

-- 10. Enhance qbankQuestions table with global statistics
ALTER TABLE qbank_questions
ADD COLUMN IF NOT EXISTS times_attempted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_time_seconds REAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS global_accuracy_percentage REAL DEFAULT 0;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qbank_enrollments_student ON qbank_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_enrollments_qbank ON qbank_enrollments(qbank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_enrollments_progress ON qbank_enrollments(readiness_score);
CREATE INDEX IF NOT EXISTS idx_qbank_requests_student ON qbank_access_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_qbank_requests_status ON qbank_access_requests(status, qbank_id);
CREATE INDEX IF NOT EXISTS idx_qbank_requests_qbank ON qbank_access_requests(qbank_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_enrollment ON qbank_test_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON qbank_test_attempts(student_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_test_attempts_mode ON qbank_test_attempts(test_mode, is_completed);
CREATE INDEX IF NOT EXISTS idx_category_perf_enrollment ON qbank_category_performance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_category_perf_weakness ON qbank_category_performance(needs_remediation, performance_level);
CREATE INDEX IF NOT EXISTS idx_subject_perf_enrollment ON qbank_subject_performance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_subject_perf_subject ON qbank_subject_performance(subject, performance_level);
CREATE INDEX IF NOT EXISTS idx_remediation_student ON qbank_remediation_tracking(student_id, needs_remediation);
CREATE INDEX IF NOT EXISTS idx_remediation_enrollment ON qbank_remediation_tracking(enrollment_id, remediation_completed);
CREATE INDEX IF NOT EXISTS idx_recommendations_enrollment ON qbank_study_recommendations(enrollment_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON qbank_study_recommendations(priority, generated_at);
CREATE INDEX IF NOT EXISTS idx_qbanks_course ON question_banks(course_id);
CREATE INDEX IF NOT EXISTS idx_qbanks_status ON question_banks(status);
CREATE INDEX IF NOT EXISTS idx_qbanks_public ON question_banks(is_public, status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON qbank_questions(difficulty, global_accuracy_percentage);


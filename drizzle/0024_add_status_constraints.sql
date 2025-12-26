-- Add CHECK constraints for status fields to ensure data consistency
-- Migration: 0024_add_status_constraints.sql

-- Courses status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_courses_status'
  ) THEN
    ALTER TABLE courses
    ADD CONSTRAINT check_courses_status 
    CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- Enrollments status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_enrollments_status'
  ) THEN
    ALTER TABLE enrollments
    ADD CONSTRAINT check_enrollments_status
    CHECK (status IN ('active', 'completed', 'cancelled'));
  END IF;
END $$;

-- Access requests status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_access_requests_status'
  ) THEN
    ALTER TABLE access_requests
    ADD CONSTRAINT check_access_requests_status
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Question banks status constraint (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_question_banks_status'
  ) THEN
    ALTER TABLE question_banks
    ADD CONSTRAINT check_question_banks_status
    CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- Q-Bank access requests status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_qbank_access_requests_status'
  ) THEN
    ALTER TABLE qbank_access_requests
    ADD CONSTRAINT check_qbank_access_requests_status
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Payments status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_payments_status'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT check_payments_status
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;
END $$;


-- Migration: Add image_url and question_type fields to question tables
-- Date: 2024

-- Add image_url to qbank_questions table
ALTER TABLE qbank_questions
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add question_type and image_url to quiz_questions table
ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'mcq',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN quiz_questions.question_type IS 'Question type: mcq, sata, ngn_case_study, bowtie, trend, etc.';
COMMENT ON COLUMN quiz_questions.image_url IS 'URL to uploaded question image';
COMMENT ON COLUMN qbank_questions.image_url IS 'URL to uploaded question image';


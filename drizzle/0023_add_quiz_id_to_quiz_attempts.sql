-- Add quizId to quizAttempts table
-- Migration: 0023_add_quiz_id_to_quiz_attempts.sql

-- Add quizId column (nullable initially for data migration)
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS quiz_id INTEGER;

-- Populate quiz_id from chapter_id -> quizzes relationship
-- For each quiz_attempt, find the quiz associated with its chapter
UPDATE quiz_attempts qa
SET quiz_id = q.id
FROM quizzes q
WHERE qa.chapter_id = q.chapter_id
  AND qa.quiz_id IS NULL
  AND EXISTS (
    SELECT 1 FROM quizzes WHERE chapter_id = qa.chapter_id LIMIT 1
  );

-- Make quiz_id NOT NULL after data migration
-- First, handle any remaining NULLs (shouldn't happen if data is clean)
UPDATE quiz_attempts
SET quiz_id = (
  SELECT id FROM quizzes WHERE chapter_id = quiz_attempts.chapter_id LIMIT 1
)
WHERE quiz_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE quiz_attempts
ALTER COLUMN quiz_id SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quiz_attempts_quiz_id_quizzes_id_fk'
  ) THEN
    ALTER TABLE quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_quizzes_id_fk
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);


-- Add courseId to quizzes table and make chapterId optional
-- Migration: 0025_add_course_id_to_quizzes.sql

-- Add course_id column (nullable initially for data migration)
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS course_id INTEGER;

-- Populate course_id from existing chapter_id -> modules -> courses relationship
UPDATE quizzes q
SET course_id = (
  SELECT c.id
  FROM courses c
  INNER JOIN modules m ON m.course_id = c.id
  INNER JOIN chapters ch ON ch.module_id = m.id
  WHERE ch.id = q.chapter_id
  LIMIT 1
)
WHERE q.course_id IS NULL;

-- Make course_id NOT NULL after data migration
-- First, handle any remaining NULLs (shouldn't happen if data is clean)
UPDATE quizzes
SET course_id = (
  SELECT c.id
  FROM courses c
  INNER JOIN modules m ON m.course_id = c.id
  INNER JOIN chapters ch ON ch.module_id = m.id
  WHERE ch.id = quizzes.chapter_id
  LIMIT 1
)
WHERE course_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE quizzes
ALTER COLUMN course_id SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quizzes_course_id_courses_id_fk'
  ) THEN
    ALTER TABLE quizzes
    ADD CONSTRAINT quizzes_course_id_courses_id_fk
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make chapterId nullable (quizzes can exist without chapters)
ALTER TABLE quizzes
ALTER COLUMN chapter_id DROP NOT NULL;

-- Add question_source field to track which system is used
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS question_source TEXT NOT NULL DEFAULT 'legacy';

-- Add constraint for question_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_quizzes_question_source'
  ) THEN
    ALTER TABLE quizzes
    ADD CONSTRAINT check_quizzes_question_source
    CHECK (question_source IN ('qbank', 'legacy'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_chapter ON quizzes(course_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_question_source ON quizzes(question_source);


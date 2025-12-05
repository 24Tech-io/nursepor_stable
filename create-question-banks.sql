-- Create questionBanks for all courses with question assignments
-- This fixes the 404 error when creating tests

-- For Course 8 (NCLEX-RN Fundamentals)
INSERT INTO question_banks (course_id, name, description, is_active, created_at, updated_at)
VALUES (
  8,
  'NCLEX-RN Fundamentals Q-Bank',
  'Comprehensive practice questions for NCLEX-RN Fundamentals',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- For Course 16 (if it has questions)
INSERT INTO question_banks (course_id, name, description, is_active, created_at, updated_at)
VALUES (
  16,
  'Course 16 Q-Bank',
  'Practice questions for course 16',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT * FROM question_banks;


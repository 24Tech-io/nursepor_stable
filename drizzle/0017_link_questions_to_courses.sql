-- Migration: Link all existing Q-Bank questions to all courses
-- This makes admin-created questions visible to all students

-- Step 1: Assign all general bank questions to ALL courses
INSERT INTO course_question_assignments (course_id, question_id, is_module_specific, sort_order, created_at)
SELECT 
  c.id as course_id,
  q.id as question_id,
  false as is_module_specific,
  0 as sort_order,
  NOW() as created_at
FROM courses c
CROSS JOIN qbank_questions q
WHERE q.question_bank_id = (
  SELECT id FROM question_banks WHERE course_id IS NULL LIMIT 1
)
ON CONFLICT DO NOTHING;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_question_assignments_course 
  ON course_question_assignments(course_id);

CREATE INDEX IF NOT EXISTS idx_course_question_assignments_question 
  ON course_question_assignments(question_id);

CREATE INDEX IF NOT EXISTS idx_course_question_assignments_lookup 
  ON course_question_assignments(course_id, question_id);

-- Step 3: Log the result
DO $$
DECLARE
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO assignment_count FROM course_question_assignments;
  RAISE NOTICE 'Total question-course assignments: %', assignment_count;
END $$;


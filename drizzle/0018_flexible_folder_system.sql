-- Migration: Flexible Folder-Based Q-Bank System
-- Makes Q-Bank work for ANY course type, not just NCLEX

-- Step 1: Add course and module linking to categories
ALTER TABLE qbank_categories 
  ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'custom_category',
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qbank_categories_course ON qbank_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_qbank_categories_module ON qbank_categories(module_id);
CREATE INDEX IF NOT EXISTS idx_qbank_categories_type ON qbank_categories(category_type);

-- Step 3: Auto-create course folders for existing courses
INSERT INTO qbank_categories (name, course_id, category_type, is_auto_generated, icon, color)
SELECT 
  title || ' Q-Bank' as name,
  id as course_id,
  'course_folder' as category_type,
  true as is_auto_generated,
  '📚' as icon,
  '#8B5CF6' as color
FROM courses
WHERE NOT EXISTS (
  SELECT 1 FROM qbank_categories WHERE course_id = courses.id AND category_type = 'course_folder'
);

-- Step 4: Auto-create module folders for existing modules
INSERT INTO qbank_categories (name, course_id, module_id, parent_category_id, category_type, is_auto_generated, icon, color, sort_order)
SELECT 
  m.title as name,
  m.course_id,
  m.id as module_id,
  (SELECT id FROM qbank_categories 
   WHERE course_id = m.course_id 
   AND category_type = 'course_folder' 
   LIMIT 1) as parent_category_id,
  'module_folder' as category_type,
  true as is_auto_generated,
  '📂' as icon,
  '#6366F1' as color,
  m.order as sort_order
FROM modules m
WHERE NOT EXISTS (
  SELECT 1 FROM qbank_categories WHERE module_id = m.id AND category_type = 'module_folder'
);

-- Step 5: Update course_question_assignments to use module_id properly
-- (Table already exists, just ensure it's being used correctly)

-- Step 6: Log results
DO $$
DECLARE
  course_folder_count INTEGER;
  module_folder_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO course_folder_count FROM qbank_categories WHERE category_type = 'course_folder';
  SELECT COUNT(*) INTO module_folder_count FROM qbank_categories WHERE category_type = 'module_folder';
  
  RAISE NOTICE 'Flexible Q-Bank System Initialized:';
  RAISE NOTICE '  - Course folders created: %', course_folder_count;
  RAISE NOTICE '  - Module folders created: %', module_folder_count;
  RAISE NOTICE '  - Ready for dynamic organization!';
END $$;


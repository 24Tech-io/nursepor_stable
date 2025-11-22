-- Database Cleanup SQL Script
-- Remove all mock/test courses from the database
-- This can be run directly in your database console (Neon, pgAdmin, etc.)

-- IMPORTANT: Backup your database before running this script!

-- Step 1: Preview mock courses that will be deleted
SELECT id, title, instructor, status 
FROM courses 
WHERE 
  title ILIKE '%test%' 
  OR title ILIKE '%mock%' 
  OR title ILIKE '%demo%' 
  OR title ILIKE '%sample%'
  OR description ILIKE '%test%'
  OR description ILIKE '%mock%'
  OR instructor = 'Test Instructor'
  OR instructor = 'Demo User';

-- Step 2: Delete mock courses (cascading will remove related modules, chapters, etc.)
-- UNCOMMENT THE LINES BELOW AFTER REVIEWING THE PREVIEW ABOVE

/*
DELETE FROM courses 
WHERE 
  title ILIKE '%test%' 
  OR title ILIKE '%mock%' 
  OR title ILIKE '%demo%' 
  OR title ILIKE '%sample%'
  OR description ILIKE '%test%'
  OR description ILIKE '%mock%'
  OR instructor = 'Test Instructor'
  OR instructor = 'Demo User';
*/

-- Step 3: Clean up orphaned modules (if any exist)
/*
DELETE FROM modules 
WHERE course_id NOT IN (SELECT id FROM courses);
*/

-- Step 4: Clean up orphaned chapters (if any exist)
/*
DELETE FROM chapters 
WHERE module_id NOT IN (SELECT id FROM modules);
*/

-- Step 5: Verify remaining courses
SELECT id, title, instructor, status, created_at
FROM courses
ORDER BY created_at DESC;

-- Step 6: Count summary
SELECT 
  COUNT(*) as total_courses,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_courses
FROM courses;

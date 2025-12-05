-- ============================================================================
-- LMS Platform Diagnostic Queries
-- Run these to assess current database state before implementing fixes
-- ============================================================================

-- Query 1: Check for enrollment mismatches between tables
-- Expected: Should be 0 rows if data is in sync
SELECT 
  sp.student_id, 
  sp.course_id, 
  sp.total_progress as sp_progress,
  e.progress as enrollment_progress,
  (sp.total_progress - COALESCE(e.progress, 0)) as difference
FROM student_progress sp
LEFT JOIN enrollments e ON sp.student_id = e.user_id AND sp.course_id = e.course_id
WHERE sp.total_progress != COALESCE(e.progress, 0)
ORDER BY difference DESC;

-- Query 2: Check for orphaned enrollments (in enrollments but not studentProgress)
-- Expected: Should be 0 rows
SELECT 
  e.id,
  e.user_id, 
  e.course_id,
  e.status,
  e.progress,
  e.enrolled_at
FROM enrollments e
LEFT JOIN student_progress sp ON e.user_id = sp.student_id AND e.course_id = sp.course_id
WHERE sp.id IS NULL AND e.status = 'active';

-- Query 3: Check for orphaned studentProgress (in studentProgress but not enrollments)
-- Expected: Should be 0 rows
SELECT 
  sp.id,
  sp.student_id, 
  sp.course_id,
  sp.total_progress,
  sp.last_accessed
FROM student_progress sp
LEFT JOIN enrollments e ON sp.student_id = e.user_id AND sp.course_id = e.course_id
WHERE e.id IS NULL;

-- Query 4: Check for pending requests with active enrollments
-- Expected: Should be 0 rows (pending requests should be deleted when enrolled)
SELECT 
  ar.id as request_id,
  ar.student_id,
  ar.course_id,
  ar.status as request_status,
  ar.requested_at,
  e.id as enrollment_id,
  e.status as enrollment_status
FROM access_requests ar
INNER JOIN enrollments e ON ar.student_id = e.user_id AND ar.course_id = e.course_id
WHERE ar.status = 'pending' AND e.status = 'active';

-- Query 5: Check for approved/rejected requests that weren't deleted
-- Expected: Should be 0 rows (approved/rejected requests should be deleted)
SELECT 
  id,
  student_id,
  course_id,
  status,
  requested_at,
  reviewed_at
FROM access_requests
WHERE status IN ('approved', 'rejected')
ORDER BY reviewed_at DESC;

-- Query 6: Check course status case sensitivity issues
-- Expected: All should be lowercase 'published', 'draft', 'archived'
SELECT 
  id,
  title,
  status,
  LOWER(status) as normalized_status,
  CASE 
    WHEN status != LOWER(status) THEN 'NEEDS_NORMALIZATION'
    ELSE 'OK'
  END as status_check
FROM courses
WHERE status != LOWER(status);

-- Query 7: Check for students with progress but no enrollments
-- Expected: Should be 0 rows
SELECT DISTINCT
  sp.student_id,
  u.name as student_name,
  u.email,
  COUNT(DISTINCT sp.course_id) as courses_with_progress,
  COUNT(DISTINCT e.course_id) as enrolled_courses
FROM student_progress sp
INNER JOIN users u ON sp.student_id = u.id
LEFT JOIN enrollments e ON sp.student_id = e.user_id AND sp.course_id = e.course_id
WHERE e.id IS NULL
GROUP BY sp.student_id, u.name, u.email;

-- Query 8: Summary statistics
SELECT 
  'Total Students' as metric,
  COUNT(DISTINCT id) as count
FROM users WHERE role = 'student'
UNION ALL
SELECT 
  'Total Courses',
  COUNT(*) 
FROM courses
UNION ALL
SELECT 
  'Published Courses',
  COUNT(*) 
FROM courses 
WHERE LOWER(status) = 'published'
UNION ALL
SELECT 
  'StudentProgress Records',
  COUNT(*) 
FROM student_progress
UNION ALL
SELECT 
  'Enrollments Records',
  COUNT(*) 
FROM enrollments
UNION ALL
SELECT 
  'Active Enrollments',
  COUNT(*) 
FROM enrollments 
WHERE status = 'active'
UNION ALL
SELECT 
  'Pending Requests',
  COUNT(*) 
FROM access_requests 
WHERE status = 'pending'
UNION ALL
SELECT 
  'Orphaned Enrollments',
  COUNT(*) 
FROM enrollments e
LEFT JOIN student_progress sp ON e.user_id = sp.student_id AND e.course_id = sp.course_id
WHERE sp.id IS NULL AND e.status = 'active'
UNION ALL
SELECT 
  'Orphaned StudentProgress',
  COUNT(*) 
FROM student_progress sp
LEFT JOIN enrollments e ON sp.student_id = e.user_id AND sp.course_id = e.course_id
WHERE e.id IS NULL
UNION ALL
SELECT 
  'Progress Mismatches',
  COUNT(*) 
FROM student_progress sp
LEFT JOIN enrollments e ON sp.student_id = e.user_id AND sp.course_id = e.course_id
WHERE sp.total_progress != COALESCE(e.progress, 0);

-- Query 9: Check video progress tracking
-- Shows videos watched but not reflected in studentProgress
SELECT 
  vp.user_id,
  vp.chapter_id,
  c.course_id,
  vp.completed,
  vp.watched_percentage,
  sp.watched_videos,
  CASE 
    WHEN sp.watched_videos LIKE '%' || vp.chapter_id || '%' THEN 'TRACKED'
    ELSE 'NOT_TRACKED'
  END as tracking_status
FROM video_progress vp
INNER JOIN chapters c ON vp.chapter_id = c.id
LEFT JOIN student_progress sp ON vp.user_id = sp.student_id AND c.course_id = sp.course_id
WHERE vp.completed = true
  AND (sp.watched_videos NOT LIKE '%' || vp.chapter_id || '%' OR sp.watched_videos IS NULL)
LIMIT 20;

-- Query 10: Check quiz attempts tracking
-- Shows quiz attempts but not reflected in studentProgress
SELECT 
  qa.user_id,
  q.chapter_id,
  c.course_id,
  qa.score,
  qa.passed,
  sp.quiz_attempts,
  CASE 
    WHEN sp.quiz_attempts LIKE '%' || q.id || '%' THEN 'TRACKED'
    ELSE 'NOT_TRACKED'
  END as tracking_status
FROM quiz_attempts qa
INNER JOIN quizzes q ON qa.quiz_id = q.id
INNER JOIN chapters c ON q.chapter_id = c.id
LEFT JOIN student_progress sp ON qa.user_id = sp.student_id AND c.course_id = sp.course_id
WHERE qa.passed = true
  AND (sp.quiz_attempts NOT LIKE '%' || q.id || '%' OR sp.quiz_attempts IS NULL)
LIMIT 20;






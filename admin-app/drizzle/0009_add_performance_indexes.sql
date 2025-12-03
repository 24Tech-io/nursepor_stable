-- Add performance indexes for frequently queried columns
-- This significantly improves query performance for enrollment and course lookups

-- Index for studentProgress table - composite index on (studentId, courseId)
-- Used for enrollment lookups and progress queries
CREATE INDEX IF NOT EXISTS "idx_student_progress_student_course" 
ON "student_progress" ("student_id", "course_id");

-- Index for enrollments table - composite index on (userId, courseId, status)
-- Used for enrollment status checks and filtering
CREATE INDEX IF NOT EXISTS "idx_enrollments_user_course_status" 
ON "enrollments" ("user_id", "course_id", "status");

-- Index for accessRequests table - composite index on (studentId, courseId, status)
-- Used for request lookups and filtering by status
CREATE INDEX IF NOT EXISTS "idx_access_requests_student_course_status" 
ON "access_requests" ("student_id", "course_id", "status");

-- Index for courses table - index on status
-- Used for filtering published/active courses
CREATE INDEX IF NOT EXISTS "idx_courses_status" 
ON "courses" ("status");

-- Index for users table - composite index on (role, email)
-- Used for user lookups and authentication
CREATE INDEX IF NOT EXISTS "idx_users_role_email" 
ON "users" ("role", "email");

-- Index for accessRequests reviewedAt - for cleanup queries
CREATE INDEX IF NOT EXISTS "idx_access_requests_reviewed_at" 
ON "access_requests" ("reviewed_at") 
WHERE "reviewed_at" IS NOT NULL;







-- Course Access Requests Table
CREATE TABLE IF NOT EXISTS course_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, denied
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id, status) -- Prevent duplicate pending requests
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_requests_student ON course_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_course ON course_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status);

-- Enrollments table (if not exists)
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

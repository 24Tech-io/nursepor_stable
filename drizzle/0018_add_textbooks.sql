-- Textbook Purchase & Viewing System Migration
-- Adds support for purchasable textbooks with secure PDF viewing
-- Migration: 0018_add_textbooks.sql

-- 1. Update payments table to support textbooks
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS textbook_id INTEGER REFERENCES textbooks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'course';

-- Make courseId nullable (textbooks don't need courseId)
ALTER TABLE payments
ALTER COLUMN course_id DROP NOT NULL;

-- 2. Create textbooks table
CREATE TABLE IF NOT EXISTS textbooks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  isbn TEXT,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  pdf_file_url TEXT NOT NULL,
  thumbnail TEXT,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_pages INTEGER,
  file_size INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Create textbook_purchases table
CREATE TABLE IF NOT EXISTS textbook_purchases (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  textbook_id INTEGER NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'completed',
  purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(student_id, textbook_id)
);

-- 4. Create textbook_access_logs table
CREATE TABLE IF NOT EXISTS textbook_access_logs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  textbook_id INTEGER NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  page_number INTEGER,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Create textbook_reading_progress table
CREATE TABLE IF NOT EXISTS textbook_reading_progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  textbook_id INTEGER NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  current_page INTEGER NOT NULL DEFAULT 1,
  total_pages_read INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(student_id, textbook_id)
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_textbook_purchases_student ON textbook_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_textbook_purchases_textbook ON textbook_purchases(textbook_id);
CREATE INDEX IF NOT EXISTS idx_textbook_access_logs_student ON textbook_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_textbook_access_logs_textbook ON textbook_access_logs(textbook_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_status ON textbooks(status);
CREATE INDEX IF NOT EXISTS idx_textbooks_course ON textbooks(course_id);

-- 7. Add constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_textbooks_status'
  ) THEN
    ALTER TABLE textbooks
    ADD CONSTRAINT check_textbooks_status CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_textbook_purchases_status'
  ) THEN
    ALTER TABLE textbook_purchases
    ADD CONSTRAINT check_textbook_purchases_status CHECK (status IN ('completed', 'refunded'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_payments_item_type'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT check_payments_item_type CHECK (item_type IN ('course', 'textbook'));
  END IF;
END $$;


-- SQL to manually create quiz_questions table if it doesn't exist
-- Run this in your database client (e.g., pgAdmin, psql, or Neon console)

CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  "order" INTEGER NOT NULL
);

-- Verify the table was created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'quiz_questions';

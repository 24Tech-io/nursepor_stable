-- Migration: Add Q-Bank Marked Questions Table
-- This table allows students to mark questions for review

CREATE TABLE "qbank_marked_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "question_id" integer NOT NULL,
  "question_bank_id" integer NOT NULL,
  "notes" text,
  "marked_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_marked_question_unique" UNIQUE("user_id", "question_id")
);

-- Add foreign key constraints
ALTER TABLE "qbank_marked_questions" 
  ADD CONSTRAINT "qbank_marked_questions_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "qbank_marked_questions" 
  ADD CONSTRAINT "qbank_marked_questions_question_id_qbank_questions_id_fk" 
  FOREIGN KEY ("question_id") REFERENCES "qbank_questions"("id") ON DELETE CASCADE;

ALTER TABLE "qbank_marked_questions" 
  ADD CONSTRAINT "qbank_marked_questions_question_bank_id_question_banks_id_fk" 
  FOREIGN KEY ("question_bank_id") REFERENCES "question_banks"("id") ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX "idx_marked_questions_user_qbank" ON "qbank_marked_questions" ("user_id", "question_bank_id");
CREATE INDEX "idx_marked_questions_question" ON "qbank_marked_questions" ("question_id");


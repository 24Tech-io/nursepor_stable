-- Link Quizzes to Q-Bank Questions (instead of separate quiz questions)
CREATE TABLE IF NOT EXISTS "quiz_qbank_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("quiz_id", "question_id")
);
--> statement-breakpoint

-- Add foreign keys
DO $$ BEGIN
 ALTER TABLE "quiz_qbank_questions" ADD CONSTRAINT "quiz_qbank_questions_quiz_id_quizzes_id_fk" 
 FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "quiz_qbank_questions" ADD CONSTRAINT "quiz_qbank_questions_question_id_qbank_questions_id_fk" 
 FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes
CREATE INDEX IF NOT EXISTS "quiz_qbank_questions_quiz_id_idx" ON "quiz_qbank_questions" ("quiz_id");
CREATE INDEX IF NOT EXISTS "quiz_qbank_questions_question_id_idx" ON "quiz_qbank_questions" ("question_id");


-- Create course question assignments for linking questions to courses/modules
CREATE TABLE IF NOT EXISTS "course_question_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"module_id" integer,
	"question_id" integer NOT NULL,
	"is_module_specific" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("question_id", "course_id", "module_id")
);
--> statement-breakpoint

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "course_question_assignments" ADD CONSTRAINT "course_question_assignments_course_id_courses_id_fk" 
 FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "course_question_assignments" ADD CONSTRAINT "course_question_assignments_module_id_modules_id_fk" 
 FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "course_question_assignments" ADD CONSTRAINT "course_question_assignments_question_id_qbank_questions_id_fk" 
 FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "course_question_assignments_course_id_idx" ON "course_question_assignments" ("course_id");
CREATE INDEX IF NOT EXISTS "course_question_assignments_module_id_idx" ON "course_question_assignments" ("module_id");
CREATE INDEX IF NOT EXISTS "course_question_assignments_question_id_idx" ON "course_question_assignments" ("question_id");


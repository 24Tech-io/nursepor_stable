-- Create student_activity_logs table
CREATE TABLE IF NOT EXISTS "student_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_activity_logs_student_id_users_id_fk'
  ) THEN
    ALTER TABLE "student_activity_logs" 
    ADD CONSTRAINT "student_activity_logs_student_id_users_id_fk" 
    FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "student_activity_logs_student_id_idx" ON "student_activity_logs" ("student_id");
CREATE INDEX IF NOT EXISTS "student_activity_logs_created_at_idx" ON "student_activity_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "student_activity_logs_activity_type_idx" ON "student_activity_logs" ("activity_type");








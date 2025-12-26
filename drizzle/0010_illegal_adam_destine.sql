CREATE TABLE "course_question_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"module_id" integer,
	"question_id" integer NOT NULL,
	"is_module_specific" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "user_course_enrollment_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"operation" text NOT NULL,
	"result" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key"),
	CONSTRAINT "idempotency_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "qbank_access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"qbank_id" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" integer,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "qbank_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_category_id" integer,
	"description" text,
	"color" text DEFAULT '#8B5CF6',
	"icon" text DEFAULT '📁',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qbank_category_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"questions_attempted" integer DEFAULT 0,
	"questions_correct" integer DEFAULT 0,
	"accuracy_percentage" real DEFAULT 0,
	"average_time_seconds" real DEFAULT 0,
	"performance_level" text,
	"needs_remediation" boolean DEFAULT false,
	"last_attempt_at" timestamp,
	"first_attempt_at" timestamp DEFAULT now(),
	CONSTRAINT "qbank_category_perf_unique" UNIQUE("enrollment_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "qbank_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"qbank_id" integer NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"progress" integer DEFAULT 0,
	"questions_attempted" integer DEFAULT 0,
	"questions_correct" integer DEFAULT 0,
	"total_time_spent_minutes" integer DEFAULT 0,
	"tests_completed" integer DEFAULT 0,
	"tutorial_tests_completed" integer DEFAULT 0,
	"timed_tests_completed" integer DEFAULT 0,
	"assessment_tests_completed" integer DEFAULT 0,
	"average_score" real DEFAULT 0,
	"highest_score" real DEFAULT 0,
	"lowest_score" real DEFAULT 0,
	"readiness_score" integer DEFAULT 0,
	"readiness_level" text,
	"last_readiness_calculation" timestamp,
	CONSTRAINT "qbank_enrollment_unique" UNIQUE("student_id","qbank_id")
);
--> statement-breakpoint
CREATE TABLE "qbank_remediation_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"needs_remediation" boolean DEFAULT true,
	"remediation_completed" boolean DEFAULT false,
	"first_incorrect_at" timestamp DEFAULT now() NOT NULL,
	"remediation_started_at" timestamp,
	"mastered_at" timestamp,
	"total_attempts" integer DEFAULT 1,
	"consecutive_correct" integer DEFAULT 0,
	"recommended_resources" text,
	CONSTRAINT "qbank_remediation_unique" UNIQUE("enrollment_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "qbank_study_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"recommendation_type" text NOT NULL,
	"priority" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"action_items" text,
	"category_id" integer,
	"subject" text,
	"is_dismissed" boolean DEFAULT false,
	"is_completed" boolean DEFAULT false,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "qbank_subject_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"subject" text NOT NULL,
	"lesson" text,
	"client_need_area" text,
	"subcategory" text,
	"questions_attempted" integer DEFAULT 0,
	"questions_correct" integer DEFAULT 0,
	"accuracy_percentage" real DEFAULT 0,
	"performance_level" text,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qbank_test_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"qbank_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"test_mode" text NOT NULL,
	"test_type" text,
	"category_filter" integer,
	"difficulty_filter" text,
	"question_count" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"time_limit_minutes" integer,
	"time_spent_seconds" integer DEFAULT 0,
	"score" real,
	"correct_count" integer,
	"incorrect_count" integer,
	"unanswered_count" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_passed" boolean,
	"average_time_per_question" real,
	"confidence_level" text
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"answers" text NOT NULL,
	"time_taken" integer NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_qbank_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "textbook_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"textbook_id" integer NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"session_duration" integer,
	"pages_viewed" text
);
--> statement-breakpoint
CREATE TABLE "textbook_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"textbook_id" integer NOT NULL,
	"payment_id" integer,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "student_textbook_purchase_unique" UNIQUE("student_id","textbook_id")
);
--> statement-breakpoint
CREATE TABLE "textbook_reading_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"textbook_id" integer NOT NULL,
	"current_page" integer DEFAULT 1 NOT NULL,
	"total_pages" integer NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	"completion_percentage" real DEFAULT 0 NOT NULL,
	CONSTRAINT "student_textbook_progress_unique" UNIQUE("student_id","textbook_id")
);
--> statement-breakpoint
CREATE TABLE "textbooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"description" text,
	"isbn" text,
	"price" real DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"pdf_file_url" text NOT NULL,
	"thumbnail" text,
	"course_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_pages" integer,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_videos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "daily_videos" CASCADE;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "question_banks" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "textbook_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "item_type" text DEFAULT 'course' NOT NULL;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD COLUMN "selected_answer" text;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD COLUMN "correct_answer" text;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD COLUMN "marked_for_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD COLUMN "confidence_level" text;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD COLUMN "is_first_attempt" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD COLUMN "times_attempted" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD COLUMN "times_correct" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD COLUMN "average_time_seconds" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD COLUMN "global_accuracy_percentage" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "instructor" text;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "thumbnail" text;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "pricing" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "is_requestable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "is_default_unlocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "question_banks" ADD COLUMN "total_questions" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_photo" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "settings" jsonb;--> statement-breakpoint
ALTER TABLE "course_question_assignments" ADD CONSTRAINT "course_question_assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_question_assignments" ADD CONSTRAINT "course_question_assignments_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_question_assignments" ADD CONSTRAINT "course_question_assignments_question_id_qbank_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_access_requests" ADD CONSTRAINT "qbank_access_requests_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_access_requests" ADD CONSTRAINT "qbank_access_requests_qbank_id_question_banks_id_fk" FOREIGN KEY ("qbank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_access_requests" ADD CONSTRAINT "qbank_access_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_categories" ADD CONSTRAINT "qbank_categories_parent_category_id_qbank_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."qbank_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_category_performance" ADD CONSTRAINT "qbank_category_performance_enrollment_id_qbank_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."qbank_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_category_performance" ADD CONSTRAINT "qbank_category_performance_category_id_qbank_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."qbank_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_category_performance" ADD CONSTRAINT "qbank_category_performance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_enrollments" ADD CONSTRAINT "qbank_enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_enrollments" ADD CONSTRAINT "qbank_enrollments_qbank_id_question_banks_id_fk" FOREIGN KEY ("qbank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_remediation_tracking" ADD CONSTRAINT "qbank_remediation_tracking_enrollment_id_qbank_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."qbank_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_remediation_tracking" ADD CONSTRAINT "qbank_remediation_tracking_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_remediation_tracking" ADD CONSTRAINT "qbank_remediation_tracking_question_id_qbank_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_study_recommendations" ADD CONSTRAINT "qbank_study_recommendations_enrollment_id_qbank_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."qbank_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_study_recommendations" ADD CONSTRAINT "qbank_study_recommendations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_study_recommendations" ADD CONSTRAINT "qbank_study_recommendations_category_id_qbank_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."qbank_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_subject_performance" ADD CONSTRAINT "qbank_subject_performance_enrollment_id_qbank_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."qbank_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_subject_performance" ADD CONSTRAINT "qbank_subject_performance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_test_attempts" ADD CONSTRAINT "qbank_test_attempts_enrollment_id_qbank_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."qbank_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_test_attempts" ADD CONSTRAINT "qbank_test_attempts_qbank_id_question_banks_id_fk" FOREIGN KEY ("qbank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_test_attempts" ADD CONSTRAINT "qbank_test_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_test_attempts" ADD CONSTRAINT "qbank_test_attempts_category_filter_qbank_categories_id_fk" FOREIGN KEY ("category_filter") REFERENCES "public"."qbank_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_qbank_questions" ADD CONSTRAINT "quiz_qbank_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_qbank_questions" ADD CONSTRAINT "quiz_qbank_questions_question_id_qbank_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbook_access_logs" ADD CONSTRAINT "textbook_access_logs_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbook_access_logs" ADD CONSTRAINT "textbook_access_logs_textbook_id_textbooks_id_fk" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbook_purchases" ADD CONSTRAINT "textbook_purchases_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbook_purchases" ADD CONSTRAINT "textbook_purchases_textbook_id_textbooks_id_fk" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbook_reading_progress" ADD CONSTRAINT "textbook_reading_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbook_reading_progress" ADD CONSTRAINT "textbook_reading_progress_textbook_id_textbooks_id_fk" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_textbook_id_textbooks_id_fk" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD CONSTRAINT "qbank_questions_category_id_qbank_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."qbank_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "face_id_enrolled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "face_template";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "fingerprint_enrolled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "fingerprint_credential_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "two_factor_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "two_factor_secret";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "two_factor_backup_codes";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "joined_date";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_login";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reset_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reset_token_expiry";--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "user_course_progress_unique" UNIQUE("student_id","course_id");
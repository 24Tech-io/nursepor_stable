CREATE TABLE "nursing_candidate_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_number" text NOT NULL,
	"personal_details" jsonb NOT NULL,
	"education_details" jsonb NOT NULL,
	"registration_details" jsonb NOT NULL,
	"employment_history" jsonb NOT NULL,
	"canada_employment_history" jsonb NOT NULL,
	"document_checklist_acknowledged" boolean DEFAULT false NOT NULL,
	"disciplinary_action" text NOT NULL,
	"document_email_status" text DEFAULT 'pending' NOT NULL,
	"document_email_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qbank_question_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"user_answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"is_omitted" boolean DEFAULT false NOT NULL,
	"is_partially_correct" boolean DEFAULT false NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"time_spent" integer,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qbank_question_statistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"question_bank_id" integer NOT NULL,
	"times_attempted" integer DEFAULT 0 NOT NULL,
	"times_correct" integer DEFAULT 0 NOT NULL,
	"times_incorrect" integer DEFAULT 0 NOT NULL,
	"times_omitted" integer DEFAULT 0 NOT NULL,
	"times_correct_on_reattempt" integer DEFAULT 0 NOT NULL,
	"confidence_level" text,
	"last_attempted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_question_statistics_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "qbank_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_bank_id" integer NOT NULL,
	"question" text NOT NULL,
	"question_type" text DEFAULT 'multiple_choice' NOT NULL,
	"options" text NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"subject" text,
	"lesson" text,
	"client_need_area" text,
	"subcategory" text,
	"test_type" text DEFAULT 'mixed' NOT NULL,
	"difficulty" text DEFAULT 'medium',
	"points" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qbank_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_bank_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"test_id" text NOT NULL,
	"title" text,
	"mode" text DEFAULT 'tutorial' NOT NULL,
	"test_type" text DEFAULT 'mixed' NOT NULL,
	"organization" text DEFAULT 'subject' NOT NULL,
	"question_ids" text NOT NULL,
	"total_questions" integer NOT NULL,
	"time_limit" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" integer,
	"max_score" integer,
	"percentage" real,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qbank_tests_test_id_unique" UNIQUE("test_id")
);
--> statement-breakpoint
CREATE TABLE "question_banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD CONSTRAINT "qbank_question_attempts_test_id_qbank_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."qbank_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD CONSTRAINT "qbank_question_attempts_question_id_qbank_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_question_attempts" ADD CONSTRAINT "qbank_question_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_question_statistics" ADD CONSTRAINT "qbank_question_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_question_statistics" ADD CONSTRAINT "qbank_question_statistics_question_id_qbank_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qbank_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_question_statistics" ADD CONSTRAINT "qbank_question_statistics_question_bank_id_question_banks_id_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_questions" ADD CONSTRAINT "qbank_questions_question_bank_id_question_banks_id_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_tests" ADD CONSTRAINT "qbank_tests_question_bank_id_question_banks_id_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qbank_tests" ADD CONSTRAINT "qbank_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
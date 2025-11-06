ALTER TABLE "access_requests" ALTER COLUMN "student_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "access_requests" ALTER COLUMN "course_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "access_requests" ALTER COLUMN "reviewed_by" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "access_requests" ALTER COLUMN "reviewed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_videos" ALTER COLUMN "chapter_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "daily_videos" ALTER COLUMN "day" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "student_progress" ALTER COLUMN "student_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "student_progress" ALTER COLUMN "course_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "student_progress" ALTER COLUMN "total_progress" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "chapter_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "pass_mark" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "time_limit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "time_limit" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "max_attempts" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "quiz_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "module_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "prerequisite_chapter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "prerequisite_chapter_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "video_duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "video_duration" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "reading_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "reading_time" SET DATA TYPE integer;
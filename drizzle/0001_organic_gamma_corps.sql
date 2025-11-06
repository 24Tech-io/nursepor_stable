ALTER TABLE "chapters" ALTER COLUMN "module_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "prerequisite_chapter_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "prerequisite_chapter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "video_duration" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "video_duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "reading_time" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "reading_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "chapter_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "pass_mark" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "pass_mark" SET DEFAULT 70;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "time_limit" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "time_limit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "max_attempts" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "max_attempts" SET DEFAULT 3;
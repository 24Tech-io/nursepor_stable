-- Create Q-Bank Categories table for organizing questions
CREATE TABLE IF NOT EXISTS "qbank_categories" (
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

-- Add foreign key for parent category (self-referencing for subcategories)
DO $$ BEGIN
 ALTER TABLE "qbank_categories" ADD CONSTRAINT "qbank_categories_parent_category_id_qbank_categories_id_fk" 
 FOREIGN KEY ("parent_category_id") REFERENCES "public"."qbank_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add category_id column to qbank_questions
DO $$ BEGIN
 ALTER TABLE "qbank_questions" ADD COLUMN IF NOT EXISTS "category_id" integer;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint

-- Add foreign key for question categories
DO $$ BEGIN
 ALTER TABLE "qbank_questions" ADD CONSTRAINT "qbank_questions_category_id_qbank_categories_id_fk" 
 FOREIGN KEY ("category_id") REFERENCES "public"."qbank_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Insert default categories
INSERT INTO "qbank_categories" ("name", "description", "color", "icon", "sort_order", "parent_category_id") VALUES
  ('Adult Health', 'Medical-Surgical Nursing', '#3B82F6', '🏥', 1, NULL),
  ('Pediatrics', 'Child Health Nursing', '#10B981', '👶', 2, NULL),
  ('Maternity', 'Obstetric Nursing', '#F59E0B', '🤱', 3, NULL),
  ('Mental Health', 'Psychiatric Nursing', '#8B5CF6', '🧠', 4, NULL),
  ('NGN Case Studies', 'Next Generation NCLEX', '#EF4444', '📊', 5, NULL),
  ('Pharmacology', 'Drug Calculations & Administration', '#EC4899', '💊', 6, NULL),
  ('Fundamentals', 'Basic Nursing Skills', '#14B8A6', '📚', 7, NULL),
  ('Uncategorized', 'General Questions', '#6B7280', '📝', 99, NULL)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Create index on category_id for better query performance
CREATE INDEX IF NOT EXISTS "qbank_questions_category_id_idx" ON "qbank_questions" ("category_id");
--> statement-breakpoint

-- Create index on parent_category_id for tree queries
CREATE INDEX IF NOT EXISTS "qbank_categories_parent_category_id_idx" ON "qbank_categories" ("parent_category_id");


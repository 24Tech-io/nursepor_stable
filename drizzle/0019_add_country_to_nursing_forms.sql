-- Add country and canadian_immigration_applied fields to nursing_candidate_forms table
ALTER TABLE "nursing_candidate_forms" 
ADD COLUMN IF NOT EXISTS "country" text NOT NULL DEFAULT 'Canada';

ALTER TABLE "nursing_candidate_forms" 
ADD COLUMN IF NOT EXISTS "canadian_immigration_applied" text;


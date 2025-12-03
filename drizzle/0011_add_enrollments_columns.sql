-- Migration: Add missing columns to enrollments table
-- Date: 2025-12-02
-- Purpose: Add updated_at and completed_at columns to enrollments table

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to enrollments table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in enrollments table';
    END IF;
END $$;

-- Add completed_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN completed_at TIMESTAMP;
        RAISE NOTICE 'Added completed_at column to enrollments table';
    ELSE
        RAISE NOTICE 'completed_at column already exists in enrollments table';
    END IF;
END $$;

-- Create index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_updated_at ON enrollments(updated_at);

-- Create index on completed_at for filtering completed enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_completed_at ON enrollments(completed_at) WHERE completed_at IS NOT NULL;

-- Update existing records to set updated_at to enrolled_at if null
UPDATE enrollments 
SET updated_at = enrolled_at 
WHERE updated_at IS NULL OR updated_at < enrolled_at;


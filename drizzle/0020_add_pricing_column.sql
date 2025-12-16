-- Migration: Add pricing column to courses table
-- Date: 2025-12-16
-- Purpose: Support course pricing for paid courses

-- Add pricing column if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pricing REAL DEFAULT 0;

-- Add missing fields to users table
-- Migration: 0022_add_users_missing_fields.sql

-- Add lastLogin timestamp (nullable, tracks when user last logged in)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add joinedDate timestamp (when account was created, distinct from createdAt)
-- Set default to NOW() for existing records
ALTER TABLE users
ADD COLUMN IF NOT EXISTS joined_date TIMESTAMP NOT NULL DEFAULT NOW();

-- Update existing records: set joined_date to created_at if it's null
UPDATE users
SET joined_date = created_at
WHERE joined_date IS NULL;

-- Add resetToken for password reset functionality
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_token TEXT;

-- Add resetTokenExpiry for password reset token expiration
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Create index on reset_token for faster lookups during password reset
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Create index on last_login for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login) WHERE last_login IS NOT NULL;

-- Create index on joined_date for user analytics
CREATE INDEX IF NOT EXISTS idx_users_joined_date ON users(joined_date);


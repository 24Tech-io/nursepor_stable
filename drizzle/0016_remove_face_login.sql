-- Remove face login columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS face_id_enrolled;
ALTER TABLE users DROP COLUMN IF EXISTS face_template;


-- Change daily_videos.day column from integer to text to support dd-mm-yyyy date format
-- This allows daily videos to be assigned to specific dates instead of day-of-year numbers

ALTER TABLE daily_videos 
  ALTER COLUMN day TYPE TEXT USING day::TEXT;

COMMENT ON COLUMN daily_videos.day IS 'Date in dd-mm-yyyy format (e.g., 05-12-2024) for daily video rotation';


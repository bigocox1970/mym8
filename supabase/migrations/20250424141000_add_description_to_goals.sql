-- Add description column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT; 
-- Add notes column to goals table if it doesn't exist
ALTER TABLE goals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add a comment to the notes column
COMMENT ON COLUMN goals.notes IS 'Additional notes for the goal, separate from the description'; 
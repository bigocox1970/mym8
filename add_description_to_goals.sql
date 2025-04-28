-- Add description column to goals table if it doesn't exist
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to the description column
COMMENT ON COLUMN goals.description IS 'Notes and additional details about the goal';

-- If you need to reset any existing descriptions (optional)
-- UPDATE goals SET description = NULL WHERE description = '';

-- Grant necessary permissions
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create policy for the description column
DROP POLICY IF EXISTS "Users can update their own goals descriptions" ON goals;
CREATE POLICY "Users can update their own goals descriptions" 
    ON goals 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions to the authenticated users to use the description column
GRANT SELECT, INSERT, UPDATE, DELETE ON goals TO authenticated; 
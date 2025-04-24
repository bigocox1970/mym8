-- Fix theme settings for profiles
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

-- Update any records that might have dark_mode set to true but no theme
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if dark_mode column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'dark_mode'
    ) INTO col_exists;

    -- If it exists, update theme based on dark_mode value
    IF col_exists THEN
        UPDATE profiles
        SET theme = 'dark'
        WHERE dark_mode = true AND (theme IS NULL OR theme = '');
    END IF;
END $$;

-- Add system theme if not already one of the options
UPDATE profiles
SET theme = 'light'
WHERE theme IS NULL OR theme = '';

-- Comment on theme column
COMMENT ON COLUMN profiles.theme IS 'User theme preference (light, dark, system)'; 
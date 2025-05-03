-- This migration fixes the default personality setting

-- First, update the user_preferences table if it exists
DO $$
BEGIN
  -- Check if the user_preferences table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    -- Update the personality_type to 'gentle' where it's not set
    UPDATE user_preferences
    SET personality_type = 'gentle'
    WHERE personality_type IS NULL OR personality_type = '';
    
    RAISE NOTICE 'Updated personality_type in user_preferences table';
  ELSE
    RAISE NOTICE 'user_preferences table does not exist';
  END IF;
END
$$;

-- Then update the llm_configs table
DO $$
BEGIN
  -- Check if the llm_configs table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'llm_configs'
  ) THEN
    -- Update the personality_type to 'gentle' where it's not set
    UPDATE llm_configs
    SET personality_type = 'gentle'
    WHERE personality_type IS NULL OR personality_type = '';
    
    RAISE NOTICE 'Updated personality_type in llm_configs table';
  ELSE
    RAISE NOTICE 'llm_configs table does not exist';
  END IF;
END
$$;

-- Add comment to explain the migration
COMMENT ON MIGRATION IS 'Fix to ensure the default personality is set to gentle'; 
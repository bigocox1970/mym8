-- Create a function to get LLM configurations for the current user
DROP FUNCTION IF EXISTS get_user_llm_config;

CREATE OR REPLACE FUNCTION get_user_llm_config(
  p_function_name TEXT DEFAULT 'openrouter'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;
  
  -- Get the configuration for the specified function name
  SELECT to_jsonb(c.*) INTO v_result
  FROM llm_configs c
  WHERE c.function_name = p_function_name;
  
  -- If no config found, return empty JSON
  IF v_result IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the function
COMMENT ON FUNCTION get_user_llm_config IS 'Get LLM configuration for the current user. Returns all settings including voice service options.'; 
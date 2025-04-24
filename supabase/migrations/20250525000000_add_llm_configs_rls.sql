-- Add RLS for llm_configs table
ALTER TABLE llm_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can directly access llm_configs
CREATE POLICY "Only admins can access llm_configs" 
ON llm_configs 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'admin@mym8.app');

-- Create a function to handle llm_configs operations for normal users
CREATE OR REPLACE FUNCTION manage_user_llm_config(
  p_function_name TEXT,
  p_assistant_name TEXT,
  p_personality_type TEXT,
  p_pre_prompt TEXT,
  p_voice_gender TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_exists BOOLEAN;
BEGIN
  -- Check if config exists
  SELECT EXISTS (
    SELECT 1 FROM llm_configs WHERE function_name = p_function_name
  ) INTO config_exists;
  
  IF config_exists THEN
    -- Update existing config
    UPDATE llm_configs SET
      assistant_name = p_assistant_name,
      personality_type = p_personality_type,
      pre_prompt = p_pre_prompt,
      voice_gender = p_voice_gender,
      enable_ai = TRUE
    WHERE function_name = p_function_name;
  ELSE
    -- Insert new config
    INSERT INTO llm_configs (
      function_name,
      assistant_name,
      personality_type,
      pre_prompt,
      voice_gender,
      enable_ai,
      api_key,
      llm_provider
    ) VALUES (
      p_function_name,
      p_assistant_name,
      p_personality_type,
      p_pre_prompt,
      p_voice_gender,
      TRUE,
      '',  -- Empty API key as placeholder
      'anthropic/claude-3-opus:beta'  -- Default provider
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in manage_user_llm_config: %', SQLERRM;
    RETURN FALSE;
END;
$$; 
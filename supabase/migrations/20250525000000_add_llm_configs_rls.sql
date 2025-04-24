-- Add RLS for llm_configs table
ALTER TABLE llm_configs ENABLE ROW LEVEL SECURITY;

-- Admin policy for llm_configs (full access)
CREATE POLICY "Allow admins full access to llm_configs" 
ON llm_configs 
FOR ALL 
TO authenticated 
USING (auth.jwt() -> 'email' = 'admin@mym8.app');

-- User policy for select only
CREATE POLICY "Allow users to view llm_configs" 
ON llm_configs 
FOR SELECT 
TO authenticated 
USING (true);

-- Create a function to handle llm_configs inserts
CREATE OR REPLACE FUNCTION handle_llm_config_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a row with the same function_name already exists
  IF EXISTS (
    SELECT 1 FROM llm_configs 
    WHERE function_name = NEW.function_name
  ) THEN
    -- If it exists, update it instead of inserting
    UPDATE llm_configs
    SET 
      api_key = COALESCE(NEW.api_key, api_key),
      llm_provider = COALESCE(NEW.llm_provider, llm_provider),
      pre_prompt = COALESCE(NEW.pre_prompt, pre_prompt),
      enable_ai = COALESCE(NEW.enable_ai, enable_ai),
      assistant_name = COALESCE(NEW.assistant_name, assistant_name),
      personality_type = COALESCE(NEW.personality_type, personality_type),
      voice_gender = COALESCE(NEW.voice_gender, voice_gender)
    WHERE function_name = NEW.function_name;
    
    RETURN NULL; -- Skip the insert
  ELSE
    -- Otherwise, proceed with the insert
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for the function
CREATE TRIGGER handle_llm_config_insert_trigger
BEFORE INSERT ON llm_configs
FOR EACH ROW
EXECUTE FUNCTION handle_llm_config_insert();

-- User policy for insert (with the trigger handling duplicates)
CREATE POLICY "Allow users to insert llm_configs" 
ON llm_configs 
FOR INSERT 
TO authenticated 
WITH CHECK (true); 
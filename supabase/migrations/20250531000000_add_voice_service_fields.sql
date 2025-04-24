-- Add voice service fields to llm_configs table
ALTER TABLE IF EXISTS llm_configs 
ADD COLUMN IF NOT EXISTS voice_service TEXT DEFAULT 'browser',
ADD COLUMN IF NOT EXISTS elevenlabs_voice TEXT DEFAULT 'rachel',
ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;

-- Update manage_user_llm_config function to include new parameters
CREATE OR REPLACE FUNCTION manage_user_llm_config(
  p_function_name TEXT,
  p_assistant_name TEXT DEFAULT NULL,
  p_personality_type TEXT DEFAULT NULL,
  p_pre_prompt TEXT DEFAULT NULL,
  p_voice_gender TEXT DEFAULT 'female',
  p_llm_provider TEXT DEFAULT 'gpt-4o',
  p_voice_service TEXT DEFAULT 'browser',
  p_elevenlabs_voice TEXT DEFAULT 'rachel',
  p_elevenlabs_api_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
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
  
  -- Insert or update the record
  INSERT INTO llm_configs (
    function_name,
    assistant_name,
    personality_type,
    pre_prompt,
    voice_gender,
    llm_provider,
    voice_service,
    elevenlabs_voice,
    elevenlabs_api_key
  ) VALUES (
    p_function_name,
    p_assistant_name,
    p_personality_type,
    p_pre_prompt,
    p_voice_gender,
    p_llm_provider,
    p_voice_service,
    p_elevenlabs_voice,
    p_elevenlabs_api_key
  )
  ON CONFLICT (function_name) 
  DO UPDATE SET
    assistant_name = p_assistant_name,
    personality_type = p_personality_type,
    pre_prompt = p_pre_prompt,
    voice_gender = p_voice_gender,
    llm_provider = p_llm_provider,
    voice_service = p_voice_service,
    elevenlabs_voice = p_elevenlabs_voice,
    elevenlabs_api_key = p_elevenlabs_api_key,
    updated_at = NOW()
  RETURNING to_jsonb(llm_configs.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the columns
COMMENT ON COLUMN llm_configs.voice_service IS 'TTS service to use (browser, elevenlabs)';
COMMENT ON COLUMN llm_configs.elevenlabs_voice IS 'ElevenLabs voice identifier';
COMMENT ON COLUMN llm_configs.elevenlabs_api_key IS 'API key for ElevenLabs'; 
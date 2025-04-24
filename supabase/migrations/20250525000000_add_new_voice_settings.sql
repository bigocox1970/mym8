-- First create the llm_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS "llm_config" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "function_name" TEXT NOT NULL,
  "assistant_name" TEXT,
  "personality_type" TEXT,
  "pre_prompt" TEXT,
  "voice_gender" TEXT,
  "llm_provider" TEXT,
  "voice_service" TEXT,
  "elevenlabs_voice" TEXT,
  "elevenlabs_api_key" TEXT,
  "api_key" TEXT,
  "enable_ai" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, function_name)
);

-- Add new voice settings columns to llm_config table
ALTER TABLE IF EXISTS "llm_config" 
ADD COLUMN IF NOT EXISTS "google_voice" TEXT,
ADD COLUMN IF NOT EXISTS "google_api_key" TEXT,
ADD COLUMN IF NOT EXISTS "azure_voice" TEXT,
ADD COLUMN IF NOT EXISTS "azure_api_key" TEXT,
ADD COLUMN IF NOT EXISTS "amazon_voice" TEXT,
ADD COLUMN IF NOT EXISTS "amazon_api_key" TEXT,
ADD COLUMN IF NOT EXISTS "openai_voice" TEXT,
ADD COLUMN IF NOT EXISTS "openai_api_key" TEXT;

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS manage_user_llm_config(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS manage_user_llm_config(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS get_user_llm_config();

-- Update RPC function to support new voice settings
CREATE OR REPLACE FUNCTION manage_user_llm_config(
  p_function_name TEXT,
  p_assistant_name TEXT DEFAULT NULL,
  p_personality_type TEXT DEFAULT NULL,
  p_pre_prompt TEXT DEFAULT NULL,
  p_voice_gender TEXT DEFAULT NULL,
  p_llm_provider TEXT DEFAULT NULL,
  p_voice_service TEXT DEFAULT NULL,
  p_elevenlabs_voice TEXT DEFAULT NULL,
  p_elevenlabs_api_key TEXT DEFAULT NULL,
  p_google_voice TEXT DEFAULT NULL,
  p_google_api_key TEXT DEFAULT NULL,
  p_azure_voice TEXT DEFAULT NULL,
  p_azure_api_key TEXT DEFAULT NULL,
  p_amazon_voice TEXT DEFAULT NULL,
  p_amazon_api_key TEXT DEFAULT NULL,
  p_openai_voice TEXT DEFAULT NULL,
  p_openai_api_key TEXT DEFAULT NULL,
  p_api_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_config_id UUID;
  v_result JSONB;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if the user has a configuration entry
  SELECT id INTO v_config_id
  FROM llm_config
  WHERE user_id = v_user_id AND function_name = p_function_name;
  
  -- If a config already exists, update it
  IF v_config_id IS NOT NULL THEN
    UPDATE llm_config
    SET 
      assistant_name = COALESCE(p_assistant_name, assistant_name),
      personality_type = COALESCE(p_personality_type, personality_type),
      pre_prompt = COALESCE(p_pre_prompt, pre_prompt),
      voice_gender = COALESCE(p_voice_gender, voice_gender),
      llm_provider = COALESCE(p_llm_provider, llm_provider),
      voice_service = COALESCE(p_voice_service, voice_service),
      elevenlabs_voice = COALESCE(p_elevenlabs_voice, elevenlabs_voice),
      elevenlabs_api_key = COALESCE(p_elevenlabs_api_key, elevenlabs_api_key),
      google_voice = COALESCE(p_google_voice, google_voice),
      google_api_key = COALESCE(p_google_api_key, google_api_key),
      azure_voice = COALESCE(p_azure_voice, azure_voice),
      azure_api_key = COALESCE(p_azure_api_key, azure_api_key),
      amazon_voice = COALESCE(p_amazon_voice, amazon_voice),
      amazon_api_key = COALESCE(p_amazon_api_key, amazon_api_key),
      openai_voice = COALESCE(p_openai_voice, openai_voice),
      openai_api_key = COALESCE(p_openai_api_key, openai_api_key),
      api_key = COALESCE(p_api_key, api_key),
      updated_at = now()
    WHERE id = v_config_id
    RETURNING to_jsonb(llm_config.*) INTO v_result;
  -- Otherwise, create a new config
  ELSE
    INSERT INTO llm_config (
      user_id, 
      function_name, 
      assistant_name,
      personality_type,
      pre_prompt, 
      voice_gender,
      llm_provider,
      voice_service,
      elevenlabs_voice,
      elevenlabs_api_key,
      google_voice,
      google_api_key,
      azure_voice,
      azure_api_key,
      amazon_voice,
      amazon_api_key,
      openai_voice,
      openai_api_key,
      api_key
    )
    VALUES (
      v_user_id, 
      p_function_name, 
      p_assistant_name,
      p_personality_type,
      p_pre_prompt, 
      p_voice_gender,
      p_llm_provider,
      p_voice_service,
      p_elevenlabs_voice,
      p_elevenlabs_api_key,
      p_google_voice,
      p_google_api_key,
      p_azure_voice,
      p_azure_api_key,
      p_amazon_voice,
      p_amazon_api_key,
      p_openai_voice,
      p_openai_api_key,
      p_api_key
    )
    RETURNING to_jsonb(llm_config.*) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified version for backward compatibility
CREATE OR REPLACE FUNCTION get_user_llm_config() 
RETURNS SETOF llm_config AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM llm_config
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN llm_config.google_voice IS 'The Google Cloud TTS voice ID selected by the user';
COMMENT ON COLUMN llm_config.google_api_key IS 'The user''s Google Cloud API key for text-to-speech';
COMMENT ON COLUMN llm_config.azure_voice IS 'The Microsoft Azure TTS voice ID selected by the user';
COMMENT ON COLUMN llm_config.azure_api_key IS 'The user''s Azure Speech Services API key';
COMMENT ON COLUMN llm_config.amazon_voice IS 'The Amazon Polly voice ID selected by the user';
COMMENT ON COLUMN llm_config.amazon_api_key IS 'The user''s AWS access key for Polly TTS';
COMMENT ON COLUMN llm_config.openai_voice IS 'The OpenAI TTS voice ID selected by the user';
COMMENT ON COLUMN llm_config.openai_api_key IS 'The user''s OpenAI API key for TTS'; 
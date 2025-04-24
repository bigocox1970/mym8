-- Add assistant personalization columns to llm_configs
ALTER TABLE IF EXISTS llm_configs
ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT 'M8',
ADD COLUMN IF NOT EXISTS personality_type TEXT DEFAULT 'gentle';

-- Update any existing records to have default values
UPDATE llm_configs
SET 
  assistant_name = 'M8',
  personality_type = 'gentle'
WHERE 
  assistant_name IS NULL OR
  personality_type IS NULL;

COMMENT ON COLUMN llm_configs.assistant_name IS 'Custom name for the AI assistant';
COMMENT ON COLUMN llm_configs.personality_type IS 'Personality style for the AI assistant (direct, gentle, sarcastic, no_prisoners)'; 
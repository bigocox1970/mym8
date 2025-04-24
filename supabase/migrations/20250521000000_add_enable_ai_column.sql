-- Add enable_ai column to llm_configs
ALTER TABLE IF EXISTS llm_configs
ADD COLUMN IF NOT EXISTS enable_ai BOOLEAN DEFAULT true;

-- Update any existing records to have the default value
UPDATE llm_configs
SET enable_ai = true
WHERE enable_ai IS NULL;

COMMENT ON COLUMN llm_configs.enable_ai IS 'Flag to enable or disable the AI assistant'; 
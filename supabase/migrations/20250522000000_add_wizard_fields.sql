-- Add wizard fields to profiles table
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS wizard_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS selected_issues TEXT[],
ADD COLUMN IF NOT EXISTS other_issue TEXT,
ADD COLUMN IF NOT EXISTS assistant_toughness TEXT DEFAULT 'balanced';

-- Add voice gender to llm_configs
ALTER TABLE IF EXISTS llm_configs
ADD COLUMN IF NOT EXISTS voice_gender TEXT DEFAULT 'neutral';

-- Comment on new columns
COMMENT ON COLUMN profiles.wizard_completed IS 'Whether the user has completed the setup wizard';
COMMENT ON COLUMN profiles.nickname IS 'How the assistant should address the user';
COMMENT ON COLUMN profiles.selected_issues IS 'Issues the user wants help with';
COMMENT ON COLUMN profiles.other_issue IS 'Custom issue specified by user';
COMMENT ON COLUMN profiles.assistant_toughness IS 'How tough the assistant should be with the user';
COMMENT ON COLUMN llm_configs.voice_gender IS 'Gender preference for the assistant voice'; 
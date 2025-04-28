-- Create user_ai_context table
CREATE TABLE IF NOT EXISTS public.user_ai_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}'::jsonb,
  interests TEXT[] DEFAULT '{}',
  dislikes TEXT[] DEFAULT '{}',
  personal_info JSONB DEFAULT '{}'::jsonb,
  conversation_highlights TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make sure only the owner can see their own context
ALTER TABLE public.user_ai_context ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own context
CREATE POLICY user_select_own_context ON public.user_ai_context 
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own context  
CREATE POLICY user_insert_own_context ON public.user_ai_context 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update only their own context
CREATE POLICY user_update_own_context ON public.user_ai_context 
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete only their own context  
CREATE POLICY user_delete_own_context ON public.user_ai_context 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index on user_id
CREATE INDEX idx_user_ai_context_user_id ON public.user_ai_context(user_id);

-- Add comments
COMMENT ON TABLE public.user_ai_context IS 'Stores user AI context for personalized interactions';
COMMENT ON COLUMN public.user_ai_context.preferences IS 'User preferences as a JSON object';
COMMENT ON COLUMN public.user_ai_context.interests IS 'Array of user interests';
COMMENT ON COLUMN public.user_ai_context.dislikes IS 'Array of user dislikes';
COMMENT ON COLUMN public.user_ai_context.personal_info IS 'JSON object with personal information about the user';
COMMENT ON COLUMN public.user_ai_context.conversation_highlights IS 'Array of important conversation highlights'; 
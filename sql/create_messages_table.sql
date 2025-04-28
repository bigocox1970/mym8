-- Create messages table for conversation history
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make sure only the owner can see their own messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own messages
CREATE POLICY user_select_own_messages ON public.messages 
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own messages  
CREATE POLICY user_insert_own_messages ON public.messages 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index on user_id and timestamp for faster retrieval
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_timestamp ON public.messages(timestamp);

-- Add comments
COMMENT ON TABLE public.messages IS 'Stores user conversation history with the assistant';
COMMENT ON COLUMN public.messages.role IS 'Role of the message sender (user or assistant)';
COMMENT ON COLUMN public.messages.content IS 'Content of the message';
COMMENT ON COLUMN public.messages.timestamp IS 'Time when the message was sent'; 
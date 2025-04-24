-- Create chat_messages table for storing AI Assistant conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conversation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add security policies for RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own chat messages
CREATE POLICY "Users can view their own chat messages" 
  ON chat_messages FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own chat messages
CREATE POLICY "Users can insert their own chat messages" 
  ON chat_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
  
-- Add indexes to speed up queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Create conversations table to group chat messages
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add security policies for RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own conversations
CREATE POLICY "Users can view their own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own conversations
CREATE POLICY "Users can insert their own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own conversations
CREATE POLICY "Users can update their own conversations" 
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);
  
-- Add indexes to speed up queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at); 
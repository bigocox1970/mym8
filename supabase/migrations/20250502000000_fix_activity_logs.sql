-- Fix for activity_logs table - ensure skipped column exists and create from scratch if needed
DO $$
BEGIN
  -- Check if the activity_logs table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE activity_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT false,
      skipped BOOLEAN DEFAULT false,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Add security policies for RLS
    ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

    -- Allow users to view their own logs
    CREATE POLICY "Users can view their own activity logs" 
      ON activity_logs FOR SELECT 
      USING (auth.uid() = user_id);

    -- Allow users to insert their own logs
    CREATE POLICY "Users can insert their own activity logs" 
      ON activity_logs FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
      
    -- Add indexes to speed up queries
    CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
    CREATE INDEX idx_activity_logs_task_id ON activity_logs(task_id);
    CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
    CREATE INDEX idx_activity_logs_completed ON activity_logs(completed);
    
    RAISE NOTICE 'Created activity_logs table from scratch';
  ELSE
    -- If the table exists, make sure it has the skipped column
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'activity_logs' 
      AND column_name = 'skipped'
    ) THEN
      ALTER TABLE activity_logs ADD COLUMN skipped BOOLEAN DEFAULT false;
      RAISE NOTICE 'Added skipped column to activity_logs table';
    ELSE
      RAISE NOTICE 'Skipped column already exists in activity_logs table';
    END IF;
  END IF;
END $$; 
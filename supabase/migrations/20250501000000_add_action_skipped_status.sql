-- Add skipped field to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT false;

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_tasks_skipped ON tasks(skipped);

-- Update the reset function to mark incomplete tasks as skipped
CREATE OR REPLACE FUNCTION reset_completed_actions()
RETURNS void AS $$
DECLARE
BEGIN
  -- Mark daily actions that weren't completed as skipped
  UPDATE tasks 
  SET skipped = true 
  WHERE 
    completed = false AND
    skipped = false AND
    frequency IN ('morning', 'afternoon', 'evening', 'daily') AND 
    updated_at < NOW() - INTERVAL '1 day';
  
  -- Mark weekly actions that weren't completed as skipped
  UPDATE tasks 
  SET skipped = true 
  WHERE 
    completed = false AND
    skipped = false AND
    frequency = 'weekly' AND 
    updated_at < NOW() - INTERVAL '7 days';
  
  -- Mark monthly actions that weren't completed as skipped
  UPDATE tasks 
  SET skipped = true 
  WHERE 
    completed = false AND
    skipped = false AND
    frequency = 'monthly' AND 
    updated_at < NOW() - INTERVAL '30 days';
  
  -- Reset completed daily actions
  UPDATE tasks 
  SET 
    completed = false,
    skipped = false
  WHERE 
    completed = true AND 
    frequency IN ('morning', 'afternoon', 'evening', 'daily') AND 
    updated_at < NOW() - INTERVAL '1 day';
  
  -- Reset completed weekly actions
  UPDATE tasks 
  SET 
    completed = false,
    skipped = false
  WHERE 
    completed = true AND 
    frequency = 'weekly' AND 
    updated_at < NOW() - INTERVAL '7 days';
  
  -- Reset completed monthly actions
  UPDATE tasks 
  SET 
    completed = false,
    skipped = false
  WHERE 
    completed = true AND 
    frequency = 'monthly' AND 
    updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Update the activity_logs table to include skipped status
ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT false; 
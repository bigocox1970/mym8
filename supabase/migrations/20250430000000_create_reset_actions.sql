-- Enable the pg_cron extension if available (comment out if not available in your Supabase plan)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to reset actions based on frequency
CREATE OR REPLACE FUNCTION reset_completed_actions()
RETURNS void AS $$
DECLARE
BEGIN
  -- Reset daily actions completed more than 24 hours ago
  UPDATE tasks 
  SET completed = false 
  WHERE 
    completed = true AND 
    frequency IN ('morning', 'afternoon', 'evening', 'daily') AND 
    updated_at < NOW() - INTERVAL '1 day';
  
  -- Reset weekly actions completed more than 7 days ago
  UPDATE tasks 
  SET completed = false 
  WHERE 
    completed = true AND 
    frequency = 'weekly' AND 
    updated_at < NOW() - INTERVAL '7 days';
  
  -- Reset monthly actions completed more than 30 days ago
  UPDATE tasks 
  SET completed = false 
  WHERE 
    completed = true AND 
    frequency = 'monthly' AND 
    updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add comment to the function
COMMENT ON FUNCTION reset_completed_actions IS 'Resets completed actions based on their frequency';

-- Alternative method: Create a trigger function that runs when a task is updated
CREATE OR REPLACE FUNCTION check_and_reset_actions()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the reset function once per day
  -- This is not ideal, but works without needing pg_cron
  IF EXISTS (
    SELECT 1 FROM tasks 
    WHERE updated_at < CURRENT_DATE
    LIMIT 1
  ) THEN
    PERFORM reset_completed_actions();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the tasks table
DROP TRIGGER IF EXISTS reset_actions_trigger ON tasks;
CREATE TRIGGER reset_actions_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION check_and_reset_actions();

-- Note: Since pg_cron is not available, we'll use the trigger approach above
-- If your Supabase plan supports pg_cron, you can use this:
-- SELECT cron.schedule(
--   'reset-actions-job',
--   '0 0 * * *', -- Cron schedule: At 00:00 (midnight) every day
--   $$
--     SELECT reset_completed_actions();
--   $$
-- );

-- For testing, you can manually run this function:
-- SELECT reset_completed_actions(); 
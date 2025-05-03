-- Enable the pg_cron extension if available (comment out if not available in your Supabase plan)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to reset actions based on frequency
CREATE OR REPLACE FUNCTION reset_completed_actions()
RETURNS void AS $$
DECLARE
BEGIN
  -- Reset daily actions when the date changes (at midnight)
  UPDATE tasks 
  SET completed = false 
  WHERE 
    completed = true AND 
    frequency IN ('morning', 'afternoon', 'evening', 'daily') AND 
    DATE(updated_at) < CURRENT_DATE;
  
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
  -- Check if the current date is different from the last reset date
  -- This ensures the reset happens once per day regardless of which task triggered it
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables 
    WHERE tablename = 'last_reset_date'
  ) THEN
    -- Create temporary table to track last reset date if it doesn't exist
    CREATE TEMP TABLE IF NOT EXISTS last_reset_date (
      date date,
      last_updated timestamp
    );
    
    -- Initialize with yesterday's date to force a reset on first run
    INSERT INTO last_reset_date VALUES (CURRENT_DATE - INTERVAL '1 day', NOW());
  END IF;
  
  -- If date has changed since last reset, perform the reset
  IF (SELECT date FROM last_reset_date LIMIT 1) < CURRENT_DATE THEN
    PERFORM reset_completed_actions();
    
    -- Update the last reset date
    UPDATE last_reset_date SET date = CURRENT_DATE, last_updated = NOW();
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

-- NOTE: For production use, it's HIGHLY RECOMMENDED to set up a scheduled job instead
-- of relying solely on the trigger approach. Triggers only run when the table is accessed.
--
-- If your Supabase plan supports pg_cron, uncomment and use this:
-- 
-- SELECT cron.schedule(
--   'reset-actions-daily',
--   '0 0 * * *', -- Cron schedule: At 00:00 (midnight) every day
--   $$
--     SELECT reset_completed_actions();
--   $$
-- );
--
-- If pg_cron is not available, consider setting up an external scheduled job
-- that calls a serverless function or API endpoint that runs:
-- SELECT reset_completed_actions();

-- For testing, you can manually run this function:
-- SELECT reset_completed_actions(); 
-- Create a test function to manually execute the reset and report results
CREATE OR REPLACE FUNCTION test_reset_actions()
RETURNS TEXT AS $$
DECLARE
  daily_completed INT := 0;
  weekly_completed INT := 0;
  monthly_completed INT := 0;
  reset_count INT := 0;
  result TEXT;
BEGIN
  -- Count completed tasks before reset
  SELECT COUNT(*) INTO daily_completed FROM tasks WHERE completed = true AND frequency IN ('morning', 'afternoon', 'evening', 'daily');
  SELECT COUNT(*) INTO weekly_completed FROM tasks WHERE completed = true AND frequency = 'weekly';
  SELECT COUNT(*) INTO monthly_completed FROM tasks WHERE completed = true AND frequency = 'monthly';
  
  -- Execute the reset function
  PERFORM reset_completed_actions();
  
  -- Count how many tasks were reset
  SELECT 
    (SELECT COUNT(*) FROM tasks WHERE 
      completed = false AND 
      frequency IN ('morning', 'afternoon', 'evening', 'daily') AND 
      DATE(updated_at) < CURRENT_DATE)
    +
    (SELECT COUNT(*) FROM tasks WHERE 
      completed = false AND 
      frequency = 'weekly' AND 
      updated_at < NOW() - INTERVAL '7 days')
    +
    (SELECT COUNT(*) FROM tasks WHERE 
      completed = false AND 
      frequency = 'monthly' AND 
      updated_at < NOW() - INTERVAL '30 days')
  INTO reset_count;
  
  -- Prepare result message
  result := 'Reset executed. Before reset: ' || 
    daily_completed || ' daily, ' || 
    weekly_completed || ' weekly, ' || 
    monthly_completed || ' monthly tasks completed. ' ||
    reset_count || ' tasks were reset.';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comment to the function
COMMENT ON FUNCTION test_reset_actions IS 'Test function that executes reset_completed_actions and reports stats'; 
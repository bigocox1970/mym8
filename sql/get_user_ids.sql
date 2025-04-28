-- Query to retrieve user IDs from auth.users table
SELECT 
  id as user_id,
  email,
  created_at
FROM 
  auth.users
ORDER BY 
  created_at DESC;

-- Query to retrieve user IDs from public.profiles table (if it exists)
-- Uncomment and use if you have a profiles table
/*
SELECT 
  id as profile_id,
  user_id,
  created_at
FROM 
  public.profiles
ORDER BY 
  created_at DESC;
*/

-- Query to get the UUID of the current authenticated user (if you're logged in)
SELECT auth.uid() as current_user_id;

-- Example of how to use a UUID in the load_initial_context.sql script:
-- Copy one of these UUIDs and replace 'YOUR_USER_ID' with it

-- IMPORTANT: Make sure to wrap the UUID in single quotes when using it, for example:
-- v_user_id UUID := '12345678-1234-1234-1234-123456789012'; 
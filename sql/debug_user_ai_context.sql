-- Replace with your actual user ID
SET client_min_messages TO 'NOTICE';

DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- Replace with your actual user ID
  v_profile_count INT;
  v_messages_count INT;
  v_goals_count INT;
  v_tasks_count INT;
BEGIN
  -- Check if the user exists in auth.users
  RAISE NOTICE 'Checking if user exists...';
  PERFORM id FROM auth.users WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'User does not exist in auth.users. Please check the UUID.';
    RETURN;
  ELSE
    RAISE NOTICE 'User found in auth.users.';
  END IF;
  
  -- Check if context already exists
  SELECT COUNT(*) INTO v_profile_count 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Found % user_ai_context records for this user.', v_profile_count;
  
  -- Check if we have messages
  SELECT COUNT(*) INTO v_messages_count 
  FROM public.messages 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Found % messages for this user.', v_messages_count;
  
  -- Check if we have goals
  SELECT COUNT(*) INTO v_goals_count 
  FROM public.goals 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Found % goals for this user.', v_goals_count;
  
  -- Check if we have tasks
  SELECT COUNT(*) INTO v_tasks_count 
  FROM public.tasks 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Found % tasks for this user.', v_tasks_count;
  
  -- Insert or update profile based on findings
  IF v_profile_count = 0 THEN
    RAISE NOTICE 'Creating new user_ai_context...';
    
    INSERT INTO public.user_ai_context (
      user_id, 
      preferences, 
      interests, 
      dislikes, 
      personal_info, 
      conversation_highlights,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '{}'::jsonb,
      ARRAY['debug_test'],
      '{}',
      jsonb_build_object(
        'debug_info', 
        jsonb_build_object(
          'value', 'Profile created from debug script',
          'source', 'debug',
          'confidence', 1.0,
          'last_updated', NOW()
        )
      ),
      ARRAY['Debug test message'],
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new user_ai_context with debug information.';
  ELSE
    RAISE NOTICE 'Updating existing user_ai_context with debug information...';
    
    UPDATE public.user_ai_context
    SET 
      personal_info = personal_info || jsonb_build_object(
        'debug_info', 
        jsonb_build_object(
          'value', 'Profile updated from debug script',
          'source', 'debug',
          'confidence', 1.0,
          'last_updated', NOW()
        )
      ),
      interests = array_append(interests, 'debug_test'),
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Updated user_ai_context with debug information.';
  END IF;
  
  -- Display what exists now
  RAISE NOTICE 'Current user_ai_context data:';
  
  -- Display existing user_ai_context after update
  PERFORM personal_info, interests, dislikes, conversation_highlights
  FROM public.user_ai_context
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Still no user_ai_context data found. Check for errors in the table structure or permissions.';
  END IF;
  
END $$;

-- Show the final user_ai_context record
SELECT * FROM public.user_ai_context WHERE user_id = 'YOUR_USER_ID'; 
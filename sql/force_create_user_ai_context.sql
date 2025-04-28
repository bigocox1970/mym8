-- Replace with your actual user ID
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- Replace with your actual user ID
BEGIN
  -- Insert a basic record into user_ai_context
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
    ARRAY['getting started'],
    ARRAY['technical issues'],
    jsonb_build_object(
      'initial_setup', 
      jsonb_build_object(
        'value', 'Profile created manually',
        'source', 'manual',
        'confidence', 1.0,
        'last_updated', NOW()
      )
    ),
    ARRAY['Initial profile setup'],
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    interests = array_append(user_ai_context.interests, 'getting started'),
    personal_info = user_ai_context.personal_info || jsonb_build_object(
      'force_update', 
      jsonb_build_object(
        'value', 'Profile updated manually',
        'source', 'manual',
        'confidence', 1.0,
        'last_updated', NOW()
      )
    ),
    updated_at = NOW();
    
  RAISE NOTICE 'User AI context created or updated for %', v_user_id;
END $$;

-- Verify the record was created
SELECT * FROM public.user_ai_context WHERE user_id = 'YOUR_USER_ID'; 
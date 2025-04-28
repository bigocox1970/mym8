-- Script to add conversation highlights to the correct user ID
DO $$
DECLARE
  v_user_id UUID := '75ec432f-95f8-4ce0-9f45-546354f1f075'; -- Correct UUID
  v_context_id UUID;
  v_highlights_array TEXT[];
BEGIN
  -- First check if user_ai_context exists for this user
  SELECT id INTO v_context_id FROM public.user_ai_context WHERE user_id = v_user_id;
  
  -- If it doesn't exist, create it
  IF v_context_id IS NULL THEN
    RAISE NOTICE 'No user_ai_context found for this user. Creating one...';
    
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
      '{}',
      '{}',
      '{}'::jsonb,
      '{}',
      NOW(),
      NOW()
    ) RETURNING id INTO v_context_id;
    
    RAISE NOTICE 'Created new user_ai_context with ID: %', v_context_id;
  ELSE
    RAISE NOTICE 'Found existing user_ai_context with ID: %', v_context_id;
  END IF;
  
  -- Create a set of meaningful conversation highlights
  v_highlights_array := ARRAY[
    'First time using the app: Getting familiar with the goal tracking features',
    'Setting up my fitness goals and actions for daily exercise',
    'Learning about the AI assistant that helps me stay on track',
    'Discussing ways to integrate new habits into my routine',
    'Exploring how to track my progress over time'
  ];
  
  -- Update the conversation highlights
  UPDATE public.user_ai_context
  SET 
    conversation_highlights = v_highlights_array,
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Updated conversation highlights with % items', array_length(v_highlights_array, 1);
  
  -- Also update personal_info with some sample data if it's empty
  UPDATE public.user_ai_context
  SET 
    personal_info = personal_info || jsonb_build_object(
      'goals_summary', 
      jsonb_build_object(
        'value', 'Several active goals',
        'source', 'system',
        'confidence', 1.0,
        'last_updated', NOW()
      ),
      'actions_summary', 
      jsonb_build_object(
        'value', 'Multiple actions in progress',
        'source', 'system',
        'confidence', 1.0,
        'last_updated', NOW()
      )
    ),
    updated_at = NOW()
  WHERE user_id = v_user_id AND (personal_info IS NULL OR personal_info = '{}'::jsonb);
  
  RAISE NOTICE 'Also updated personal info with sample data';
  
  -- Verify the update
  SELECT conversation_highlights INTO v_highlights_array 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'New conversation_highlights: %', v_highlights_array;

  -- Check all data for this user
  RAISE NOTICE 'Full user_ai_context record:';
  
  PERFORM * FROM public.user_ai_context WHERE user_id = v_user_id;  
END $$;

-- Check the result
SELECT 
  user_id,
  conversation_highlights,
  array_length(conversation_highlights, 1) as highlight_count,
  pg_typeof(conversation_highlights) as data_type,
  personal_info
FROM 
  public.user_ai_context 
WHERE 
  user_id = '75ec432f-95f8-4ce0-9f45-546354f1f075'; 
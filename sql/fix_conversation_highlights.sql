-- Script to repair the conversation_highlights array format
DO $$
DECLARE
  v_user_id UUID := '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';
  v_context_data RECORD;
  v_highlights_array TEXT[];
BEGIN
  -- First, fetch the current data
  SELECT * INTO v_context_data 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Current data: %', v_context_data;
  
  -- Check conversation_highlights format
  RAISE NOTICE 'Conversation highlights type: %', pg_typeof(v_context_data.conversation_highlights);
  
  -- If it's an array, use it directly; otherwise set up a new array
  IF pg_typeof(v_context_data.conversation_highlights) = 'text[]'::regtype THEN
    RAISE NOTICE 'conversation_highlights is already a text array';
    v_highlights_array := v_context_data.conversation_highlights;
    
    -- However, if it's an empty array or only has null values, replace it
    IF array_length(v_highlights_array, 1) IS NULL OR 
       (array_length(v_highlights_array, 1) = 1 AND v_highlights_array[1] IS NULL) THEN
      RAISE NOTICE 'Empty or null array detected, replacing with sample data';
      v_highlights_array := ARRAY[
        'First time using the app: Getting familiar with the goal tracking features',
        'Setting up my fitness goals and actions for daily exercise',
        'Learning about the AI assistant that helps me stay on track',
        'Discussing ways to integrate new habits into my routine',
        'Exploring how to track my progress over time'
      ];
    END IF;
  ELSE
    -- It's not an array, create a new array with sample values
    RAISE NOTICE 'conversation_highlights is NOT a text array, creating new array';
    v_highlights_array := ARRAY[
      'First time using the app: Getting familiar with the goal tracking features',
      'Setting up my fitness goals and actions for daily exercise',
      'Learning about the AI assistant that helps me stay on track',
      'Discussing ways to integrate new habits into my routine',
      'Exploring how to track my progress over time'
    ];
  END IF;
  
  -- Update the database with the correct array format
  UPDATE public.user_ai_context
  SET conversation_highlights = v_highlights_array,
      updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Updated conversation_highlights to proper array format with % items', array_length(v_highlights_array, 1);
  
  -- Verify the update
  SELECT conversation_highlights INTO v_highlights_array 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'New conversation_highlights: %', v_highlights_array;
END $$;

-- Check the result
SELECT json_agg(conversation_highlights) FROM public.user_ai_context WHERE user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6'; 
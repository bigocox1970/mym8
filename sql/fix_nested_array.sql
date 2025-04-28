-- Script to fix nested array in conversation_highlights
DO $$
DECLARE
  v_user_id UUID := '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';
  v_nested_array TEXT[][];
  v_fixed_array TEXT[];
BEGIN
  -- First, fetch the current data to check if it's a nested array
  SELECT conversation_highlights::TEXT[][] INTO v_nested_array 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Current data type: %', pg_typeof(v_nested_array);
  
  IF v_nested_array IS NOT NULL AND array_ndims(v_nested_array) = 2 THEN
    -- It's a nested array, extract the first inner array
    RAISE NOTICE 'Found nested array, extracting inner array';
    v_fixed_array := v_nested_array[1];
    
    -- Update with the fixed array
    UPDATE public.user_ai_context
    SET conversation_highlights = v_fixed_array,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Updated conversation_highlights, removing one level of nesting';
  ELSE
    -- Create a completely new array with sample values
    RAISE NOTICE 'Creating new array with sample values';
    v_fixed_array := ARRAY[
      'First time using the app: Getting familiar with the goal tracking features',
      'Setting up my fitness goals and actions for daily exercise',
      'Learning about the AI assistant that helps me stay on track',
      'Discussing ways to integrate new habits into my routine',
      'Exploring how to track my progress over time'
    ];
    
    -- Update with the new array
    UPDATE public.user_ai_context
    SET conversation_highlights = v_fixed_array,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Updated conversation_highlights with completely new array';
  END IF;
  
  -- Verify the update
  SELECT conversation_highlights INTO v_fixed_array 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'New conversation_highlights: %', v_fixed_array;
  RAISE NOTICE 'New data type: %', pg_typeof(v_fixed_array);
END $$;

-- Check the result (should now be a 1D array)
SELECT json_agg(conversation_highlights) FROM public.user_ai_context WHERE user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';

-- Alternative query to better see the structure
SELECT 
  conversation_highlights,
  array_ndims(conversation_highlights) as dimensions,
  array_length(conversation_highlights, 1) as length,
  pg_typeof(conversation_highlights) as data_type
FROM 
  public.user_ai_context 
WHERE 
  user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6'; 
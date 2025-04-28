-- Verify conversation highlights exist in database
SELECT 
  id,
  user_id,
  conversation_highlights,
  array_length(conversation_highlights, 1) as highlight_count,
  updated_at
FROM 
  public.user_ai_context 
WHERE 
  user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';

-- Check if conversation highlights are properly formatted as array
SELECT 
  json_agg(conversation_highlights) as highlights_json 
FROM 
  public.user_ai_context 
WHERE 
  user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';

-- Try inserting real highlights from any existing messages
DO $$
DECLARE
  v_user_id UUID := '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';
BEGIN
  -- Update with more descriptive highlights
  UPDATE public.user_ai_context
  SET conversation_highlights = ARRAY[
    'First time using the app: Getting familiar with the goal tracking features',
    'Setting up my fitness goals and actions for daily exercise',
    'Learning about the AI assistant that helps me stay on track',
    'Discussing ways to integrate new habits into my routine',
    'Exploring how to track my progress over time'
  ],
  updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Updated with descriptive sample highlights. Please check your app UI now.';
END $$; 
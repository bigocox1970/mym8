-- Simple script to add conversation highlights
-- Replace with your actual UUID
UPDATE public.user_ai_context
SET conversation_highlights = ARRAY[
  'Sample conversation highlight 1: Getting to know the app',
  'Sample conversation highlight 2: Setting first goals',
  'Sample conversation highlight 3: Learning to use the app features'
],
updated_at = NOW()
WHERE user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6';

-- Check the result
SELECT conversation_highlights 
FROM public.user_ai_context 
WHERE user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6'; 
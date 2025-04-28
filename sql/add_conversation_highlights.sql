-- Replace with your actual user ID
SET client_min_messages TO 'NOTICE';

DO $$
DECLARE
  v_user_id UUID := '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6'; -- Fixed invalid UUID by removing the 'Y'
  v_messages_count INT;
  v_has_context BOOLEAN;
  message_record RECORD;
  highlight_array TEXT[] := '{}';
BEGIN
  -- Check if we have messages
  SELECT COUNT(*) INTO v_messages_count 
  FROM public.messages 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Found % messages for this user.', v_messages_count;
  
  -- Check if user_ai_context exists
  SELECT EXISTS (
    SELECT 1 FROM public.user_ai_context WHERE user_id = v_user_id
  ) INTO v_has_context;
  
  IF NOT v_has_context THEN
    RAISE NOTICE 'No user_ai_context found. Creating one first...';
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
    );
    RAISE NOTICE 'Created new user_ai_context record.';
  END IF;
  
  -- If we have messages, extract highlights from them
  IF v_messages_count > 0 THEN
    RAISE NOTICE 'Extracting conversation highlights from messages...';
    
    -- Add example highlights if no real messages
    IF v_messages_count < 3 THEN
      RAISE NOTICE 'Not enough messages. Adding sample conversation highlights...';
      highlight_array := ARRAY[
        'Sample conversation highlight 1: Getting to know the app',
        'Sample conversation highlight 2: Setting first goals',
        'Sample conversation highlight 3: Learning to use the app features'
      ];
    ELSE
      -- Extract highlights from real messages
      FOR message_record IN 
        SELECT content 
        FROM public.messages 
        WHERE user_id = v_user_id AND role = 'user' AND LENGTH(content) > 20
        ORDER BY timestamp DESC
        LIMIT 10
      LOOP
        -- Add to highlights array, but limit length to avoid overflow
        highlight_array := array_append(
          highlight_array, 
          substr(message_record.content, 1, 100) || CASE WHEN LENGTH(message_record.content) > 100 THEN '...' ELSE '' END
        );
        RAISE NOTICE 'Added highlight: %', highlight_array[array_length(highlight_array, 1)];
      END LOOP;
      
      -- If we still don't have highlights, add some defaults
      IF array_length(highlight_array, 1) IS NULL OR array_length(highlight_array, 1) = 0 THEN
        RAISE NOTICE 'No suitable messages found. Adding sample conversation highlights...';
        highlight_array := ARRAY[
          'Sample conversation highlight 1: Getting to know the app',
          'Sample conversation highlight 2: Setting first goals',
          'Sample conversation highlight 3: Learning to use the app features'
        ];
      END IF;
    END IF;
    
    -- Update the conversation highlights in user_ai_context
    UPDATE public.user_ai_context
    SET conversation_highlights = highlight_array,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Updated conversation highlights with % items.', array_length(highlight_array, 1);
  ELSE
    RAISE NOTICE 'No messages found. Adding sample conversation highlights...';
    
    -- Add sample highlights
    highlight_array := ARRAY[
      'Sample conversation highlight 1: Getting to know the app',
      'Sample conversation highlight 2: Setting first goals',
      'Sample conversation highlight 3: Learning to use the app features'
    ];
    
    -- Update with sample highlights
    UPDATE public.user_ai_context
    SET conversation_highlights = highlight_array,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Added sample conversation highlights.';
  END IF;
  
  -- Show the updated profile
  RAISE NOTICE 'Updated user_ai_context. New conversation highlights:';
  
  -- Display conversation highlights
  SELECT conversation_highlights
  FROM public.user_ai_context
  WHERE user_id = v_user_id
  INTO message_record;
  
  RAISE NOTICE '%', message_record.conversation_highlights;
END $$;

-- Show the final user_ai_context record
SELECT * FROM public.user_ai_context WHERE user_id = '07735aaa-2f5d-444b-82fd-9c92ceb0d0d6'; 
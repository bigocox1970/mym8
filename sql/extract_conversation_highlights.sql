-- Script to extract meaningful highlights from actual conversation history
DO $$
DECLARE
  v_user_id UUID := '75ec432f-95f8-4ce0-9f45-546354f1f075'; -- Correct UUID
  v_message RECORD;
  v_highlights_array TEXT[] := '{}';
  v_message_count INT;
  v_highlight_count INT := 0;
  v_max_highlights INT := 10; -- Maximum number of highlights to extract
  v_min_message_length INT := 20; -- Minimum length of message to consider as highlight
BEGIN
  -- First check if we have messages for this user
  SELECT COUNT(*) INTO v_message_count 
  FROM public.messages 
  WHERE user_id = v_user_id AND role = 'user';
  
  RAISE NOTICE 'Found % user messages in conversation history', v_message_count;
  
  IF v_message_count = 0 THEN
    RAISE NOTICE 'No messages found. Keeping existing highlights.';
    RETURN;
  END IF;
  
  -- Extract meaningful messages as highlights
  -- First, get longer messages that likely contain meaningful content
  FOR v_message IN 
    SELECT content, timestamp
    FROM public.messages
    WHERE user_id = v_user_id 
      AND role = 'user' 
      AND LENGTH(content) > v_min_message_length
    ORDER BY timestamp DESC
    LIMIT 50
  LOOP
    -- Skip if we already have enough highlights
    IF v_highlight_count >= v_max_highlights THEN
      EXIT;
    END IF;
    
    -- Only add substantive messages that express preferences, interests, or personal info
    -- Look for common patterns in messages
    IF v_message.content ~* 'i (like|love|enjoy|prefer|want|need|feel|think|believe)' OR
       v_message.content ~* 'my (goal|goals|preference|hobby|interest|family|job|work|health)' OR
       v_message.content ~* 'help me (with|to)' THEN
      
      -- Add truncated message as a highlight
      v_highlights_array := array_append(
        v_highlights_array,
        substring(v_message.content from 1 for 120) || 
          CASE WHEN LENGTH(v_message.content) > 120 THEN '...' ELSE '' END
      );
      
      v_highlight_count := v_highlight_count + 1;
      RAISE NOTICE 'Added highlight: %', v_highlights_array[array_length(v_highlights_array, 1)];
    END IF;
  END LOOP;
  
  -- If we couldn't find enough interesting highlights, add some based on first messages
  IF array_length(v_highlights_array, 1) < 3 THEN
    RAISE NOTICE 'Not enough interesting highlights found. Adding some based on first messages.';
    
    FOR v_message IN 
      SELECT content, timestamp
      FROM public.messages
      WHERE user_id = v_user_id AND role = 'user' AND LENGTH(content) > 10
      ORDER BY timestamp ASC
      LIMIT 5
    LOOP
      -- Only add if we don't already have enough highlights
      IF array_length(v_highlights_array, 1) < v_max_highlights THEN
        -- Add truncated message as a highlight
        v_highlights_array := array_append(
          v_highlights_array,
          'First conversations: ' || substring(v_message.content from 1 for 100) || 
            CASE WHEN LENGTH(v_message.content) > 100 THEN '...' ELSE '' END
        );
      END IF;
    END LOOP;
  END IF;
  
  -- If we still don't have enough highlights, look at assistant responses
  IF array_length(v_highlights_array, 1) < 3 THEN
    RAISE NOTICE 'Still not enough highlights. Looking at assistant responses.';
    
    FOR v_message IN 
      SELECT content, timestamp
      FROM public.messages
      WHERE user_id = v_user_id AND role = 'assistant' AND LENGTH(content) > 50
      ORDER BY timestamp DESC
      LIMIT 10
    LOOP
      -- Only add if we don't already have enough highlights
      IF array_length(v_highlights_array, 1) < v_max_highlights THEN
        -- Add truncated message as a highlight
        v_highlights_array := array_append(
          v_highlights_array,
          'AI response: ' || substring(v_message.content from 1 for 100) || 
            CASE WHEN LENGTH(v_message.content) > 100 THEN '...' ELSE '' END
        );
      END IF;
    END LOOP;
  END IF;
  
  -- If we have highlights, update the user_ai_context
  IF array_length(v_highlights_array, 1) > 0 THEN
    RAISE NOTICE 'Updating user_ai_context with % actual conversation highlights', array_length(v_highlights_array, 1);
    
    -- Update the conversation highlights
    UPDATE public.user_ai_context
    SET 
      conversation_highlights = v_highlights_array,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Successfully updated conversation highlights with real data';
  ELSE
    RAISE NOTICE 'No meaningful highlights found in conversation history. Keeping existing highlights.';
  END IF;
  
  -- Verify the update
  SELECT conversation_highlights INTO v_highlights_array 
  FROM public.user_ai_context 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Current conversation_highlights: %', v_highlights_array;
END $$;

-- Check the result
SELECT 
  user_id,
  conversation_highlights,
  array_length(conversation_highlights, 1) as highlight_count
FROM 
  public.user_ai_context 
WHERE 
  user_id = '75ec432f-95f8-4ce0-9f45-546354f1f075'; 
-- Replace 'YOUR_USER_ID' with the actual user ID you want to analyze
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID'; -- Replace with actual user ID
  context_id UUID;
  goal_record RECORD;
  action_record RECORD;
  message_record RECORD;
  highlight_array TEXT[] := '{}';
BEGIN
  -- First check if user_ai_context already exists
  SELECT id INTO context_id FROM public.user_ai_context WHERE user_id = v_user_id;
  
  -- If it doesn't exist, create it
  IF context_id IS NULL THEN
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
    ) RETURNING id INTO context_id;
  END IF;
  
  -- Extract conversation highlights from user messages
  FOR message_record IN 
    SELECT content 
    FROM public.messages 
    WHERE user_id = v_user_id AND role = 'user'
    ORDER BY timestamp DESC
    LIMIT 20
  LOOP
    -- Only add substantive messages (longer than 10 chars)
    IF LENGTH(message_record.content) > 10 THEN
      -- Add to highlights array, but limit length to avoid overflow
      highlight_array := array_append(
        highlight_array, 
        substr(message_record.content, 1, 100) || CASE WHEN LENGTH(message_record.content) > 100 THEN '...' ELSE '' END
      );
    END IF;
  END LOOP;
  
  -- Limit to the 10 most recent highlights
  IF array_length(highlight_array, 1) > 10 THEN
    highlight_array := highlight_array[array_length(highlight_array, 1)-9 : array_length(highlight_array, 1)];
  END IF;
  
  -- Update conversation highlights
  UPDATE public.user_ai_context
  SET conversation_highlights = highlight_array,
      updated_at = NOW()
  WHERE id = context_id;
  
  -- Initialize personal info to include open goals and actions
  DECLARE
    personal_info_data JSONB := '{}';
    goals_data JSONB := '{}';
    actions_data JSONB := '{}';
  BEGIN
    -- Extract goals information
    FOR goal_record IN 
      SELECT id, goal_text, description, notes 
      FROM public.goals 
      WHERE user_id = v_user_id
    LOOP
      goals_data := goals_data || jsonb_build_object(
        goal_record.id, 
        jsonb_build_object(
          'goal_text', goal_record.goal_text,
          'description', goal_record.description,
          'notes', goal_record.notes
        )
      );
    END LOOP;
    
    -- Extract actions information
    FOR action_record IN 
      SELECT id, title, description, completed, goal_id, frequency
      FROM public.tasks
      WHERE user_id = v_user_id
    LOOP
      actions_data := actions_data || jsonb_build_object(
        action_record.id, 
        jsonb_build_object(
          'title', action_record.title,
          'description', action_record.description,
          'completed', action_record.completed,
          'goal_id', action_record.goal_id,
          'frequency', action_record.frequency
        )
      );
    END LOOP;
    
    -- Add goals and actions to personal_info
    personal_info_data := jsonb_build_object(
      'goals_summary', 
      jsonb_build_object(
        'value', (SELECT COUNT(*) FROM public.goals WHERE user_id = v_user_id)::text || ' active goals',
        'source', 'system',
        'confidence', 1.0,
        'last_updated', NOW()
      ),
      'actions_summary', 
      jsonb_build_object(
        'value', (SELECT COUNT(*) FROM public.tasks WHERE user_id = v_user_id)::text || ' total actions',
        'source', 'system',
        'confidence', 1.0,
        'last_updated', NOW()
      )
    );
    
    -- Update the user's personal info with goals and actions summary
    UPDATE public.user_ai_context
    SET personal_info = personal_info || personal_info_data,
        updated_at = NOW()
    WHERE id = context_id;
  END;
  
  -- Add placeholder for interests if they mentioned any goals
  DECLARE 
    goals_cursor CURSOR FOR 
      SELECT goal_text FROM public.goals WHERE user_id = v_user_id;
    goal_text TEXT;
    interests_array TEXT[] := (SELECT interests FROM public.user_ai_context WHERE id = context_id);
  BEGIN
    -- Extract potential interests from goal texts
    OPEN goals_cursor;
    LOOP
      FETCH goals_cursor INTO goal_text;
      EXIT WHEN NOT FOUND;
      
      -- Extract keywords that might be interests (simplistic approach)
      IF goal_text ILIKE '%exercise%' OR goal_text ILIKE '%workout%' OR goal_text ILIKE '%gym%' THEN
        interests_array := array_append(interests_array, 'fitness');
      END IF;
      
      IF goal_text ILIKE '%read%' OR goal_text ILIKE '%book%' THEN
        interests_array := array_append(interests_array, 'reading');
      END IF;
      
      IF goal_text ILIKE '%learning%' OR goal_text ILIKE '%study%' OR goal_text ILIKE '%education%' THEN
        interests_array := array_append(interests_array, 'learning');
      END IF;
      
      IF goal_text ILIKE '%meditat%' OR goal_text ILIKE '%mindful%' THEN
        interests_array := array_append(interests_array, 'mindfulness');
      END IF;
    END LOOP;
    CLOSE goals_cursor;
    
    -- Remove duplicates
    interests_array := ARRAY(SELECT DISTINCT unnest(interests_array));
    
    -- Update interests
    UPDATE public.user_ai_context
    SET interests = interests_array,
        updated_at = NOW()
    WHERE id = context_id;
  END;
  
  RAISE NOTICE 'Context loaded successfully for user %', v_user_id;
END $$; 
-- Add OpenRouter API configuration
DO $$
BEGIN
    -- Check if the OpenRouter config already exists
    IF NOT EXISTS (
        SELECT 1 FROM public.llm_configs 
        WHERE function_name = 'openrouter'
    ) THEN
        -- Insert default OpenRouter config
        INSERT INTO public.llm_configs (
            api_key,
            function_name,
            llm_provider,
            pre_prompt
        ) VALUES (
            'YOUR_OPENROUTER_API_KEY', -- Replace with your actual API key
            'openrouter',
            'anthropic/claude-3-opus:beta',
            'You are a helpful AI assistant for a goal-tracking application called "My M8". Your job is to help users manage their goals and actions, provide encouragement, and answer questions.'
        );
        
        RAISE NOTICE 'Added default OpenRouter API configuration';
    ELSE
        RAISE NOTICE 'OpenRouter API configuration already exists';
    END IF;
END $$; 
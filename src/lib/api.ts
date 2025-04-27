/**
 * API Service
 * This file handles all external API communication directly from the client.
 */

import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

// Define interfaces for the API data types
interface Goal {
  id: string;
  goal_text: string;
  description: string | null;
}

interface Action {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  skipped?: boolean;
  goal_id: string;
  frequency: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * Text-to-Speech API request
 * @param text Text to convert to speech
 * @param service Voice service to use
 * @param options Voice options like voice ID, gender, etc.
 * @returns A promise resolving to an audio URL or blob
 */
export async function textToSpeech(
  text: string,
  service: string,
  options: {
    voice: string;
    gender?: string;
  }
): Promise<Blob | string> {
  try {
    // Only handle non-browser TTS services here
    if (service === 'browser') {
      throw new Error('Browser TTS should be handled in the client component');
    }

    // Handle OpenAI TTS
    if (service === 'openai') {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: options.voice || 'alloy',
          input: text
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      return await response.blob();
    }

    throw new Error(`Unsupported TTS service: ${service}`);
  } catch (error) {
    console.error('TTS API error:', error);
    throw error;
  }
}

/**
 * LLM API request to process user messages
 * @param message User message
 * @param context Additional context like goals and actions
 * @returns AI response with possible actions
 */
export async function processMessage(
  message: string,
  context: {
    goals?: Goal[];
    actions?: Action[];
    conversation?: Message[];
  }
): Promise<{
  message: string;
  action?: string;
  navigate?: string;
  refresh?: boolean;
}> {
  try {
    // Format the conversation history for the API
    const messages = context.conversation?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    // Add the current message
    messages.push({
      role: 'user',
      content: message
    });

    // Add system message with context
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant. Here is some context about the user:
Goals: ${context.goals?.map(g => g.goal_text).join(', ') || 'None'}
Actions: ${context.actions?.map(a => a.title).join(', ') || 'None'}`
    };

    // Make direct API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI error response:', errorData);
      throw new Error('Failed to process message');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the response for any special actions
    const actionMatch = aiResponse.match(/\[ACTION:([^\]]+)\]/);
    const navigateMatch = aiResponse.match(/\[NAVIGATE:([^\]]+)\]/);
    const refreshMatch = aiResponse.match(/\[REFRESH\]/);

    return {
      message: aiResponse.replace(/\[ACTION:[^\]]+\]|\[NAVIGATE:[^\]]+\]|\[REFRESH\]/g, '').trim(),
      action: actionMatch ? actionMatch[1] : undefined,
      navigate: navigateMatch ? navigateMatch[1] : undefined,
      refresh: !!refreshMatch
    };
  } catch (error) {
    console.error('Message processing error:', error);
    toast.error(`Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get user subscription details
 * @returns Subscription information
 */
export async function getSubscription(): Promise<{
  level: string;
  services: string[];
  maxTokens: number;
  models: string[];
}> {
  // For now, return a default subscription since we're using direct API calls
  return {
    level: 'free',
    services: ['openai'],
    maxTokens: 1000,
    models: ['gpt-4']
  };
} 
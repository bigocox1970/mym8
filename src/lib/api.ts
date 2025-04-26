/**
 * API Service
 * This file handles all external API communication through a secure backend proxy.
 * API keys are stored and managed on the server, not in the client.
 */

import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

// Base URL for the backend API
// In development, this could point to a local server
// In production, this should point to your deployed backend
const getApiBaseUrl = () => {
  // First try environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // In development, use localhost:9000
  if (import.meta.env.DEV) {
    return 'http://localhost:9000/.netlify/functions/api';
  }
  // In production, use relative path
  return '/.netlify/functions/api';
};

const API_BASE_URL = getApiBaseUrl();

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
    // Get Supabase access token for authentication
    const token = await getAuthToken();

    // Make request to backend proxy instead of directly to TTS services
    const response = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        text,
        service,
        options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate speech');
    }

    // Return audio blob for browser playback
    return await response.blob();
  } catch (error) {
    console.error('TTS API error:', error);
    toast.error('Failed to generate speech');
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
    console.log('Sending request to:', `${API_BASE_URL}/chat`);
    console.log('With message:', message);
    
    // Get the current user's ID
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    
    // Send the full context to the API
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        goals: context.goals || [],
        actions: context.actions || [],
        conversation: context.conversation || [],
        userId: userId // Include the user ID for handling function calls
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Server error response:', errorData);
      throw new Error('Failed to process message');
    }

    return await response.json();
  } catch (error) {
    console.error('LLM API error:', error);
    toast.error('Failed to process message');
    throw error;
  }
}

/**
 * Get the user's subscription details
 * @returns The user's subscription level and available services
 */
export async function getSubscription(): Promise<{
  level: string;
  services: string[];
  maxTokens: number;
  models: string[];
}> {
  try {
    // Get Supabase access token for authentication
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/subscription`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get subscription details');
    }

    return await response.json();
  } catch (error) {
    console.error('Subscription API error:', error);
    // Return free tier as fallback
    return {
      level: 'free',
      services: ['browser'],
      maxTokens: 1000,
      models: ['gpt-3.5-turbo']
    };
  }
}

/**
 * Gets the authentication token from Supabase
 */
async function getAuthToken(): Promise<string> {
  try {
    // Get the current session from Supabase
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      console.log('No active Supabase session, using development token');
      // For development, return a placeholder token
      return 'dev-token';
    }
    
    // Return the access token from the session
    return data.session.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Return development token for local testing
    return 'dev-token';
  }
} 
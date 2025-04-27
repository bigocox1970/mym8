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
  // In development, use the environment variable if specified, or a relative URL that works with any port
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || '/.netlify/functions/api';
  }
  
  // For production, use a relative URL
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
    console.log(`TTS Request - Service: ${service}, Voice: ${options.voice}, Gender: ${options.gender || 'not specified'}`);
    console.log(`Text to convert (first 50 chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Special handling for browser TTS - handled directly in the client
    if (service === 'browser') {
      return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
          reject(new Error('Browser does not support speech synthesis'));
          return;
        }
        
        try {
          // Set up SpeechSynthesis
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Get available voices
          let voices = window.speechSynthesis.getVoices();
          
          const setupVoice = () => {
            // Find voice by gender
            const gender = options.gender || 'female';
            
            // Try to find a matching voice
            const matchingVoices = voices.filter(voice => {
              // Try to match by gender if available in the name
              const voiceName = voice.name.toLowerCase();
              if (gender === 'female') {
                return !voiceName.includes('male') || voiceName.includes('female');
              } else {
                return voiceName.includes('male') && !voiceName.includes('female');
              }
            });
            
            // Use a matching voice or fall back to the first available
            utterance.voice = matchingVoices[0] || voices[0];
            
            // Speak the text directly
            window.speechSynthesis.speak(utterance);
          };
          
          // If voices aren't loaded yet, wait for them
          if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
              voices = window.speechSynthesis.getVoices();
              setupVoice();
            };
          } else {
            setupVoice();
          }
          
          // Create a tiny audio blob to return for API compatibility
          // This is a minimal MP3 file (essentially empty/silent)
          const silentMp3 = new Uint8Array([
            0xFF, 0xE3, 0x18, 0xC4, 0x00, 0x00, 0x00, 0x03, 0x48, 0x00, 0x00, 0x00,
            0x00, 0x4C, 0x41, 0x4D, 0x45, 0x33, 0x2E, 0x39, 0x39, 0x2E, 0x35, 0x55,
            0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55
          ]);
          
          // Return a small audio blob so the API is compatible with other TTS services
          resolve(new Blob([silentMp3], { type: 'audio/mpeg' }));
        } catch (err) {
          console.error('Error with browser TTS:', err);
          
          // Still try to speak with a fallback
          try {
            const fallbackUtterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(fallbackUtterance);
            
            // Return empty blob as fallback
            resolve(new Blob([], { type: 'audio/mpeg' }));
          } catch (speakErr) {
            console.error('Failed to use direct speech:', speakErr);
            reject(new Error('Failed to generate speech with browser TTS'));
          }
        }
      });
    }
    
    // Get Supabase access token for authentication
    const token = await getAuthToken();
    console.log(`Auth token obtained: ${token ? 'Yes' : 'No'}`);

    // Log the request URL
    const requestUrl = `${API_BASE_URL}/tts`;
    console.log(`Making TTS request to: ${requestUrl}`);
    
    // Create request body with debugging info
    const requestBody = {
      text,
      service,
      options
    };
    console.log(`Request payload: ${JSON.stringify(requestBody)}`);

    // Make request to backend proxy instead of directly to TTS services
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`TTS API error response (${response.status}): ${responseText}`);
      
      let errorMessage = 'Failed to generate speech';
      try {
        // Try to parse as JSON
        const error = JSON.parse(responseText);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        // If not JSON, use the text as-is
        errorMessage = responseText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    // Check response type
    const contentType = response.headers.get('Content-Type');
    console.log(`Response Content-Type: ${contentType}`);

    // Return audio blob for browser playback
    const blob = await response.blob();
    console.log(`Received blob size: ${blob.size} bytes, type: ${blob.type}`);
    
    // Special handling for OpenAI audio, which might have format issues
    if (service === 'openai') {
      try {
        console.log('Processing OpenAI audio for playback compatibility');
        
        // Pass the audio blob through our dedicated audio conversion function
        const audioConversionEndpoint = `${API_BASE_URL.replace('/api', '')}/audio-convert`;
        console.log(`Using audio conversion endpoint: ${audioConversionEndpoint}`);
        
        const conversionResponse = await fetch(audioConversionEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: blob
        });
        
        if (!conversionResponse.ok) {
          console.error(`Audio conversion failed: ${conversionResponse.status} ${conversionResponse.statusText}`);
          return blob; // Return original blob if conversion fails
        }
        
        const convertedBlob = await conversionResponse.blob();
        console.log(`Converted audio: ${convertedBlob.size} bytes, type: ${convertedBlob.type}`);
        
        return convertedBlob;
      } catch (err) {
        console.error('Error handling OpenAI audio:', err);
        // Return the original blob if processing failed
        return blob;
      }
    }
    
    return blob;
  } catch (error) {
    console.error('TTS API error:', error);
    toast.error(`Failed to generate speech: ${error instanceof Error ? error.message : String(error)}`);
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
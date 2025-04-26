import appConfig from '@/config/app-config.json';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';

// Define the configuration interface
export interface AppConfig {
  llm_provider: string;
  enable_ai: boolean;
  assistant_name: string;
  personality_type: string;
  voice_gender: string;
  voice_service: string;
  elevenlabs_voice: string;
  google_voice: string;
  azure_voice: string;
  amazon_voice: string;
  openai_voice: string;
  voice_enabled?: boolean;
  // API keys are removed from client-side storage
}

// In-memory store of the current config
let currentConfig: AppConfig = { ...appConfig };

// Create a type for the API key properties we want to remove
type ApiKeyProperties = {
  elevenlabs_api_key?: string;
  google_api_key?: string;
  azure_api_key?: string;
  amazon_api_key?: string;
  openai_api_key?: string;
};

// Remove any API keys from the config
delete (currentConfig as AppConfig & ApiKeyProperties).elevenlabs_api_key;
delete (currentConfig as AppConfig & ApiKeyProperties).google_api_key;
delete (currentConfig as AppConfig & ApiKeyProperties).azure_api_key;
delete (currentConfig as AppConfig & ApiKeyProperties).amazon_api_key;
delete (currentConfig as AppConfig & ApiKeyProperties).openai_api_key;

/**
 * Gets the current application configuration
 * @returns The current application configuration
 */
export function getConfig(): AppConfig {
  return { ...currentConfig };
}

/**
 * Updates the application configuration
 * @param newConfig The new configuration to apply (can be partial)
 * @returns A promise that resolves when the configuration is updated
 */
export async function updateConfig(newConfig: Partial<AppConfig>): Promise<void> {
  try {
    // Remove any API keys from the newConfig
    const safeConfig = { ...newConfig };
    delete (safeConfig as Partial<AppConfig> & ApiKeyProperties).elevenlabs_api_key;
    delete (safeConfig as Partial<AppConfig> & ApiKeyProperties).google_api_key;
    delete (safeConfig as Partial<AppConfig> & ApiKeyProperties).azure_api_key;
    delete (safeConfig as Partial<AppConfig> & ApiKeyProperties).amazon_api_key;
    delete (safeConfig as Partial<AppConfig> & ApiKeyProperties).openai_api_key;
    
    // Update the in-memory config
    currentConfig = { ...currentConfig, ...safeConfig };
    
    // Save to localStorage - API keys are never stored here
    localStorage.setItem('app-config', JSON.stringify(currentConfig));
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const preferences = {
          user_id: user.id,
          llm_provider: safeConfig.llm_provider || null,
          enable_ai: safeConfig.enable_ai ?? true,
          assistant_name: safeConfig.assistant_name || null,
          personality_type: safeConfig.personality_type || null,
          voice_gender: safeConfig.voice_gender || null,
          voice_service: safeConfig.voice_service || null,
          elevenlabs_voice: safeConfig.elevenlabs_voice || null,
          google_voice: safeConfig.google_voice || null,
          azure_voice: safeConfig.azure_voice || null,
          amazon_voice: safeConfig.amazon_voice || null,
          openai_voice: safeConfig.openai_voice || null,
          updated_at: new Date().toISOString()
        };

        // Check if preferences exist
        const { data: existingPrefs } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        if (existingPrefs) {
          // Update existing preferences
          await supabase
            .from('user_preferences')
            .update(preferences)
            .eq('user_id', user.id);
        } else {
          // Insert new preferences
          await supabase
            .from('user_preferences')
            .insert([preferences]);
        }
      }
    } catch (error) {
      console.error('Error saving preferences to Supabase:', error);
      // Continue with local storage even if Supabase fails
    }
    
    console.log('Config updated successfully:', currentConfig);
    return Promise.resolve();
  } catch (error) {
    console.error('Error updating config:', error);
    toast.error('Failed to save configuration');
    return Promise.reject(error);
  }
}

/**
 * Gets available TTS services based on subscription
 * In a real app, this would check with the backend
 * @returns A promise that resolves with available services
 */
export async function getAvailableServices(): Promise<string[]> {
  // In a production app, this would fetch from backend based on subscription level
  // For now, return all services as available
  return ["browser", "elevenlabs", "google", "azure", "amazon", "openai"];
}

/**
 * Initializes the configuration system
 * Loads any saved config from localStorage and Supabase
 */
export async function initConfig(): Promise<void> {
  try {
    // First load from localStorage for immediate availability
    const savedConfig = localStorage.getItem('app-config');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      
      // Remove any API keys that might be in localStorage
      delete parsedConfig.elevenlabs_api_key;
      delete parsedConfig.google_api_key;
      delete parsedConfig.azure_api_key;
      delete parsedConfig.amazon_api_key;
      delete parsedConfig.openai_api_key;
      
      currentConfig = { ...currentConfig, ...parsedConfig };
    }

    try {
      // Then try to load from Supabase if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select()
          .eq('user_id', user.id)
          .single();

        if (preferences) {
          // Update both memory and localStorage with Supabase data
          const { user_id, updated_at, ...configData } = preferences;
          currentConfig = { ...currentConfig, ...configData };
          localStorage.setItem('app-config', JSON.stringify(currentConfig));
          console.log('Loaded config from Supabase:', currentConfig);
        }
      }
    } catch (error) {
      console.error('Error loading preferences from Supabase:', error);
      // Continue with local storage even if Supabase fails
    }
  } catch (error) {
    console.error('Error initializing config:', error);
  }
}

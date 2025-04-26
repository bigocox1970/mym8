import appConfig from '@/config/app-config.json';
import { toast } from '@/components/ui/sonner';

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
    
    // For a production app, sync user preferences to the backend
    // await syncConfigToBackend(currentConfig);
    
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
 * Loads any saved config from localStorage
 */
export function initConfig(): void {
  try {
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
      console.log('Loaded config from localStorage:', currentConfig);
    }
  } catch (error) {
    console.error('Error initializing config:', error);
  }
}

// Initialize config when this module is imported
initConfig(); 
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2, Bot } from "lucide-react";
import { getConfig, updateConfig, initConfig } from "@/lib/configManager";

// Import sub-components
import { SubscriptionInfo } from "./AISettings/SubscriptionInfo";
import { GeneralAISettings } from "./AISettings/GeneralAISettings";
import { VoiceSettings } from "./AISettings/VoiceSettings";

// Import types and defaults
import { AI_MODELS, DEFAULT_AI_MODEL } from "@/config/ai";
import { 
  DEFAULT_VOICE_SETTINGS 
} from "@/config/voice";

const AISettings = () => {
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_AI_MODEL);
  const [isSaving, setIsSaving] = useState(false);
  const [enableAI, setEnableAI] = useState(true);
  const [assistantName, setAssistantName] = useState("M8");
  const [personalityType, setPersonalityType] = useState<string>("gentle");
  const [voiceType, setVoiceType] = useState<string>(DEFAULT_VOICE_SETTINGS.voiceType);
  const [voiceService, setVoiceService] = useState<string>(DEFAULT_VOICE_SETTINGS.voiceService);
  const [elevenlabsVoice, setElevenlabsVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.elevenlabsVoice);
  const [googleVoice, setGoogleVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.googleVoice);
  const [azureVoice, setAzureVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.azureVoice);
  const [amazonVoice, setAmazonVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.amazonVoice);
  const [openaiVoice, setOpenaiVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.openaiVoice);
  
  // Subscription state
  const [availableServices, setAvailableServices] = useState<string[]>(['browser']);
  const [subscription, setSubscription] = useState<{ 
    level: string; 
    services: string[]; 
    maxTokens: number;
    models: string[];
  }>({
    level: 'free',
    services: ['browser'],
    maxTokens: 1000,
    models: ['gpt-3.5-turbo']
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing configuration and subscription details
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        await initConfig(); // Wait for Supabase sync
        const config = getConfig();
        console.log("Loaded config from storage:", config);
        
        // Update all state variables from the config
        if (config.llm_provider) {
          setSelectedModel(config.llm_provider);
        }
        
        setEnableAI(config.enable_ai !== false);
        
        if (config.assistant_name) {
          setAssistantName(config.assistant_name);
        }
        
        if (config.personality_type) {
          setPersonalityType(config.personality_type);
        }

        if (config.voice_gender) {
          setVoiceType(config.voice_gender);
        }
        
        if (config.voice_service) {
          setVoiceService(config.voice_service);
        }
        
        if (config.elevenlabs_voice) {
          setElevenlabsVoice(config.elevenlabs_voice);
        }

        if (config.google_voice) {
          setGoogleVoice(config.google_voice);
        }

        if (config.azure_voice) {
          setAzureVoice(config.azure_voice);
        }

        if (config.amazon_voice) {
          setAmazonVoice(config.amazon_voice);
        }

        if (config.openai_voice) {
          setOpenaiVoice(config.openai_voice);
        }
        
        // Set all services as available since we don't have a backend
        setSubscription({
          level: 'premium',
          services: ['browser', 'elevenlabs', 'google', 'azure', 'amazon', 'openai'],
          maxTokens: 4000,
          models: ['gpt-3.5-turbo', 'gpt-4o', 'anthropic/claude-3-opus:beta', 'anthropic/claude-3-sonnet', 'google/gemini-pro']
        });
        setAvailableServices(['browser', 'elevenlabs', 'google', 'azure', 'amazon', 'openai']);
      } catch (error) {
        console.error("Error loading configuration:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to save settings");
      return;
    }

    setIsSaving(true);

    try {
      // Save user preferences using our config manager
      await updateConfig({
        llm_provider: selectedModel,
        enable_ai: enableAI,
        assistant_name: assistantName,
        personality_type: personalityType,
        voice_gender: voiceType,
        voice_service: voiceService,
        elevenlabs_voice: elevenlabsVoice,
        google_voice: googleVoice,
        azure_voice: azureVoice,
        amazon_voice: amazonVoice,
        openai_voice: openaiVoice
      });

      console.log("Successfully saved settings");
      toast.success("AI settings saved successfully");
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast.error("Failed to save AI settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Assistant Settings
          </CardTitle>
          <CardDescription>
            Configure your AI assistant's behavior and voice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Subscription info */}
            <SubscriptionInfo 
              subscription={subscription}
              availableServices={availableServices}
            />

            {/* Main settings */}
            <div className="space-y-4">
              {/* General AI settings */}
              <GeneralAISettings
                enableAI={enableAI}
                setEnableAI={setEnableAI}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                subscription={subscription}
                assistantName={assistantName}
                setAssistantName={setAssistantName}
                personalityType={personalityType}
                setPersonalityType={setPersonalityType}
              />
                
              {/* Voice Settings */}
              <VoiceSettings
                voiceService={voiceService}
                setVoiceService={setVoiceService}
                voiceType={voiceType}
                setVoiceType={setVoiceType}
                elevenlabsVoice={elevenlabsVoice}
                setElevenlabsVoice={setElevenlabsVoice}
                googleVoice={googleVoice}
                setGoogleVoice={setGoogleVoice}
                azureVoice={azureVoice}
                setAzureVoice={setAzureVoice}
                amazonVoice={amazonVoice}
                setAmazonVoice={setAmazonVoice}
                openaiVoice={openaiVoice}
                setOpenaiVoice={setOpenaiVoice}
                availableServices={availableServices}
              />
              
              {/* API Base URL Display */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-base font-medium mb-2">API Information</h3>
                <div className="bg-muted p-2 rounded text-sm font-mono overflow-x-auto">
                  <p id="api-base-url">{import.meta.env.VITE_API_BASE_URL || '/.netlify/functions/api'}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  API endpoint used for TTS and other services
                </p>
              </div>
              
              {/* Save Button */}
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full mt-4"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AISettings;

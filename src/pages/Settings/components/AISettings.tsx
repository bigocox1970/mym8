import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bot, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

// Import from configuration files
import { AI_MODELS, DEFAULT_AI_MODEL } from "@/config/ai";
import { 
  VOICE_SERVICES, 
  VOICE_TYPES, 
  ELEVENLABS_VOICES, 
  GOOGLE_VOICES,
  AZURE_VOICES,
  AMAZON_VOICES,
  OPENAI_VOICES,
  DEFAULT_VOICE_SETTINGS 
} from "@/config/voice";
import { PERSONALITY_PROMPTS, generateFullPrompt } from "@/config/prompts";
import { getConfig, updateConfig } from "@/lib/configManager";

// Define personality types from our prompts configuration
const PERSONALITY_TYPES = Object.keys(PERSONALITY_PROMPTS).map(key => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
}));

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

  // Function to render the appropriate voice options based on selected service
  const renderVoiceServiceOptions = () => {
    switch (voiceService) {
      case "browser":
        return (
          <div className="space-y-2 mb-4">
            <Label htmlFor="voice-select" className="text-base font-medium">
              Browser Voice Type
            </Label>
            <Select value={voiceType} onValueChange={setVoiceType}>
              <SelectTrigger id="voice-select" className="w-full">
                <SelectValue placeholder="Select voice type" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose the voice type for your assistant's speech
            </p>
          </div>
        );

      case "elevenlabs":
        return (
          <div className="space-y-2 mb-4">
            <Label htmlFor="elevenlabs-voice-select" className="text-base font-medium">
              ElevenLabs Voice
            </Label>
            <Select value={elevenlabsVoice} onValueChange={setElevenlabsVoice}>
              <SelectTrigger id="elevenlabs-voice-select" className="w-full">
                <SelectValue placeholder="Select ElevenLabs voice" />
              </SelectTrigger>
              <SelectContent>
                {ELEVENLABS_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which ElevenLabs voice to use
            </p>
          </div>
        );

      case "google":
        return (
          <div className="space-y-2 mb-4">
            <Label htmlFor="google-voice-select" className="text-base font-medium">
              Google Cloud Voice
            </Label>
            <Select value={googleVoice} onValueChange={setGoogleVoice}>
              <SelectTrigger id="google-voice-select" className="w-full">
                <SelectValue placeholder="Select Google voice" />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which Google Cloud TTS voice to use
            </p>
          </div>
        );

      case "azure":
        return (
          <div className="space-y-2 mb-4">
            <Label htmlFor="azure-voice-select" className="text-base font-medium">
              Azure Voice
            </Label>
            <Select value={azureVoice} onValueChange={setAzureVoice}>
              <SelectTrigger id="azure-voice-select" className="w-full">
                <SelectValue placeholder="Select Azure voice" />
              </SelectTrigger>
              <SelectContent>
                {AZURE_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which Azure TTS voice to use
            </p>
          </div>
        );

      case "amazon":
        return (
          <div className="space-y-2 mb-4">
            <Label htmlFor="amazon-voice-select" className="text-base font-medium">
              Amazon Polly Voice
            </Label>
            <Select value={amazonVoice} onValueChange={setAmazonVoice}>
              <SelectTrigger id="amazon-voice-select" className="w-full">
                <SelectValue placeholder="Select Amazon voice" />
              </SelectTrigger>
              <SelectContent>
                {AMAZON_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which Amazon Polly voice to use
            </p>
          </div>
        );

      case "openai":
        return (
          <div className="space-y-2 mb-4">
            <Label htmlFor="openai-voice-select" className="text-base font-medium">
              OpenAI Voice
            </Label>
            <Select value={openaiVoice} onValueChange={setOpenaiVoice}>
              <SelectTrigger id="openai-voice-select" className="w-full">
                <SelectValue placeholder="Select OpenAI voice" />
              </SelectTrigger>
              <SelectContent>
                {OPENAI_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which OpenAI TTS voice to use
            </p>
          </div>
        );

      default:
        return null;
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
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Current Subscription</h3>
              <Badge variant={subscription.level === 'free' ? "outline" : "default"}>
                {subscription.level.charAt(0).toUpperCase() + subscription.level.slice(1)}
              </Badge>
            </div>
            <p className="text-sm mb-2">Available voice services:</p>
            <div className="flex flex-wrap gap-2">
              {availableServices.map(service => {
                const serviceName = VOICE_SERVICES.find(s => s.value === service)?.label || service;
                return (
                  <Badge key={service} variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {serviceName}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Main settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-ai"
                checked={enableAI}
                onCheckedChange={setEnableAI}
              />
              <Label htmlFor="enable-ai">Enable AI Assistant</Label>
            </div>
            
            {/* Assistant Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model-select" className="text-base font-medium">
                AI Model
              </Label>
              <Select 
                value={selectedModel} 
                onValueChange={setSelectedModel}
                disabled={!subscription.models.includes(selectedModel)}
              >
                <SelectTrigger id="model-select" className="w-full">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem 
                      key={model.value} 
                      value={model.value}
                      disabled={!subscription.models.includes(model.value)}
                    >
                      {model.label}
                      {!subscription.models.includes(model.value) && " (Upgrade required)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose which AI model to use for your assistant
              </p>
            </div>
            
            {/* Assistant Name */}
            <div className="space-y-2">
              <Label htmlFor="assistant-name" className="text-base font-medium">
                Assistant Name
              </Label>
              <input
                id="assistant-name"
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter a name for your assistant"
              />
              <p className="text-sm text-muted-foreground">
                Personalize your assistant by giving it a name
              </p>
            </div>
            
            {/* Personality Selection */}
            <div className="space-y-2">
              <Label htmlFor="personality-select" className="text-base font-medium">
                Personality Type
              </Label>
              <Select value={personalityType} onValueChange={setPersonalityType}>
                <SelectTrigger id="personality-select" className="w-full">
                  <SelectValue placeholder="Select personality type" />
                </SelectTrigger>
                <SelectContent>
                  {PERSONALITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose how your assistant should interact with you
              </p>
            </div>
              
            {/* Voice Settings */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-medium mb-4">Voice Settings</h3>
              
              {/* Voice Service Selection */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="voice-service-select" className="text-base font-medium">
                  Voice Service
                </Label>
                <Select 
                  value={voiceService} 
                  onValueChange={setVoiceService}
                  disabled={!availableServices.includes(voiceService)}
                >
                  <SelectTrigger id="voice-service-select" className="w-full">
                    <SelectValue placeholder="Select voice service" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_SERVICES.map((service) => (
                      <SelectItem 
                        key={service.value} 
                        value={service.value}
                        disabled={!availableServices.includes(service.value)}
                      >
                        {service.label}
                        {!availableServices.includes(service.value) && " (Upgrade required)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose which service to use for text-to-speech
                </p>
              </div>
              
              {/* Render voice service specific options */}
              {renderVoiceServiceOptions()}
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
  );
};

export default AISettings; 
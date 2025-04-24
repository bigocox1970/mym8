import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bot } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

// Define personality types from our prompts configuration
const PERSONALITY_TYPES = Object.keys(PERSONALITY_PROMPTS).map(key => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
}));

interface LLMConfig {
  id: string;
  llm_provider?: string;
  function_name: string;
  created_at?: string;
  pre_prompt?: string;
  enable_ai?: boolean;
  assistant_name?: string;
  personality_type?: string;
  voice_gender?: string;
  voice_service?: string;
  elevenlabs_voice?: string;
  elevenlabs_api_key?: string;
  google_voice?: string;
  google_api_key?: string;
  azure_voice?: string;
  azure_api_key?: string;
  amazon_voice?: string;
  amazon_api_key?: string;
  openai_voice?: string;
  openai_api_key?: string;
}

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
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>("");
  const [googleVoice, setGoogleVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.googleVoice);
  const [googleApiKey, setGoogleApiKey] = useState<string>("");
  const [azureVoice, setAzureVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.azureVoice);
  const [azureApiKey, setAzureApiKey] = useState<string>("");
  const [amazonVoice, setAmazonVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.amazonVoice);
  const [amazonApiKey, setAmazonApiKey] = useState<string>("");
  const [openaiVoice, setOpenaiVoice] = useState<string>(DEFAULT_VOICE_SETTINGS.openaiVoice);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");
  const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  // Fetch existing configuration
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;

      try {
        // Use the get_user_llm_config function instead of direct table access
        const { data, error } = await supabase.rpc('get_user_llm_config');

        if (error) {
          console.log("Error fetching AI config:", error);
          return;
        }

        // Parse the JSON data
        const config = data as unknown as LLMConfig;
        if (config) {
          if (config.llm_provider) {
            setSelectedModel(config.llm_provider);
          }
          
          // If there's an enable_ai field, use it, otherwise default to true
          setEnableAI(config.enable_ai === undefined ? true : config.enable_ai);
          
          // Set assistant name if available
          if (config.assistant_name) {
            setAssistantName(config.assistant_name);
          }
          
          // Set personality type if available
          if (config.personality_type) {
            setPersonalityType(config.personality_type);
          }

          // Set voice type if available
          if (config.voice_gender) {
            setVoiceType(config.voice_gender);
          }
          
          // Set voice service if available
          if (config.voice_service) {
            setVoiceService(config.voice_service);
          }
          
          // Set ElevenLabs voice if available
          if (config.elevenlabs_voice) {
            setElevenlabsVoice(config.elevenlabs_voice);
          }
          
          // Set ElevenLabs API key if available
          if (config.elevenlabs_api_key) {
            setElevenlabsApiKey(config.elevenlabs_api_key);
          }

          // Set Google voice if available
          if (config.google_voice) {
            setGoogleVoice(config.google_voice);
          }
          
          // Set Google API key if available
          if (config.google_api_key) {
            setGoogleApiKey(config.google_api_key);
          }

          // Set Azure voice if available
          if (config.azure_voice) {
            setAzureVoice(config.azure_voice);
          }
          
          // Set Azure API key if available
          if (config.azure_api_key) {
            setAzureApiKey(config.azure_api_key);
          }

          // Set Amazon voice if available
          if (config.amazon_voice) {
            setAmazonVoice(config.amazon_voice);
          }
          
          // Set Amazon API key if available
          if (config.amazon_api_key) {
            setAmazonApiKey(config.amazon_api_key);
          }

          // Set OpenAI voice if available
          if (config.openai_voice) {
            setOpenaiVoice(config.openai_voice);
          }
          
          // Set OpenAI API key if available
          if (config.openai_api_key) {
            setOpenaiApiKey(config.openai_api_key);
          }
        }
      } catch (error) {
        console.error("Error fetching OpenRouter configuration:", error);
      }
    };

    fetchConfig();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to save settings");
      return;
    }

    if (!openRouterApiKey && enableAI) {
      toast.error("OpenRouter API key is missing from environment variables");
      return;
    }

    setIsSaving(true);

    // Use the helper function from prompts.ts to generate the full prompt
    const fullPrompt = generateFullPrompt(assistantName, personalityType);

    try {
      // Use the manage_user_llm_config function instead of direct table access
      const { data, error } = await supabase.rpc('manage_user_llm_config', {
        p_function_name: 'openrouter',
        p_assistant_name: assistantName,
        p_personality_type: personalityType,
        p_pre_prompt: fullPrompt,
        p_voice_gender: voiceType,
        p_llm_provider: selectedModel,
        p_voice_service: voiceService,
        p_elevenlabs_voice: elevenlabsVoice,
        p_elevenlabs_api_key: elevenlabsApiKey,
        p_google_voice: googleVoice,
        p_google_api_key: googleApiKey,
        p_azure_voice: azureVoice,
        p_azure_api_key: azureApiKey,
        p_amazon_voice: amazonVoice,
        p_amazon_api_key: amazonApiKey,
        p_openai_voice: openaiVoice,
        p_openai_api_key: openaiApiKey,
        p_api_key: 'dummy-api-key'  // Use a placeholder value since we don't need this
      });

      if (error) {
        throw error;
      }

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
          <>
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
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="elevenlabs-api-key" className="text-base font-medium">
                ElevenLabs API Key
              </Label>
              <Input
                id="elevenlabs-api-key"
                type="password"
                value={elevenlabsApiKey}
                onChange={(e) => setElevenlabsApiKey(e.target.value)}
                placeholder="Enter your ElevenLabs API key"
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from <a href="https://elevenlabs.io/app/api-key" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ElevenLabs</a>
              </p>
            </div>
          </>
        );

      case "google":
        return (
          <>
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
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="google-api-key" className="text-base font-medium">
                Google Cloud API Key
              </Label>
              <Input
                id="google-api-key"
                type="password"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="Enter your Google Cloud API key"
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a>
              </p>
            </div>
          </>
        );

      case "azure":
        return (
          <>
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
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="azure-api-key" className="text-base font-medium">
                Azure Speech Key
              </Label>
              <Input
                id="azure-api-key"
                type="password"
                value={azureApiKey}
                onChange={(e) => setAzureApiKey(e.target.value)}
                placeholder="Enter your Azure Speech key"
              />
              <p className="text-sm text-muted-foreground">
                Get your Speech key from the <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Azure Portal</a>
              </p>
            </div>
          </>
        );

      case "amazon":
        return (
          <>
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
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="amazon-api-key" className="text-base font-medium">
                AWS Access Key
              </Label>
              <Input
                id="amazon-api-key"
                type="password"
                value={amazonApiKey}
                onChange={(e) => setAmazonApiKey(e.target.value)}
                placeholder="Enter your AWS access key"
              />
              <p className="text-sm text-muted-foreground">
                Get your access key from the <a href="https://aws.amazon.com/console/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">AWS Management Console</a>
              </p>
            </div>
          </>
        );

      case "openai":
        return (
          <>
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
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="openai-api-key" className="text-base font-medium">
                OpenAI API Key
              </Label>
              <Input
                id="openai-api-key"
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI dashboard</a>
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI Assistant Settings
        </CardTitle>
        <CardDescription>
          Configure your AI assistant powered by OpenRouter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!openRouterApiKey && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">OpenRouter API Key Missing</p>
              <p className="text-sm mt-1">
                The OpenRouter API key is not set in your environment variables. Please add it to your .env file to use the AI assistant.
              </p>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-ai" className="text-base font-medium">
                Enable AI Assistant
              </Label>
              <Switch 
                id="enable-ai" 
                checked={enableAI} 
                onCheckedChange={setEnableAI} 
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {enableAI 
                ? "Your AI assistant is active and will be available in the app" 
                : "AI assistant features are currently disabled"}
            </p>
          </div>
          
          {enableAI && (
            <>
              {/* Personalization section */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-4">Personalize Your Assistant</h3>
                
                {/* Assistant Name */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="assistant-name" className="text-base font-medium">
                    What do you want to call your MyM8?
                  </Label>
                  <Input
                    id="assistant-name"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="Name your assistant (e.g., M8, Buddy, Coach)"
                    maxLength={20}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is how your assistant will refer to itself when chatting with you
                  </p>
                </div>
                
                {/* Personality Selection */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="personality-select" className="text-base font-medium">
                    What personality do you want your MyM8 to have?
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
                    Choose how your assistant will communicate with you
                  </p>
                </div>
              </div>
              
              {/* Voice Settings Section */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-4">Voice Settings</h3>
                
                {/* Voice Service Selection */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="voice-service-select" className="text-base font-medium">
                    Voice Service
                  </Label>
                  <Select value={voiceService} onValueChange={setVoiceService}>
                    <SelectTrigger id="voice-service-select" className="w-full">
                      <SelectValue placeholder="Select voice service" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_SERVICES.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
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
              
              {/* AI Model section */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-4">AI Model Settings</h3>
                
                <div className="space-y-2 mb-4">
                  <Label htmlFor="model-select" className="text-base font-medium">
                    Select AI Model
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model-select" className="w-full">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {AI_MODELS.find(m => m.value === selectedModel)?.description || "Select an AI model to use"}
                  </p>
                </div>
              </div>
            </>
          )}
          
          <div className="pt-4 flex justify-end">
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISettings; 
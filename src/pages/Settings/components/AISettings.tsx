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

interface LLMConfig {
  id: string;
  llm_provider?: string;
  function_name: string;
  created_at?: string;
  pre_prompt?: string;
  enable_ai?: boolean;
  assistant_name?: string;
  personality_type?: string;
  voice_type?: string;
}

const AI_MODELS = [
  { value: "anthropic/claude-3-opus:beta", label: "Claude 3 Opus (Most capable)" },
  { value: "anthropic/claude-3-sonnet:beta", label: "Claude 3 Sonnet (Fast & balanced)" },
  { value: "anthropic/claude-3-haiku:beta", label: "Claude 3 Haiku (Fastest response)" },
  { value: "google/gemini-pro", label: "Google Gemini Pro" },
  { value: "gpt-4o", label: "GPT-4o" },
];

const PERSONALITY_TYPES = [
  { value: "direct", label: "Direct and forthright" },
  { value: "gentle", label: "Gentle and understanding" },
  { value: "sarcastic", label: "Slightly sarcastic but to the point" },
  { value: "no_prisoners", label: "Take no prisoners" },
];

const VOICE_TYPES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "neutral", label: "Neutral" },
];

const VOICE_SERVICES = [
  { value: "browser", label: "Browser Default (Free)" },
  { value: "elevenlabs", label: "ElevenLabs (Premium)" },
];

const ELEVENLABS_VOICES = [
  { value: "rachel", label: "Rachel (Female)" },
  { value: "domi", label: "Domi (Female)" },
  { value: "bella", label: "Bella (Female)" },
  { value: "antoni", label: "Antoni (Male)" },
  { value: "josh", label: "Josh (Male)" },
  { value: "elli", label: "Elli (Child)" },
];

const getPersonalityPrompt = (personalityType: string): string => {
  switch (personalityType) {
    case "direct":
      return "Be direct, clear, and straightforward in your responses. Focus on facts and actionable advice without unnecessary elaboration.";
    case "gentle":
      return "Be gentle, supportive, and understanding. Use encouraging language and show empathy when the user faces challenges.";
    case "sarcastic":
      return "Be slightly sarcastic but helpful. Add a touch of wit and humor to your responses while still providing valuable information.";
    case "no_prisoners":
      return "Be incredibly direct, no-nonsense, and brutally honest. Cut through excuses and push the user to achieve their goals.";
    default:
      return "Be helpful and supportive.";
  }
};

const AISettings = () => {
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].value);
  const [isSaving, setIsSaving] = useState(false);
  const [enableAI, setEnableAI] = useState(true);
  const [assistantName, setAssistantName] = useState("M8");
  const [personalityType, setPersonalityType] = useState<string>("gentle");
  const [voiceType, setVoiceType] = useState<string>("female");
  const [voiceService, setVoiceService] = useState<string>("browser");
  const [elevenlabsVoice, setElevenlabsVoice] = useState<string>("rachel");
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>("");
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
        const config = data as Record<string, any>;
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
          if (config.voice_type) {
            setVoiceType(config.voice_type);
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

    // Create pre-prompt based on personality type and assistant name
    const basePrompt = `You are a helpful AI assistant for a goal-tracking application. Your name is ${assistantName || "M8"}. Your job is to help users manage their goals and actions, provide encouragement, and answer questions.`;
    const personalityPrompt = getPersonalityPrompt(personalityType);
    const fullPrompt = `${basePrompt} ${personalityPrompt}`;

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
        p_elevenlabs_api_key: elevenlabsApiKey
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
                
                {voiceService === "browser" ? (
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
                ) : (
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
                        Your ElevenLabs API key is stored securely
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-4">AI Model Selection</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="model-select" className="text-base font-medium">
                    AI Model
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
                    Choose which AI model to use for your assistant. More capable models may cost more credits.
                  </p>
                </div>
              </div>
            </>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto"
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
      </CardContent>
    </Card>
  );
};

export default AISettings; 
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
  const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  // Fetch existing configuration
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("llm_configs")
          .select("*")
          .eq("function_name", "openrouter")
          .single();

        if (error) {
          console.log("No existing OpenRouter configuration found");
          return;
        }

        if (data) {
          if (data.llm_provider) {
            setSelectedModel(data.llm_provider);
          }
          
          // If there's an enable_ai field, use it, otherwise default to true
          setEnableAI(data.enable_ai === undefined ? true : data.enable_ai);
          
          // Set assistant name if available
          if (data.assistant_name) {
            setAssistantName(data.assistant_name);
          }
          
          // Set personality type if available
          if (data.personality_type) {
            setPersonalityType(data.personality_type);
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
        p_voice_gender: 'neutral' // Default value since we don't have this field in the UI
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
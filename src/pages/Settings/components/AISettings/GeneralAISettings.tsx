import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AI_MODELS } from "@/config/ai";
import { PERSONALITY_PROMPTS } from "@/config/prompts";

// Define personality types from our prompts configuration
const PERSONALITY_TYPES = Object.keys(PERSONALITY_PROMPTS).map(key => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
}));

interface GeneralAISettingsProps {
  enableAI: boolean;
  setEnableAI: (value: boolean) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  subscription: {
    level: string;
    services: string[];
    maxTokens: number;
    models: string[];
  };
  assistantName: string;
  setAssistantName: (value: string) => void;
  personalityType: string;
  setPersonalityType: (value: string) => void;
}

export const GeneralAISettings: React.FC<GeneralAISettingsProps> = ({
  enableAI,
  setEnableAI,
  selectedModel,
  setSelectedModel,
  subscription,
  assistantName,
  setAssistantName,
  personalityType,
  setPersonalityType
}) => {
  return (
    <>
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
          className="w-full p-2 border rounded-md bg-background text-foreground"
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
    </>
  );
}; 
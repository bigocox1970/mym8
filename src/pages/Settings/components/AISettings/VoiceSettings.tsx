import React from "react";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  VOICE_SERVICES, 
  VOICE_TYPES, 
  ELEVENLABS_VOICES, 
  GOOGLE_VOICES,
  AZURE_VOICES,
  AMAZON_VOICES,
  OPENAI_VOICES 
} from "@/config/voice";

interface VoiceSettingsProps {
  voiceService: string;
  setVoiceService: (value: string) => void;
  voiceType: string;
  setVoiceType: (value: string) => void;
  elevenlabsVoice: string;
  setElevenlabsVoice: (value: string) => void;
  googleVoice: string;
  setGoogleVoice: (value: string) => void;
  azureVoice: string;
  setAzureVoice: (value: string) => void;
  amazonVoice: string;
  setAmazonVoice: (value: string) => void;
  openaiVoice: string;
  setOpenaiVoice: (value: string) => void;
  availableServices: string[];
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  voiceService,
  setVoiceService,
  voiceType,
  setVoiceType,
  elevenlabsVoice,
  setElevenlabsVoice,
  googleVoice,
  setGoogleVoice,
  azureVoice,
  setAzureVoice,
  amazonVoice,
  setAmazonVoice,
  openaiVoice,
  setOpenaiVoice,
  availableServices
}) => {
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

  return (
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
  );
}; 
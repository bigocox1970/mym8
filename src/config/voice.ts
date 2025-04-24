/**
 * Voice Configuration
 * This file contains all voice-related configurations for the application.
 * Edit this file to modify voice options, add new voices, or change default settings.
 */

// Voice service options
export const VOICE_SERVICES = [
  { value: "browser", label: "Browser (Free)" },
  { value: "elevenlabs", label: "ElevenLabs (Premium)" },
];

// Browser voice gender options
export const VOICE_TYPES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

// ElevenLabs voice options
export const ELEVENLABS_VOICES = [
  { value: "rachel", label: "Rachel (Female)" },
  { value: "domi", label: "Domi (Female)" },
  { value: "bella", label: "Bella (Female)" },
  { value: "antoni", label: "Antoni (Male)" },
  { value: "josh", label: "Josh (Male)" },
  { value: "elli", label: "Elli (Child)" },
];

// Default voice settings
export const DEFAULT_VOICE_SETTINGS = {
  voiceService: "browser",
  voiceType: "female",
  elevenlabsVoice: "rachel",
};

// ElevenLabs voice ID mapping (for API calls)
export const ELEVENLABS_VOICE_IDS = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  domi: "AZnzlk1XvdvUeBnXmlld",
  bella: "EXAVITQu4vr4xnSDxMaL",
  antoni: "ErXwobaYiN019PkySvjV",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  elli: "MF3mGyEYCl7XYWbV9V6O",
};

/**
 * Get the ElevenLabs voice ID for a given voice name
 * @param voiceName The name of the voice
 * @returns The ElevenLabs voice ID
 */
export function getElevenLabsVoiceId(voiceName: string): string {
  return ELEVENLABS_VOICE_IDS[voiceName as keyof typeof ELEVENLABS_VOICE_IDS] || 
         ELEVENLABS_VOICE_IDS.rachel;
} 
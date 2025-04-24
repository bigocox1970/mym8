/**
 * Voice Configuration
 * This file contains all voice-related configurations for the application.
 * Edit this file to modify voice options, add new voices, or change default settings.
 */

// Voice service options
export const VOICE_SERVICES = [
  { value: "browser", label: "Browser (Free)" },
  { value: "elevenlabs", label: "ElevenLabs (Premium)" },
  { value: "google", label: "Google Cloud TTS" },
  { value: "azure", label: "Microsoft Azure TTS" },
  { value: "amazon", label: "Amazon Polly" },
  { value: "openai", label: "OpenAI TTS" },
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

// Google Cloud TTS voice options
export const GOOGLE_VOICES = [
  { value: "en-US-Neural2-F", label: "Neural2 (Female)" },
  { value: "en-US-Neural2-M", label: "Neural2 (Male)" },
  { value: "en-US-Wavenet-F", label: "Wavenet (Female)" },
  { value: "en-US-Wavenet-M", label: "Wavenet (Male)" },
  { value: "en-GB-Neural2-F", label: "British (Female)" },
  { value: "en-GB-Neural2-M", label: "British (Male)" },
];

// Azure voice options
export const AZURE_VOICES = [
  { value: "en-US-JennyNeural", label: "Jenny (Female)" },
  { value: "en-US-GuyNeural", label: "Guy (Male)" },
  { value: "en-US-AriaNeural", label: "Aria (Female)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (British Female)" },
  { value: "en-GB-RyanNeural", label: "Ryan (British Male)" },
];

// Amazon Polly voice options
export const AMAZON_VOICES = [
  { value: "Joanna", label: "Joanna (Female)" },
  { value: "Matthew", label: "Matthew (Male)" },
  { value: "Amy", label: "Amy (British Female)" },
  { value: "Brian", label: "Brian (British Male)" },
  { value: "Ivy", label: "Ivy (Child)" },
  { value: "Kendra", label: "Kendra (Female)" },
];

// OpenAI voice options
export const OPENAI_VOICES = [
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "fable", label: "Fable (Male)" },
  { value: "onyx", label: "Onyx (Male)" },
  { value: "nova", label: "Nova (Female)" },
  { value: "shimmer", label: "Shimmer (Female)" },
];

// Default voice settings
export const DEFAULT_VOICE_SETTINGS = {
  voiceService: "browser",
  voiceType: "female",
  elevenlabsVoice: "rachel",
  googleVoice: "en-US-Neural2-F",
  azureVoice: "en-US-JennyNeural",
  amazonVoice: "Joanna",
  openaiVoice: "nova",
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
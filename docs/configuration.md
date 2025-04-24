# MyM8 Configuration Guide

This document explains how to easily configure and customize different aspects of the MyM8 application.

## Overview

The application has been restructured to separate configuration from logic, making it easy to customize different aspects of the application without needing to modify core code. Configuration files are located in the `src/config` directory.

## Available Configuration Files

### AI Prompts (`src/config/prompts.ts`)

This file contains all prompts and text used by the AI assistant. Modifying this file will change how the AI assistant behaves and communicates.

Key elements you can customize:
- `BASE_PROMPT`: The fundamental prompt that establishes what the AI assistant is and does
- `PERSONALITY_PROMPTS`: Different personality styles the AI can use (gentle, direct, sarcastic, etc.)
- `DEFAULT_ASSISTANT_CONFIG`: Default settings if nothing is found in the database
- `FORMATTING_INSTRUCTIONS`: How the AI should format its responses

Example of modifying the base prompt:
```typescript
// Change the BASE_PROMPT to customize the AI's fundamental role
export const BASE_PROMPT = `You are a motivational AI coach for a goal-tracking application. Your name is {assistant_name}. Your mission is to push users to achieve their goals, celebrate wins, and help them overcome obstacles.`;
```

### Voice Settings (`src/config/voice.ts`)

This file contains settings related to text-to-speech functionality.

Key elements you can customize:
- `VOICE_SERVICES`: Available voice services (browser, ElevenLabs)
- `VOICE_TYPES`: Voice gender options for browser TTS
- `ELEVENLABS_VOICES`: Available ElevenLabs voice options
- `ELEVENLABS_VOICE_IDS`: ElevenLabs API voice IDs

Example of adding a new ElevenLabs voice:
```typescript
// Add a new voice to the ELEVENLABS_VOICES array
export const ELEVENLABS_VOICES = [
  // ... existing voices ...
  { value: "adam", label: "Adam (Male)" },
];

// Add the corresponding voice ID
export const ELEVENLABS_VOICE_IDS = {
  // ... existing voice IDs ...
  adam: "pNInz6obpgDQGcFmaJgB",
};
```

### AI Models (`src/config/ai.ts`)

This file contains settings related to AI models, tools, and API configurations.

Key elements you can customize:
- `AI_MODELS`: Available AI models from OpenRouter
- `DEFAULT_AI_MODEL`: The default model to use
- `AI_TOOLS`: Function definitions for actions the AI can perform
- `AI_REQUEST_DEFAULTS`: Default API request parameters

Example of adding a new AI model:
```typescript
export const AI_MODELS = [
  // ... existing models ...
  {
    value: "mistral/mistral-large",
    label: "Mistral Large",
    description: "Mistral's powerful open-source model",
  },
];
```

### Task Frequencies (`src/config/frequency.ts`)

This file contains configurations for task frequencies in the application.

Key elements you can customize:
- `FrequencyType`: Type definition for allowed frequencies
- `FREQUENCY_INFO`: Display information for each frequency
- `FREQUENCY_GROUPS`: Grouping of frequencies (daily vs recurring)

Example of modifying frequency display:
```typescript
// Update the color of the weekly frequency
export const FREQUENCY_INFO = {
  // ... other frequencies ...
  weekly: {
    label: "Weekly",
    icon: "CalendarDays",
    description: "Tasks to be completed once per week",
    color: "text-cyan-600", // Changed from blue-500 to cyan-600
    order: 5
  },
};
```

## How to Use These Configurations

After editing these files, the changes will be applied throughout the application. Here's how different parts of the app use these configurations:

1. **AI Assistant**: Uses prompts.ts to craft prompts and ai.ts for model settings and tools
2. **AI Settings Page**: Uses voice.ts for voice options and ai.ts for model options
3. **Goal Detail Page**: Uses frequency.ts to display and categorize tasks

## Database Considerations

While these files define the default configurations, user-specific settings (like selected personality or voice preference) are still stored in the Supabase database in the `llm_configs` table.

When a change is made in the UI, it:
1. Reads from these configuration files to get the options
2. Uses the `manage_user_llm_config` function to save the user's choice
3. Retrieves the saved settings with `get_user_llm_config`

## Adding New Configuration Files

When adding a new configuration aspect:

1. Create a new file in the `src/config` directory
2. Export constants and helper functions
3. Import and use them in your components
4. Document the new configuration options in this file

This approach makes the application more maintainable and easier to customize. 
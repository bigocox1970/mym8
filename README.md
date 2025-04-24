# MyM8 - Personal Goal Tracking and AI Assistant

A modern goal tracking application with AI assistant capabilities, designed to help you achieve your goals.

## Features

- **Goal Management:** Create and track your personal goals
- **Task Management:** Add actions to your goals with frequency settings (daily, weekly, monthly)
- **AI Assistant:** Chat with an AI assistant that can help manage your goals and tasks
- **Voice Integration:** Text-to-speech with browser voices or premium ElevenLabs voices
- **Activity Logs:** Track your completed actions and see your progress
- **Customizable:** Configure the AI assistant's personality, voice, and more

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up your environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   ```
4. Run the development server with `npm run dev`

## Configuration System

MyM8 includes a centralized configuration system that makes it easy to customize various aspects of the application.

### Configuration Files

All configuration files are located in the `src/config` directory:

- **`prompts.ts`**: AI assistant prompts and personalities
- **`voice.ts`**: Voice service settings and options
- **`ai.ts`**: AI model configurations and tools
- **`frequency.ts`**: Task frequency types and display settings

### How to Edit Configurations

For more detailed information about the configuration system, see [Configuration Guide](docs/configuration.md).

### Examples

To modify the assistant's base prompt:
```typescript
// Edit src/config/prompts.ts
export const BASE_PROMPT = `You are a motivational coach for a goal-tracking application...`;
```

To add a new voice:
```typescript
// Edit src/config/voice.ts
export const ELEVENLABS_VOICES = [
  // existing voices...
  { value: "adam", label: "Adam (Male)" },
];
```

## Database Tables

### Users and Profiles

- **auth.users**: Supabase authentication users
- **profiles**: User profile information and preferences

### Core Application Tables

- **goals**: User's goals
- **tasks**: Actions associated with goals
- **activity_logs**: Tracking completed actions
- **llm_configs**: AI assistant configurations

### AI Assistant Tables

- **conversations**: Chat conversations with the AI
- **chat_messages**: Individual messages in conversations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

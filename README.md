# MyM8 - Goal Tracking App

A modern goal tracking application with AI assistant capabilities that helps you manage goals, actions, and track your progress.

## Features

- **Goal Tracking and Management**: Create, update, and manage your personal and professional goals
- **AI-powered Assistant**: Intelligent assistant that can create goals, add actions, and mark tasks as complete
- **Voice Interaction**: Speak to your AI assistant with speech recognition
- **Action Planning**: Break down goals into manageable actions with different frequencies
- **Journal Entries**: Track your thoughts and reflections
- **Activity Logging**: Monitor your progress over time

## Deployment with Netlify

This app is designed for seamless deployment with Netlify, including serverless functions for the backend API that handle AI integration and database operations.

### Deployment Instructions

1. **Clone or Push to Your Repository**
   ```
   git push https://github.com/bigocox1970/mym8-app.git main
   ```

2. **Connect to Netlify**
   - Sign in to [Netlify](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository
   - Use these build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

3. **Set up Environment Variables**
   - After initial setup, go to Site settings > Build & deploy > Environment
   - Copy ALL variables from the `netlify-env-vars.txt` file in this repository
   - These variables are crucial for the app to function properly, especially:
     - Supabase connection details
     - Supabase service role key (required for AI assistant functionality)
     - OpenAI API key
     - OpenRouter API key
   
4. **Deploy**
   - Netlify will automatically build and deploy your site
   - Any future pushes to your main branch will trigger automatic deployments

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with:
   ```
   VITE_API_BASE_URL=/.netlify/functions/api
   ```

3. Install Netlify CLI:
   ```
   npm install -g netlify-cli
   ```

4. Run the local development server:
   ```
   netlify dev
   ```

This will run both your frontend and serverless functions locally for testing.

## Technologies Used

- React with TypeScript
- Vite
- Supabase for authentication and database
- Shadcn UI components
- OpenRouter for AI capabilities
- Various text-to-speech services (ElevenLabs, OpenAI, Google, Azure)
- Netlify for hosting and serverless functions

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

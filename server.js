/**
 * MyM8 API Server
 * 
 * This server provides secure API endpoints for:
 * - Text-to-speech services
 * - AI language models
 * - Subscription information
 * 
 * API keys are stored securely on the server, not in the client.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API keys for various services - stored securely on the server
const API_KEYS = {
  elevenlabs: process.env.ELEVENLABS_API_KEY,
  google: process.env.GOOGLE_CLOUD_API_KEY,
  azure: process.env.AZURE_SPEECH_API_KEY,
  amazon: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  openai: process.env.OPENAI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

// Voice service endpoints mapping
const TTS_ENDPOINTS = {
  elevenlabs: 'https://api.elevenlabs.io/v1/text-to-speech',
  google: 'https://texttospeech.googleapis.com/v1/text:synthesize',
  azure: 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
  openai: 'https://api.openai.com/v1/audio/speech',
};

// ElevenLabs voice ID mapping (for API calls)
const ELEVENLABS_VOICE_IDS = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
};

// Authentication middleware that verifies Supabase JWT tokens
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Verify Supabase JWT token
    // Note: In a production environment, you would need to 
    // validate this using Supabase's JWT secret and configuration
    
    // Simple JWT verification (for demo purposes)
    // In production, use a proper JWT library that can validate Supabase tokens
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sub) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Add user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email || '',
      // In production, you might fetch additional user info from your database
    };
    
    // Continue to the next middleware
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

// Get subscription details
app.get('/api/subscription', authenticateToken, (req, res) => {
  // In a production app, you would fetch this from a database based on the user's subscription
  const userId = req.user.id;
  
  // Mock subscription details based on user ID
  // In production, retrieve this from your database
  const subscription = {
    level: 'premium', // or 'free', 'basic', etc.
    services: ['browser', 'elevenlabs', 'google', 'azure', 'amazon', 'openai'],
    maxTokens: 4000,
    models: ['gpt-3.5-turbo', 'gpt-4o', 'anthropic/claude-3-opus:beta', 'anthropic/claude-3-sonnet', 'google/gemini-pro'],
  };
  
  return res.json(subscription);
});

// Text-to-speech endpoint
app.post('/api/tts', authenticateToken, async (req, res) => {
  try {
    const { text, service, options } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Check subscription allows the requested service
    // In production, validate against user's subscription
    
    switch (service) {
      case 'elevenlabs':
        if (!API_KEYS.elevenlabs) {
          return res.status(500).json({ error: 'ElevenLabs service not configured' });
        }
        
        const voiceId = ELEVENLABS_VOICE_IDS[options.voice] || ELEVENLABS_VOICE_IDS.rachel;
        
        const response = await fetch(
          `${TTS_ENDPOINTS.elevenlabs}/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': API_KEYS.elevenlabs,
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(`ElevenLabs API error: ${error.message || response.statusText}`);
        }
        
        const audioBuffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(audioBuffer));
        
      case 'google':
        if (!API_KEYS.google) {
          return res.status(500).json({ error: 'Google TTS service not configured' });
        }
        
        const googleResponse = await fetch(
          `${TTS_ENDPOINTS.google}?key=${API_KEYS.google}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: { text },
              voice: { 
                languageCode: options.voice.substring(0, 5),  
                name: options.voice 
              },
              audioConfig: { audioEncoding: 'MP3' },
            }),
          }
        );
        
        if (!googleResponse.ok) {
          const error = await googleResponse.json();
          throw new Error(`Google TTS API error: ${error.message || googleResponse.statusText}`);
        }
        
        const googleData = await googleResponse.json();
        const audioContent = googleData.audioContent; // Base64 encoded
        
        res.set('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(audioContent, 'base64'));
        
      case 'azure':
        if (!API_KEYS.azure) {
          return res.status(500).json({ error: 'Azure service not configured' });
        }
        
        const azureResponse = await fetch(
          TTS_ENDPOINTS.azure,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': API_KEYS.azure,
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            },
            body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' name='${options.voice}'>${text}</voice></speak>`,
          }
        );
        
        if (!azureResponse.ok) {
          throw new Error(`Azure API error: ${azureResponse.statusText}`);
        }
        
        const azureBuffer = await azureResponse.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(azureBuffer));
        
      case 'openai':
        if (!API_KEYS.openai) {
          return res.status(500).json({ error: 'OpenAI service not configured' });
        }
        
        const openaiResponse = await fetch(
          TTS_ENDPOINTS.openai,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEYS.openai}`,
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: text,
              voice: options.voice || 'nova',
            }),
          }
        );
        
        if (!openaiResponse.ok) {
          const error = await openaiResponse.json();
          throw new Error(`OpenAI API error: ${error.message || openaiResponse.statusText}`);
        }
        
        const openaiBuffer = await openaiResponse.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        return res.send(Buffer.from(openaiBuffer));
        
      case 'amazon':
        // For Amazon Polly, you would use the AWS SDK
        // This requires more complex implementation that's omitted here
        return res.status(501).json({ error: 'Amazon Polly support coming soon' });
        
      default:
        return res.status(400).json({ error: 'Unsupported service' });
    }
  } catch (error) {
    console.error('TTS API error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
});

// Chat completion endpoint
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!API_KEYS.openrouter) {
      return res.status(500).json({ error: 'LLM service not configured' });
    }
    
    // Get user's preferred model from config in database
    // For now, default to gpt-4o
    const model = "gpt-4o";
    
    // Build the system message with context
    let systemMessage = "You are a helpful AI assistant for a goal-tracking application called MyM8.";
    
    if (context.goals && context.goals.length > 0) {
      systemMessage += "\n\nUser's goals:\n" + 
        context.goals.map((goal, i) => `${i+1}. ${goal.text}`).join('\n');
    }
    
    if (context.actions && context.actions.length > 0) {
      systemMessage += "\n\nUser's actions:\n" + 
        context.actions.map((action, i) => 
          `${i+1}. ${action.title} (${action.completed ? 'Completed' : 'Pending'})`
        ).join('\n');
    }
    
    // Build conversation history
    const history = context.conversation || [];
    
    // Call the OpenRouter API
    const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEYS.openrouter}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemMessage },
          ...history.map(msg => ({ 
            role: msg.role, 
            content: msg.content 
          })),
          { role: "user", content: message }
        ],
        temperature: 0.7,
      })
    });
    
    if (!completion.ok) {
      const error = await completion.json();
      throw new Error(`LLM API error: ${error.message || completion.statusText}`);
    }
    
    const result = await completion.json();
    const responseText = result.choices[0].message.content;
    
    // Process for any actions the AI wants to take
    let action = null;
    let navigate = null;
    let refresh = false;
    
    // Simple action detection (this would be more sophisticated in production)
    if (responseText.includes('ACTION:')) {
      action = responseText.match(/ACTION:(.*?)(?:\n|$)/)[1].trim();
    }
    
    if (responseText.includes('NAVIGATE:')) {
      navigate = responseText.match(/NAVIGATE:(.*?)(?:\n|$)/)[1].trim();
    }
    
    if (responseText.includes('REFRESH:')) {
      refresh = responseText.match(/REFRESH:(.*?)(?:\n|$)/)[1].trim() === 'true';
    }
    
    return res.json({
      message: responseText.replace(/ACTION:.*(?:\n|$)/, '')
                          .replace(/NAVIGATE:.*(?:\n|$)/, '')
                          .replace(/REFRESH:.*(?:\n|$)/, '')
                          .trim(),
      action,
      navigate,
      refresh
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process message' });
  }
});

// Serve frontend for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
}); 
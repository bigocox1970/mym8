/**
 * MyM8 API Server - Netlify Serverless Function
 * 
 * This serverless function provides secure API endpoints for:
 * - Text-to-speech services
 * - AI language models
 * - Subscription information
 * 
 * API keys are stored securely as Netlify environment variables.
 */

// Debug environment variables
console.log('==== Environment Variables Debug ====');
console.log('All Environment Variables available to function:');
for (const key in process.env) {
  if (key.includes('OPENAI') || key.includes('VITE_OPENAI') || key.includes('SUPABASE')) {
    console.log(`${key}: ${process.env[key] ? '[exists]' : '[undefined]'}`);
  }
}
console.log('=== End Environment Variables Debug ===');

// Debug environment variables
console.log('Environment variables check:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('VITE_SUPABASE_URL exists:', !!process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!process.env.VITE_SUPABASE_ANON_KEY);
console.log('Environment variables keys:', Object.keys(process.env).filter(key => !key.includes('SECRET')).join(', '));

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Import routes
const ttsRouter = require('./routes/tts');

// Helper function to dynamically import and use node-fetch
const performFetch = async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
};

// Create Express app
const app = express();

// Add middleware
app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
app.use(cors());

// Add routes
app.use('/.netlify/functions/api/tts', ttsRouter);

// Add a simple test endpoint
app.get('/.netlify/functions/api/test', (req, res) => {
  return res.json({ message: 'API is working!' });
});

// Add audio format conversion endpoint
app.post('/.netlify/functions/api/convert-audio', async (req, res) => {
  try {
    console.log('Audio conversion request received');
    
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    console.log(`Received ${req.body.length} bytes of audio data`);
    
    const audioData = req.body;
    
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', audioData.length);
    
    return res.send(audioData);
  } catch (error) {
    console.error('Error converting audio:', error);
    return res.status(500).json({ error: 'Audio conversion failed' });
  }
});

// Add a streaming chat completion endpoint for OpenAI
app.post('/.netlify/functions/api/chat', async (req, res) => {
  try {
    console.log('[STREAM-DEBUG] Incoming /chat request body:', JSON.stringify(req.body));
    const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 1000 } = req.body;
    if (!messages || !Array.isArray(messages)) {
      console.error('[STREAM-DEBUG] Invalid or missing messages array');
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('[STREAM-DEBUG] Missing OpenAI API key');
      return res.status(500).json({ error: 'Missing OpenAI API key' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const openaiRes = await performFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: true,
      }),
    });

    if (!openaiRes.body) {
      res.write(`data: {"error":"No response body from OpenAI"}\n\n`);
      return res.end();
    }

    // Stream OpenAI response to client (Node.js stream)
    for await (const chunk of openaiRes.body) {
      res.write(chunk);
      if (res.flush) res.flush();
    }

    res.end();
  } catch (err) {
    console.error('[STREAM-DEBUG] Error in /chat streaming endpoint:', err);
    res.write(`data: {"error":"${err.message || 'Unknown error'}"}\n\n`);
    res.end();
  }
});

// Export the handler
module.exports.handler = serverless(app);
/**
 * Audio Conversion Function
 * 
 * This serverless function handles audio conversion and processing,
 * specifically for OpenAI TTS responses.
 */

const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Add middleware
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Handle all routes with a single handler for simplicity
app.all('/.netlify/functions/audio-convert', async (req, res) => {
  try {
    console.log('Audio conversion request received');
    console.log(`Request method: ${req.method}`);
    console.log(`Content-Type: ${req.headers['content-type']}`);
    
    // If we don't have audio data, return an error
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    console.log(`Received ${req.body.length} bytes of audio data`);
    
    // For OpenAI audio, we're simply going to pass it through without modification
    // This preserves the original audio format
    const audioData = req.body;
    
    // Set the correct headers for browser compatibility
    // Always use audio/mpeg which has better browser compatibility
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', audioData.length);
    
    // Return the audio data
    return res.send(audioData);
  } catch (error) {
    console.error('Error processing audio:', error);
    return res.status(500).json({ error: 'Audio processing failed' });
  }
});

// Export the serverless function
exports.handler = serverless(app); 
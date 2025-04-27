const OpenAI = require('openai');
const { Readable } = require('stream');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateSpeech(text, voice = 'echo') {
  try {
    console.log('=== TTS Service Debug ===');
    console.log('Input:', { text, voice });
    
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input');
    }

    if (!voice || typeof voice !== 'string') {
      throw new Error('Invalid voice input');
    }

    // Generate speech with WAV format
    console.log('Making OpenAI API request...');
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      response_format: "wav"
    });

    // Verify response
    if (!response || !response.body) {
      throw new Error('Invalid response from OpenAI');
    }

    console.log('Received response from OpenAI');
    
    // Return the response stream directly with WAV headers
    const result = {
      body: response.body,
      headers: {
        'content-type': 'audio/wav',
        'accept-ranges': 'bytes',
        'cache-control': 'no-cache'
      }
    };
    
    console.log('Response headers:', result.headers);
    console.log('=== End TTS Service Debug ===');
    
    return result;
  } catch (error) {
    console.error('TTS Error:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

// Helper function to validate MP3 header
function isValidMP3Header(buffer) {
  // Check for MP3 sync word (0xFFE)
  const syncWord = (buffer[0] << 8) | buffer[1];
  return (syncWord & 0xFFE0) === 0xFFE0;
}

module.exports = {
  generateSpeech
}; 
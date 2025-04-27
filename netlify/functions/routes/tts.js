const express = require('express');
const router = express.Router();
const ttsService = require('../services/tts');

router.post('/', async (req, res) => {
  try {
    const { text, voice = 'echo' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await ttsService.generateSpeech(text, voice);
    
    // Set proper headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', response.headers['content-length']);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the response directly
    response.body.pipe(res);
  } catch (error) {
    console.error('TTS Route Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
});

module.exports = router; 
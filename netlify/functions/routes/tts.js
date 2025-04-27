const express = require('express');
const router = express.Router();
const ttsService = require('../services/tts');

router.post('/', async (req, res) => {
  try {
    const { text, voice = 'echo' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await ttsService.generateSpeech(text, voice);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS Route Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate speech' });
  }
});

module.exports = router; 
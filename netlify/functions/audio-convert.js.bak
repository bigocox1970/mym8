/**
 * Audio Conversion Function
 * 
 * This serverless function handles audio conversion and processing,
 * specifically for OpenAI TTS responses.
 */

const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');

// Create Express app
const app = express();

// Add middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Handle audio conversion
app.post('/.netlify/functions/audio-convert', upload.single('audio'), async (req, res) => {
  try {
    console.log('Audio conversion request received');
    console.log(`Request method: ${req.method}`);
    console.log(`Content-Type: ${req.headers['content-type']}`);
    
    // Check if we have audio data
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    console.log(`Received ${req.file.buffer.length} bytes of audio data`);
    console.log(`Original file type: ${req.file.mimetype}`);
    
    // Get the target format from the request
    const targetFormat = req.body.format || 'wav';
    console.log(`Converting to format: ${targetFormat}`);
    
    // Create a readable stream from the buffer
    const audioStream = Readable.from(req.file.buffer);
    
    // Set up the conversion command
    const command = ffmpeg(audioStream)
      .inputFormat('mp3')
      .toFormat(targetFormat)
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        res.status(500).json({ error: 'Audio conversion failed' });
      })
      .on('end', () => {
        console.log('Audio conversion completed');
      });
    
    // Pipe the converted audio to the response
    res.set('Content-Type', `audio/${targetFormat}`);
    res.set('Content-Disposition', 'inline');
    
    command.pipe(res);
  } catch (error) {
    console.error('Error processing audio:', error);
    return res.status(500).json({ error: 'Audio processing failed' });
  }
});

// Export the serverless function
exports.handler = serverless(app); 
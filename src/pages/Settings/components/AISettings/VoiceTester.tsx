import React, { useState } from 'react';
import { Button, TextField, Typography, Box, CircularProgress } from '@mui/material';
import { useSettings } from '../../../../contexts/SettingsContext';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

const VoiceTester: React.FC = () => {
  const { settings } = useSettings();
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [testText, setTestText] = useState('Hello, this is a test of the text to speech functionality.');

  const testVoiceService = async () => {
    if (!settings.openaiApiKey) {
      showSnackbar('OpenAI API key is required', 'error');
      return;
    }

    setIsLoading(true);
    console.log('Starting TTS test with voice:', settings.voice);

    try {
      // Make direct call to OpenAI API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: settings.voice,
          input: testText
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('TTS request failed:', response.status, response.statusText, errorData);
        showSnackbar(`TTS request failed: ${response.statusText}`, 'error');
        return;
      }

      console.log('TTS request completed successfully');
      
      // Get response data as blob
      const audioBlob = await response.blob();
      console.log('Received audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      // Convert blob to array buffer for more reliable handling
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('Converted to array buffer:', arrayBuffer.byteLength);

      // Try different MIME types
      const mimeTypes = [
        { type: audioBlob.type, label: 'Original Format' },
        { type: 'audio/mp3', label: 'MP3 Format' },
        { type: 'audio/mpeg', label: 'MPEG Format' },
        { type: 'audio/wav', label: 'WAV Format' }
      ];

      // Create audio elements for each format
      const audioContainer = document.createElement('div');
      audioContainer.style.display = 'none';
      document.body.appendChild(audioContainer);

      let audioPlayed = false;

      for (const format of mimeTypes) {
        const formattedBlob = new Blob([arrayBuffer], { type: format.type });
        const url = URL.createObjectURL(formattedBlob);
        
        const audio = new Audio();
        audio.preload = 'auto';
        
        // Add comprehensive event listeners
        audio.addEventListener('loadstart', () => console.log(`${format.type}: Loading started`));
        audio.addEventListener('loadedmetadata', () => console.log(`${format.type}: Metadata loaded`));
        audio.addEventListener('loadeddata', () => console.log(`${format.type}: Data loaded`));
        audio.addEventListener('canplay', () => console.log(`${format.type}: Can play`));
        audio.addEventListener('play', () => console.log(`${format.type}: Playback started`));
        audio.addEventListener('pause', () => console.log(`${format.type}: Playback paused`));
        audio.addEventListener('ended', () => console.log(`${format.type}: Playback ended`));
        
        audio.onerror = (e) => {
          console.error(`${format.type} error:`, {
            error: audio.error,
            readyState: audio.readyState,
            networkState: audio.networkState
          });
        };

        try {
          audio.src = url;
          await audio.play();
          console.log(`Successfully played audio with ${format.type}`);
          audioPlayed = true;
          break;
        } catch (error) {
          console.log(`Failed to play ${format.type}:`, error);
          URL.revokeObjectURL(url);
        }
      }

      if (!audioPlayed) {
        showSnackbar('Failed to play audio with any format', 'error');
      }

      // Clean up after 30 seconds
      setTimeout(() => {
        document.body.removeChild(audioContainer);
      }, 30000);

    } catch (error) {
      console.error('Error in TTS test:', error);
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Test Voice Service
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={3}
        value={testText}
        onChange={(e) => setTestText(e.target.value)}
        placeholder="Enter text to test voice service..."
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        onClick={testVoiceService}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
      >
        {isLoading ? 'Testing...' : 'Test Voice Service'}
      </Button>
    </Box>
  );
};

export default VoiceTester; 
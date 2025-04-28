import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { getConfig, initConfig } from '@/lib/configManager';
import { textToSpeech } from '@/lib/api';

interface UseTextToSpeechProps {
  initialEnabled?: boolean;
}

export function useTextToSpeech({ initialEnabled = false }: UseTextToSpeechProps = {}) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(initialEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenRef = useRef<string | null>(null);
  const lastSpokenContentRef = useRef<string | null>(null);

  // Initialize config and load voice settings
  useEffect(() => {
    (async () => {
      await initConfig();
      console.log("Config initialized for TTS");
      const config = getConfig();
      
      // Enable voice if the user had previously enabled it
      if (config.voice_enabled !== undefined) {
        setIsVoiceEnabled(config.voice_enabled);
      } else if (config.voice_service && config.voice_service !== 'none') {
        // Fallback to checking if a voice service is selected
        setIsVoiceEnabled(true);
      }
    })();
  }, []);

  // Initialize voices when component loads
  useEffect(() => {
    // Load voices - sometimes they're not immediately available
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Clean up
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-to-speech functionality
  const speakText = async (text: string) => {
    if (!text || !isVoiceEnabled) return;

    let config;
    try {
      config = getConfig();
      console.log("TTS config in speakText:", config);
    } catch (e) {
      toast.error("TTS config not loaded. Please refresh the page.");
      setIsSpeaking(false);
      return;
    }
    
    const voiceService = config.voice_service || 'browser';
    let voice = 'alloy';
    if (voiceService === 'openai') voice = config.openai_voice || 'alloy';
    if (voiceService === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
    if (voiceService === 'google') voice = config.google_voice || 'en-US-Neural2-F';
    if (voiceService === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
    if (voiceService === 'amazon') voice = config.amazon_voice || 'Joanna';
    console.log("voiceService:", voiceService, "voice:", voice);

    // Split text into sentences for more reliable processing
    const splitTextIntoChunks = (fullText: string): string[] => {
      // Split on sentence boundaries (periods, question marks, exclamation points followed by space or end)
      const sentenceRegex = /[.!?]+(?:\s|$)/g;
      const sentences: string[] = [];
      let lastIndex = 0;
      let match;
      
      // Find all sentence boundaries
      while ((match = sentenceRegex.exec(fullText)) !== null) {
        sentences.push(fullText.substring(lastIndex, match.index + match[0].length));
        lastIndex = match.index + match[0].length;
      }
      
      // Add any remaining text
      if (lastIndex < fullText.length) {
        sentences.push(fullText.substring(lastIndex));
      }
      
      // Group sentences into chunks of reasonable size (max ~500 chars)
      const chunks: string[] = [];
      let currentChunk = "";
      
      for (const sentence of sentences) {
        // If this single sentence is too long, split it further
        if (sentence.length > 500) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
          }
          
          // Split long sentence by commas or just by character count
          const commaSegments = sentence.split(/,\s*/);
          let segment = "";
          
          for (const commaSegment of commaSegments) {
            if (segment.length + commaSegment.length > 400) {
              chunks.push(segment);
              segment = commaSegment;
            } else {
              segment += (segment ? ", " : "") + commaSegment;
            }
          }
          
          if (segment) {
            chunks.push(segment);
          }
        } 
        // Otherwise group sentences into reasonable chunks
        else if (currentChunk.length + sentence.length > 500) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      
      // Add the last chunk if it exists
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      console.log(`Split text into ${chunks.length} chunks for TTS`);
      return chunks;
    };

    if (voiceService === 'browser') {
      console.log("Using browser TTS");
      // Browser TTS logic
      if (!window.speechSynthesis) {
        toast.error("Speech synthesis is not supported in your browser");
        setIsSpeaking(false);
        return;
      }
      // Stop any existing speech first
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setIsSpeaking(true);
      const selectedVoiceName = config.voice_gender === 'male' ? 'Alex' : 'Samantha';
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === selectedVoiceName);
      
      // Split text into chunks and queue them for speaking
      const textChunks = splitTextIntoChunks(text);
      let chunkIndex = 0;
      
      const speakNextChunk = () => {
        if (chunkIndex >= textChunks.length) {
          setIsSpeaking(false);
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(textChunks[chunkIndex]);
        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.onend = () => {
          chunkIndex++;
          speakNextChunk();
        };
        
        utterance.onerror = (error) => {
          console.error("Speech synthesis error:", error);
          if (error.error !== 'interrupted' && error.error !== 'canceled') {
            toast.error(`Speech synthesis failed for chunk ${chunkIndex + 1}`);
          }
          chunkIndex++;
          speakNextChunk();
        };
        
        window.speechSynthesis.speak(utterance);
      };
      
      speakNextChunk();
      return;
    }

    // API-based TTS
    try {
      console.log("Using API TTS");
      setIsSpeaking(true);
      
      // Split text into chunks for more reliable processing
      const textChunks = splitTextIntoChunks(text);
      let chunkIndex = 0;
      
      const playNextChunk = async () => {
        if (chunkIndex >= textChunks.length) {
          setIsSpeaking(false);
          return;
        }
        
        try {
          const chunk = textChunks[chunkIndex];
          console.log(`Playing TTS chunk ${chunkIndex + 1}/${textChunks.length} (${chunk.length} chars)`);
          
          const audioBlob = await textToSpeech(chunk, voiceService, { voice });
          const audioUrl = URL.createObjectURL(audioBlob as Blob);
          const audio = new Audio(audioUrl);
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            chunkIndex++;
            playNextChunk();
          };
          
          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            URL.revokeObjectURL(audioUrl);
            toast.error(`Failed to play audio chunk ${chunkIndex + 1}`);
            chunkIndex++;
            playNextChunk();
          };
          
          await audio.play();
        } catch (error) {
          console.error(`Error processing TTS chunk ${chunkIndex + 1}:`, error);
          toast.error(`Failed to generate speech for chunk ${chunkIndex + 1}`);
          chunkIndex++;
          playNextChunk();
        }
      };
      
      playNextChunk();
    } catch (error) {
      setIsSpeaking(false);
      toast.error("Failed to generate speech.");
      console.error(error);
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  // Toggle voice response mode
  const toggleVoiceMode = () => {
    setIsVoiceEnabled(prev => !prev);
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Check if a message should be spoken
  const shouldSpeakMessage = (messageId: string, messageContent: string) => {
    return (
      isVoiceEnabled &&
      (!lastSpokenRef.current || 
       lastSpokenRef.current !== messageId || 
       lastSpokenContentRef.current !== messageContent) &&
      !isSpeaking
    );
  };

  // Update last spoken message references
  const updateLastSpokenRefs = (messageId: string, messageContent: string) => {
    lastSpokenRef.current = messageId;
    lastSpokenContentRef.current = messageContent;
  };

  return {
    isVoiceEnabled,
    isSpeaking,
    speakText,
    stopSpeaking,
    toggleVoiceMode,
    shouldSpeakMessage,
    updateLastSpokenRefs
  };
}

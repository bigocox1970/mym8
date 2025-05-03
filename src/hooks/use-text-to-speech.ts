import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { getConfig, initConfig } from '@/lib/configManager';
import { textToSpeech } from '@/lib/api';

// Cache interface
interface AudioCacheItem {
  messageId: string;
  content: string;
  audioBlob: Blob;
  timestamp: number;
}

// Maximum number of items to keep in cache
const MAX_CACHE_SIZE = 10;

// Create a singleton audio cache that persists between hook instances
const audioCache: AudioCacheItem[] = [];

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

  // Cache management functions
  const addToCache = (messageId: string, content: string, audioBlob: Blob) => {
    // Check if we already have this item in cache
    const existingIndex = audioCache.findIndex(item => item.messageId === messageId);
    
    if (existingIndex !== -1) {
      // Update existing item and move it to the front
      const existingItem = audioCache.splice(existingIndex, 1)[0];
      existingItem.timestamp = Date.now();
      audioCache.unshift(existingItem);
      return;
    }
    
    // Add new item to the front of the cache
    audioCache.unshift({
      messageId,
      content,
      audioBlob,
      timestamp: Date.now(),
    });
    
    // If we exceed max size, remove oldest item
    if (audioCache.length > MAX_CACHE_SIZE) {
      audioCache.pop();
    }
    
    console.log(`Added audio to cache, current cache size: ${audioCache.length}`);
  };

  const getFromCache = (messageId: string, content: string): Blob | null => {
    const cacheItem = audioCache.find(item => 
      item.messageId === messageId && item.content === content
    );
    
    if (cacheItem) {
      console.log('Found audio in cache:', messageId);
      // Update timestamp to keep this item fresh
      cacheItem.timestamp = Date.now();
      return cacheItem.audioBlob;
    }
    
    console.log('Audio not in cache:', messageId);
    return null;
  };

  // Text-to-speech functionality
  const speakText = async (text: string, messageId?: string) => {
    if (!text || !isVoiceEnabled) return;
    
    const actualMessageId = messageId || Date.now().toString();

    let config;
    try {
      config = getConfig();
      console.log("TTS config in speakText:", config);
    } catch (e) {
      toast.error("TTS config not loaded. Please refresh the page.");
      setIsSpeaking(false);
      return;
    }
    
    // Check if we've had user interaction already (for mobile autoplay)
    const hasUserInteracted = window.localStorage.getItem('voice_user_interacted') === 'true';
    const mobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // If on mobile and no user interaction, prompt for it immediately
    if (mobileDevice && !hasUserInteracted) {
      toast.error("Voice responses require user interaction on mobile devices.", {
        action: {
          label: "Enable Voice",
          onClick: () => {
            window.localStorage.setItem('voice_user_interacted', 'true');
            // Try again after user interaction
            setTimeout(() => speakText(text, actualMessageId), 100);
          }
        }
      });
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
      
      const preferredGender = config.voice_gender || 'female';
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find an appropriate voice
      let selectedVoice;
      
      // First try to find a voice for the user's browser language
      const browserLang = navigator.language || 'en-US';
      const langVoices = voices.filter(v => v.lang.startsWith(browserLang.split('-')[0]));
      
      // Find a voice matching the preferred gender if possible
      if (preferredGender === 'male') {
        selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('male') || 
                                           v.name.includes('David') || 
                                           v.name.includes('Tom') || 
                                           v.name.includes('Daniel'));
      } else {
        selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('female') || 
                                           v.name.includes('Samantha') || 
                                           v.name.includes('Karen') || 
                                           v.name.includes('Ava'));
      }
      
      // Fallback to any available voice in the preferred language
      if (!selectedVoice && langVoices.length > 0) {
        selectedVoice = langVoices[0];
      }
      
      // Ultimate fallback - just use any available voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }
      
      console.log(`Selected voice: ${selectedVoice?.name || 'default'}`);
      
      // Split text into chunks and queue them for speaking
      const textChunks = splitTextIntoChunks(text);
      let chunkIndex = 0;
      
      const speakNextChunk = () => {
        if (chunkIndex >= textChunks.length) {
          setIsSpeaking(false);
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(textChunks[chunkIndex]);
        
        // Set the selected voice if available
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        }
        
        // Set pitch and rate for more natural speech
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        
        utterance.onend = () => {
          chunkIndex++;
          // Small delay between chunks for more natural pauses
          setTimeout(speakNextChunk, 200);
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
      
      // Check cache first if we have a messageId
      if (actualMessageId) {
        const cachedAudio = getFromCache(actualMessageId, text);
        if (cachedAudio) {
          // Play from cache
          const audioUrl = URL.createObjectURL(cachedAudio);
          const audio = new Audio(audioUrl);
          
          // For iOS Safari
          audio.crossOrigin = 'anonymous';
          
          // Set audio events
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
          };
          
          audio.onerror = (e) => {
            console.error("Audio playback error from cache:", e);
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            
            // Fallback to API if cache playback fails
            setTimeout(() => {
              speakText(text, actualMessageId);
            }, 100);
          };
          
          // Play from cache
          try {
            await audio.play();
            return;
          } catch (playError) {
            console.error("Failed to play from cache:", playError);
            // Continue to API-based playback
          }
        }
      }
      
      // Split text into chunks for more reliable processing
      const textChunks = splitTextIntoChunks(text);
      let chunkIndex = 0;
      const preloadedBlobs: {[index: number]: Blob} = {};
      
      // Function to preload a chunk
      const preloadChunk = async (index: number) => {
        if (index >= textChunks.length) return null;
        
        try {
          const chunk = textChunks[index];
          const audioBlob = await textToSpeech(chunk, voiceService, { voice });
          preloadedBlobs[index] = audioBlob as Blob;
          return audioBlob;
        } catch (error) {
          console.error(`Error preloading chunk ${index}:`, error);
          return null;
        }
      };
      
      // Start preloading the first chunk
      preloadChunk(0);
      
      const playNextChunk = async () => {
        if (chunkIndex >= textChunks.length) {
          setIsSpeaking(false);
          return;
        }
        
        try {
          // Start preloading the next chunk
          if (chunkIndex + 1 < textChunks.length) {
            preloadChunk(chunkIndex + 1);
          }
          
          const chunk = textChunks[chunkIndex];
          console.log(`Playing TTS chunk ${chunkIndex + 1}/${textChunks.length} (${chunk.length} chars)`);
          
          // Use preloaded blob if available, otherwise fetch it
          let audioBlob: Blob;
          if (preloadedBlobs[chunkIndex]) {
            audioBlob = preloadedBlobs[chunkIndex];
            delete preloadedBlobs[chunkIndex]; // Free memory
          } else {
            audioBlob = await textToSpeech(chunk, voiceService, { voice }) as Blob;
          }
          
          // If this is the first chunk, store in cache
          if (chunkIndex === 0 && actualMessageId) {
            addToCache(actualMessageId, text, audioBlob);
          }
          
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          // For iOS Safari
          audio.crossOrigin = 'anonymous';
          
          // Set audio events
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
          
          // Just try to play directly
          const playPromise = audio.play();
          
          // Only handle errors
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("Audio play error:", error);
              
              // Only show toast on the first failed chunk
              if (chunkIndex === 0 && error.name === 'NotAllowedError') {
                toast.error("Audio autoplay blocked. Tap Play to enable voice responses.", {
                  action: {
                    label: "Play",
                    onClick: () => {
                      // Store user interaction for future
                      window.localStorage.setItem('voice_user_interacted', 'true');
                      audio.play().catch(e => console.error("Retry play failed:", e));
                    }
                  }
                });
              } else {
                // For other chunks, just move on
                URL.revokeObjectURL(audioUrl);
                chunkIndex++;
                playNextChunk();
              }
            });
          }
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
    // Stop browser TTS
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // For API-based TTS, we need to set isSpeaking to false
    // This will prevent the next chunk from playing in the recursive chain
    setIsSpeaking(false);
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

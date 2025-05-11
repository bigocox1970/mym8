import { useState, useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { getConfig, initConfig } from '@/lib/configManager';
import { textToSpeech } from '@/lib/api';

// Keep a simple cache for API-based TTS results
const ttsCache = new Map<string, Blob>();

// Declare type for window with our custom property
declare global {
  interface Window {
    keepAliveInterval: NodeJS.Timeout | null;
  }
}

// Global state
const globalState = {
  playing: false,
  audioElement: null as HTMLAudioElement | null,
  lastStopTime: 0,
  lastSpeakAttempt: 0,
  speakRequestInProgress: false
};

// Simple approach to text-to-speech that respects configured service
interface UseTextToSpeechProps {
  initialEnabled?: boolean;
}

export function useTextToSpeech({ initialEnabled = false }: UseTextToSpeechProps = {}) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(initialEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastSpokenRef = useRef<string | null>(null);
  const lastSpokenContentRef = useRef<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize config
  useEffect(() => {
    const initializeConfig = async () => {
      await initConfig();
      console.log("Config initialized for TTS");
      const config = getConfig();
      
      if (config.voice_enabled !== undefined) {
        setIsVoiceEnabled(config.voice_enabled);
      }
    };
    
    initializeConfig();
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Basic function to stop speaking
  const stopSpeaking = () => {
    console.log('Stopping speech');
    
    // Stop browser speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Stop any audio element
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.src = "";
      } catch (e) {
        console.error("Error stopping audio element:", e);
      }
    }
    
    setIsSpeaking(false);
  };
  
  // Clean text for better speech synthesis
  const cleanTextForSpeech = (text: string): string => {
    if (!text) return '';
    
    // Remove emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu;
    let cleanText = text.replace(emojiRegex, '');
    
    // Replace problematic characters
    cleanText = cleanText.replace(/[^\w\s.,?!'"():-]/g, ' ');
    
    // Replace multiple spaces
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    return cleanText;
  };
  
  // Basic function to speak text using the configured service
  const speakText = async (text: string, messageId?: string) => {
    if (!text || !isVoiceEnabled) return;
    
    // First, stop any ongoing speech
    stopSpeaking();
    
    // Clean the text
    const cleanText = cleanTextForSpeech(text);
    console.log(`Speaking text: ${cleanText.substring(0, 30)}...`);
    
    // Get the configuration
    const config = getConfig();
    console.log("Using TTS service:", config.voice_service);
    
    setIsLoading(true);
    setIsSpeaking(true);
    
    try {
      // Store message ID as last spoken
      if (messageId) {
        lastSpokenRef.current = messageId;
        lastSpokenContentRef.current = text;
      }
      
      // Check which voice service to use
      if (config.voice_service === 'browser' || !config.voice_service) {
        // Use browser's built-in speech synthesis
        await speakUsingBrowser(cleanText);
      } else {
        // Use external TTS API
        await speakUsingApi(cleanText, config.voice_service);
      }
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      toast.error("Speech failed. Try again or check settings.");
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use browser's built-in speech synthesis
  const speakUsingBrowser = async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error("Speech synthesis not available"));
        return;
      }
      
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set up event handlers
        utterance.onend = () => {
          console.log("Browser speech ended");
          setIsSpeaking(false);
          resolve();
        };
        
        utterance.onerror = (error) => {
          console.error("Browser speech error:", error);
          setIsSpeaking(false);
          reject(error);
        };
        
        // Speak
        window.speechSynthesis.speak(utterance);
        
        // Safety timeout
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log("Browser speech timeout - still speaking after timeout");
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            resolve();
          }
        }, 15000);
      } catch (error) {
        console.error("Error in browser speech:", error);
        setIsSpeaking(false);
        reject(error);
      }
    });
  };
  
  // Use external TTS API
  const speakUsingApi = async (text: string, service: string): Promise<void> => {
    try {
      const config = getConfig();
      
      // Generate a cache key
      const voiceName = 
        service === 'elevenlabs' ? config.elevenlabs_voice :
        service === 'google' ? config.google_voice :
        service === 'azure' ? config.azure_voice :
        service === 'amazon' ? config.amazon_voice :
        service === 'openai' ? config.openai_voice : 'default';
      
      const cacheKey = `${service}_${voiceName}_${text.substring(0, 50)}`;
      
      // Check cache first
      let audioBlob: Blob;
      if (ttsCache.has(cacheKey)) {
        console.log("Using cached audio");
        audioBlob = ttsCache.get(cacheKey)!;
      } else {
        // Call the API
        console.log(`Calling ${service} TTS API`);
        
        // Request audio from the API - matches the API interface
        const response = await textToSpeech(
          text,
          service,
          { voice: voiceName }
        );
        
        // Handle response - could be a Blob directly from the API
        if (response instanceof Blob) {
          audioBlob = response;
        } else {
          // If it's a string (like a URL), we need to fetch it
          const audioResponse = await fetch(response);
          audioBlob = await audioResponse.blob();
        }
        
        // Cache the result
        ttsCache.set(cacheKey, audioBlob);
      }
      
      // Play the audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);
      audioElementRef.current = audioElement;
      // Ensure mobile speaker playback
      audioElement.setAttribute('playsinline', 'true');
      audioElement.setAttribute('autoplay', 'true');
      audioElement.setAttribute('webkit-playsinline', 'true');
      audioElement.crossOrigin = 'anonymous';
      
      // Set up event handlers
      audioElement.onended = () => {
        console.log("Audio playback ended");
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audioElement.onerror = (error) => {
        console.error("Audio playback error:", error);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      // Play the audio
      await audioElement.play();
      
    } catch (error) {
      console.error(`Error in ${service} TTS:`, error);
      throw error;
    }
  };
  
  // Simple function for shorter messages
  const speakSimpleText = async (text: string, messageId?: string) => {
    // For simplicity, just use the main function
    await speakText(text, messageId);
  };
  
  // Toggle voice mode
  const toggleVoiceMode = () => {
    stopSpeaking();
    const newValue = !isVoiceEnabled;
    setIsVoiceEnabled(newValue);
    
    // Save to config
    try {
      const config = getConfig();
      config.voice_enabled = newValue;
      localStorage.setItem('app_config', JSON.stringify(config));
    } catch (e) {
      console.error('Error updating voice config:', e);
    }
  };
  
  // Check if a message should be spoken
  const shouldSpeakMessage = (messageId: string, messageContent: string) => {
    return (
      isVoiceEnabled &&
      (!lastSpokenRef.current || 
       lastSpokenRef.current !== messageId || 
       lastSpokenContentRef.current !== messageContent)
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
    isLoading,
    speakText,
    speakSimpleText,
    stopSpeaking, 
    toggleVoiceMode,
    shouldSpeakMessage,
    updateLastSpokenRefs,
    lastSpokenRef
  };
}


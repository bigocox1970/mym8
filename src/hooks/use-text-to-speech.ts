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
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === selectedVoiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (error) => {
        setIsSpeaking(false);
        if (error.error !== 'interrupted' && error.error !== 'canceled') {
          toast.error("Speech synthesis failed.");
        }
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

      // API-based TTS
      try {
        console.log("Using API TTS");
        setIsSpeaking(true);
        // No toast notification here, we'll handle this in the UI
        const audioBlob = await textToSpeech(text, voiceService, { voice });
      const audioUrl = URL.createObjectURL(audioBlob as Blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };
      await audio.play();
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

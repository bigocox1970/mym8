import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionError } from '@/pages/AI/types';

interface UseSpeechRecognitionProps {
  onTranscript: (transcript: string) => void;
}

export function useSpeechRecognition({ onTranscript }: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);

  // Check if speech recognition is supported
  const isSpeechRecognitionSupported = 
    typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Start speech recognition
  const startListening = () => {
    // Check for browser support
    if (!isSpeechRecognitionSupported) {
      toast.error("Speech recognition is not supported in your browser.");
      setIsListening(false);
      return;
    }
    
    try {
      // Detect iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
        !(window as unknown as { MSStream: boolean }).MSStream;
      
      // On iOS, we need to request permission explicitly first
      if (isIOS) {
        console.log("iOS device detected for speech recognition");
        // iOS requires user interaction to grant microphone permission
        toast.message("Please allow microphone access when prompted");
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure recognition - different settings for mobile
      recognition.continuous = false; // Set to false for better mobile compatibility
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Set language explicitly
      
      // For mobile devices, we may need shorter timeouts
      if (isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Mobile device - can time out more quickly
        console.log("Mobile device detected, using mobile-optimized speech recognition");
        recognition.maxAlternatives = 1; // Limit alternatives for speed
      }
      
      // Handle results
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Get the most confident result
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
          
        console.log("Speech recognized:", transcript);
        onTranscript(transcript);
        
        // On mobile, we often want to submit immediately after speaking
        if (isIOS && event.results[0].isFinal) {
          console.log("iOS final result detected, auto-stopping recognition");
          recognition.stop();
        }
      };
      
      // Handle end of recognition
      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
      };
      
      // Handle errors with better mobile-specific messaging
      recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Provide more specific error messages based on error type and device
        if (event.error === 'not-allowed') {
          if (isIOS) {
            toast.error("Microphone access denied. Please enable microphone in your iOS Settings app.");
          } else {
            toast.error("Microphone access denied. Please enable microphone permissions in your browser settings.");
          }
        } else if (event.error === 'network') {
          toast.error("Network error occurred. Check your internet connection.");
        } else if (event.error === 'no-speech') {
          toast.message("No speech detected. Please try again.", {
            description: "Speak clearly and ensure your microphone is working."
          });
        } else if (event.error === 'aborted') {
          // This is usually intentional, so no toast needed
          console.log("Speech recognition aborted");
        } else {
          toast.error("Speech recognition failed. Try typing your message instead.");
        }
      };
      
      // On some mobile browsers, especially iOS, we need a user gesture to start recognition
      // This function ensures we've had user interaction before trying to use the microphone
      const ensureUserInteraction = () => {
        // Try to unlock audio context if needed (helps with microphone access on some devices)
        if (typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined') {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const audioContext = new AudioContextClass();
            if (audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
              });
            }
          }
        }
        
        // Now start recognition
        recognition.start();
        setIsListening(true);
        console.log("Speech recognition started");
      };
      
      // Start recognition with user interaction handling
      ensureUserInteraction();
      
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("Failed to start speech recognition. Please try again.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (isListening) {
      try {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          // Create a new instance to stop
          const recognition = new SpeechRecognition();
          recognition.stop();
          setIsListening(false);
          console.log("Speech recognition stopped");
        }
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Clean up any active speech recognition on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    isSpeechRecognitionSupported
  };
}

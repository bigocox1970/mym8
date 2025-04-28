import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Mic, Square, Play, Save, Volume2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { processMessage } from "@/lib/api";
import { getConfig } from "@/lib/config";

// Add SpeechRecognition type definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

const NewJournal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = async () => {
    try {
      // Check if speech recognition is supported
      if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        toast.error("Speech recognition is not supported in your browser");
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Handle results
      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript;
          setContent(prev => {
            if (prev.trim()) {
              return `${prev} ${transcript}`.trim();
            }
            return transcript;
          });
        }
      };

      // Handle errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please enable microphone permissions.");
        } else {
          toast.error("Speech recognition failed. Please try again.");
        }
        setIsRecording(false);
      };

      // Start recognition
      recognition.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("Failed to start speech recognition");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.info("Recording stopped");
    }
  };

  const getAiAssistance = async () => {
    if (!content.trim()) {
      toast.error("Please write something first to get AI assistance");
      return;
    }

    setIsTranscribing(true);
    try {
      const response = await processMessage(content, {
        goals: [],
        actions: [],
        conversation: []
      });

      setContent(response.message);
      toast.success("AI has provided some insights");
    } catch (error) {
      console.error("AI processing error:", error);
      toast.error("Failed to get AI assistance");
    } finally {
      setIsTranscribing(false);
    }
  };

  const saveEntry = async () => {
    if (!user) {
      toast.error("You must be logged in to save entries");
      return;
    }
    
    if (!content.trim()) {
      toast.error("Entry cannot be empty");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          content: content
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Journal entry saved successfully");
      navigate("/journal");
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save journal entry");
    } finally {
      setIsSaving(false);
    }
  };

  const readAloud = () => {
    if (!content.trim()) {
      toast.error("No content to read");
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      const voices = window.speechSynthesis.getVoices();
      
      // Get voice configuration from settings
      const config = getConfig();
      const selectedVoiceName = config.tts.voice === 'male' ? 'Alex' : 'Samantha';
      
      // Find the configured voice
      const selectedVoice = voices.find(voice => 
        voice.name.includes(selectedVoiceName) || 
        (config.tts.voice === 'male' ? voice.name.includes('Male') : voice.name.includes('Female'))
      );
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Set speech rate from config
      utterance.rate = config.tts.rate;
      
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech is not supported in your browser");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={readAloud}
              disabled={!content.trim()}
            >
              <Volume2 className="mr-2 h-4 w-4" />
              Read Aloud
            </Button>
            <Button onClick={saveEntry} disabled={isSaving}>
              {isSaving ? (
                <Play className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Entry
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Entry</h2>
            <Button
              variant="outline"
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
            >
              {isRecording ? (
                <Square className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts here..."
            className="min-h-[400px]"
            disabled={isTranscribing}
          />
        </div>
      </div>
    </Layout>
  );
};

export default NewJournal;

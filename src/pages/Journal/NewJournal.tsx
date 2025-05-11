import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Mic, Square, Play, Save, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

export const NewJournal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { speakText, isSpeaking, stopSpeaking } = useTextToSpeech();

  // Determine support for MediaRecorder and browser STT
  const isMediaRecorderSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;
  const [browserSTTActive, setBrowserSTTActive] = useState(false);
  const {
    isListening: isBrowserSTTListening,
    startListening: startBrowserSTT,
    stopListening: stopBrowserSTT,
    isSpeechRecognitionSupported
  } = useSpeechRecognition({
    onTranscript: (transcript) => {
      setContent((prev) => prev.trim() ? `${prev}\n\n${transcript}` : transcript);
      setBrowserSTTActive(false);
      toast.success("Speech recognized and added to entry");
    }
  });

  // Real transcription using OpenAI Whisper API
  const transcribeWithOpenAI = async (audioBlob: Blob): Promise<string> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OpenAI API key");
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");
    
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }
    return await response.text();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        setAudioChunks(chunks);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        transcribeAudio(audioBlob);
      };
      
      recorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access your microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      toast.info("Recording stopped");
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const transcription = await transcribeWithOpenAI(audioBlob);
      setContent(prev => {
        if (prev.trim()) {
          return `${prev}\n\n${transcription}`;
        }
        return transcription;
      });
      toast.success("Audio transcribed successfully");
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to transcribe audio");
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
          content: content.trim(),
        })
        .select();
        
      if (error) throw error;
      
      toast.success("Journal entry saved successfully");
      navigate(`/journal/${data[0].id}`);
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save your journal entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">New Journal Entry</h1>
          </div>
          <div className="space-x-2 flex items-center">
            {/* Play Entry button (icon only, toggles to stop icon when playing) */}
            <Button
              variant={isSpeaking ? "default" : "outline"}
              onClick={isSpeaking ? stopSpeaking : () => speakText(content)}
              disabled={!content.trim() && !isSpeaking}
              size="icon"
              aria-label={isSpeaking ? "Stop" : "Play"}
            >
              {isSpeaking ? (
                <Square className="h-5 w-5 text-red-500" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            {/* Mic (record) button for OpenAI Whisper (MediaRecorder) */}
            {isMediaRecorderSupported ? (
              <Button 
                variant="outline"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={isRecording ? "animate-pulse bg-green-500 text-white" : ""}
                size="icon"
                aria-label={isRecording ? "Stop Recording" : "Start Recording"}
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : null}
            {/* Browser STT fallback button */}
            {!isMediaRecorderSupported && isSpeechRecognitionSupported ? (
              <Button
                variant={isBrowserSTTListening ? "default" : "outline"}
                onClick={() => {
                  if (!isBrowserSTTListening) {
                    setBrowserSTTActive(true);
                    startBrowserSTT();
                  } else {
                    stopBrowserSTT();
                    setBrowserSTTActive(false);
                  }
                }}
                disabled={isTranscribing}
                className={isBrowserSTTListening ? "animate-pulse bg-blue-500 text-white" : ""}
                size="icon"
                aria-label={isBrowserSTTListening ? "Stop Speech Recognition" : "Start Speech Recognition"}
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : null}
            {/* If neither method is supported, show a disabled mic button with a tooltip */}
            {!isMediaRecorderSupported && !isSpeechRecognitionSupported ? (
              <Button variant="outline" disabled size="icon" aria-label="Speech input not supported">
                <Mic className="h-5 w-5 opacity-50" />
              </Button>
            ) : null}
            {content.trim() && (
              <Button 
                onClick={saveEntry} 
                disabled={isSaving || isTranscribing}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            )}
          </div>
        </div>
        
        {isTranscribing && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-md animate-pulse">
            Transcribing your recording... Please wait.
          </div>
        )}
        
        {browserSTTActive && isBrowserSTTListening && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-md animate-pulse">
            Listening... Speak now and your words will be transcribed.
          </div>
        )}
        
        <div className="border rounded-md p-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing or record your thoughts..."
            className="min-h-[300px] resize-none border-0 focus-visible:ring-0"
          />
        </div>
        
        <div className="text-sm text-gray-500">
          <p>Tip: Record your thoughts by clicking the "Start Recording" button or type directly in the text area.</p>
        </div>
      </div>
    </Layout>
  );
};

export default NewJournal;

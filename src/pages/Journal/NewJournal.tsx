
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Mic, MicOff, Play, Stop, Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const NewJournal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // This is a mock function for transcription
  // In a real application, you would use a transcription service API
  const mockTranscribe = async (audioBlob: Blob): Promise<string> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Return mock transcription
    return "This is a simulated transcription of your audio recording. In a real application, this would be the actual text from your voice recording, transcribed by a service like OpenAI Whisper API, Google Speech-to-Text, or similar.";
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
        // Start transcription when recording stops
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
      // Stop all tracks in all streams
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      toast.info("Recording stopped");
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // In a real app, send this blob to your transcription service
      const transcription = await mockTranscribe(audioBlob);
      
      // Append transcription to existing content
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
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
          <div className="space-x-2">
            <Button 
              variant={isRecording ? "destructive" : "outline"} 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
            >
              {isRecording ? (
                <>
                  <Stop className="mr-2 h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </>
              )}
            </Button>
            
            <Button 
              onClick={saveEntry} 
              disabled={!content.trim() || isSaving || isTranscribing}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </div>
        
        {isTranscribing && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-md animate-pulse">
            Transcribing your recording... Please wait.
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

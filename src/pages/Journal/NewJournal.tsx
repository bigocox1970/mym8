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
  const [isSaving, setIsSaving] = useState(false);
  const { speakText, isSpeaking, stopSpeaking } = useTextToSpeech();

  // Only browser STT
  const {
    isListening,
    toggleListening,
    isSpeechRecognitionSupported
  } = useSpeechRecognition({
    onTranscript: (transcript) => {
      setContent((prev) => prev.trim() ? `${prev}\n\n${transcript}` : transcript);
      toast.success("Speech recognized and added to entry");
    }
  });

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
            {/* Only browser STT mic button */}
            {isSpeechRecognitionSupported ? (
              <Button
                variant={isListening ? "default" : "outline"}
                onClick={toggleListening}
                className={isListening ? "animate-pulse bg-blue-500 text-white" : ""}
                size="icon"
                aria-label={isListening ? "Stop Speech Recognition" : "Start Speech Recognition"}
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="outline" disabled size="icon" aria-label="Speech input not supported">
                <Mic className="h-5 w-5 opacity-50" />
              </Button>
            )}
            {content.trim() && (
              <Button 
                onClick={saveEntry} 
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            )}
          </div>
        </div>
        {isListening && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-md animate-pulse">
            Listening... Speak now and your words will be transcribed.
          </div>
        )}
        <div className="border rounded-md p-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing or use the mic to dictate your thoughts..."
            className="min-h-[300px] resize-none border-0 focus-visible:ring-0"
          />
        </div>
        <div className="text-sm text-gray-500">
          <p>Tip: Use the mic button to dictate your journal entry using your voice.</p>
        </div>
      </div>
    </Layout>
  );
};

export default NewJournal;

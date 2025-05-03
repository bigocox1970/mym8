import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, Clock, Edit, Trash, Volume2, VolumeX } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/configManager";
import { textToSpeech } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

const JournalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasBeenPlayed, setHasBeenPlayed] = useState(false);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!user || !id) return;

      try {
        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setEntry(data as JournalEntry);
      } catch (error) {
        console.error("Error fetching journal entry:", error);
        toast.error("Failed to load journal entry");
        navigate("/journal");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [id, user, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async () => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Journal entry deleted successfully");
      navigate("/journal");
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      toast.error("Failed to delete journal entry");
    }
  };

  const readAloud = async () => {
    if (!entry?.content?.trim()) {
      toast.error("No content to read");
      return;
    }

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      let config;
      try {
        config = getConfig();
      } catch (e) {
        toast.error("TTS config not loaded. Please refresh the page.");
        console.error("Config error:", e);
        return;
      }
      const service = config.voice_service || 'browser';
      let voice = 'alloy';
      if (service === 'openai') voice = config.openai_voice || 'alloy';
      if (service === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
      if (service === 'google') voice = config.google_voice || 'en-US-Neural2-F';
      if (service === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
      if (service === 'amazon') voice = config.amazon_voice || 'Joanna';

      setIsPlaying(true);
      setHasBeenPlayed(true);

      if (service === 'browser') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new window.SpeechSynthesisUtterance(entry.content);
          const voices = window.speechSynthesis.getVoices();
          const selectedVoiceName = config.voice_gender === 'male' ? 'Alex' : 'Samantha';
          const selectedVoice = voices.find(voice =>
            voice.name.includes(selectedVoiceName) ||
            (config.voice_gender === 'male' ? voice.name.includes('Male') : voice.name.includes('Female'))
          );
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          utterance.rate = 1.0;
          utterance.onend = () => {
            setIsPlaying(false);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          toast.error("Text-to-speech is not supported in your browser");
          setIsPlaying(false);
        }
        return;
      }
      
      toast("Generating speech...");
      let audioBlob;
      try {
        audioBlob = await textToSpeech(entry.content, service, { voice });
      } catch (apiError) {
        toast.error("TTS API error: " + (apiError instanceof Error ? apiError.message : String(apiError)));
        console.error("TTS API error:", apiError);
        setIsPlaying(false);
        return;
      }
      
      if (!audioBlob) {
        toast.error("No audio returned from TTS API");
        setIsPlaying(false);
        return;
      }
      
      try {
        const audioUrl = URL.createObjectURL(audioBlob as Blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setIsPlaying(false);
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setIsPlaying(false);
          toast.error("Audio playback error");
        };
        
        await audio.play();
      } catch (audioError) {
        toast.error("Failed to play audio: " + (audioError instanceof Error ? audioError.message : String(audioError)));
        console.error("Audio playback error:", audioError);
        setIsPlaying(false);
      }
    } catch (error) {
      toast.error("Unexpected error: " + (error instanceof Error ? error.message : String(error)));
      console.error("Unexpected error in readAloud:", error);
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Loading journal entry...</p>
        </div>
      </Layout>
    );
  }

  if (!entry) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Entry not found</h3>
          <p className="text-gray-500 mb-4">The requested journal entry doesn't exist</p>
          <Link to="/journal">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Journal
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/journal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Journal Entry</h1>
          </div>
          <div className="space-x-2 flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={readAloud}
              className={cn(
                isPlaying && "bg-green-100 text-green-600 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
                hasBeenPlayed && !isPlaying && "text-green-600 border-green-300 dark:text-green-400 dark:border-green-800"
              )}
            >
              <Volume2 className={cn("h-4 w-4 mr-1", isPlaying && "animate-pulse")} />
              {isPlaying ? "Stop" : "Read Aloud"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Link to={`/journal/edit/${id}`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(entry.created_at)}
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {formatTime(entry.created_at)}
          </div>
        </div>

        <Card 
          className={cn(
            "transition-all cursor-pointer",
            isPlaying && "ring-2 ring-green-500 animate-pulse bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
            hasBeenPlayed && !isPlaying && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          )}
          onClick={readAloud}
        >
          <CardContent className="p-6">
            <div className="prose dark:prose-invert max-w-none">
              {entry.content.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-5 right-5">
        <Button 
          className={cn(
            "rounded-full h-14 w-14 shadow-lg",
            isPlaying && "bg-green-500 hover:bg-green-600 animate-pulse",
            hasBeenPlayed && !isPlaying && "bg-green-100 text-green-600 border-green-300 hover:bg-green-200"
          )}
          onClick={readAloud}
        >
          {isPlaying ? (
            <VolumeX className="h-6 w-6" />
          ) : (
            <Volume2 className="h-6 w-6" />
          )}
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this journal entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default JournalDetail;

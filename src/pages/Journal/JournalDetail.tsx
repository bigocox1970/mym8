import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, Clock, Edit, Trash, Volume2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/configManager";
import { textToSpeech } from "@/lib/api";
import { getCachedAudio, cacheAudio } from "@/lib/audioCache";
import { processAndPlayChunks, stopAllAudio, isEntryPlaying } from "@/lib/audioChunkProcessor";
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

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

export const JournalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Set up a timer to check for playing state changes
  useEffect(() => {
    if (!id) return;
    
    const timer = setInterval(() => {
      // Check if the current entry is playing
      const playing = isEntryPlaying(id);
      
      // Update state if needed to trigger re-render
      if (playing !== isPlaying) {
        setIsPlaying(playing);
      }
    }, 500);
    
    return () => clearInterval(timer);
  }, [id, isPlaying]);

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

  const readAloud = useCallback(async () => {
    if (!entry?.content?.trim() || !id) {
      toast.error("No content to read");
      return;
    }
    
    // If already playing, stop it and return
    if (isEntryPlaying(id)) {
      console.log('Stopping playback for entry:', id);
      stopAllAudio();
      return;
    }
    
    try {
      // Get configuration
      let config;
      try {
        config = getConfig();
      } catch (e) {
        toast.error("TTS config not loaded. Please refresh the page.");
        console.error("Config error:", e);
        return;
      }
      
      // Set loading state when starting to load audio
      setIsLoadingAudio(true);
      
      const service = config.voice_service || 'browser';
      let voice = 'alloy';
      if (service === 'openai') voice = config.openai_voice || 'alloy';
      if (service === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
      if (service === 'google') voice = config.google_voice || 'en-US-Neural2-F';
      if (service === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
      if (service === 'amazon') voice = config.amazon_voice || 'Joanna';
      
      console.log('Starting audio playback for entry:', id);
      
      // Use the chunked playback system
      await processAndPlayChunks(entry.content, {
        voiceService: service,
        voice: voice,
        entryId: id,
        onChunkStart: (chunkIndex, totalChunks) => {
          console.log(`Starting chunk ${chunkIndex + 1}/${totalChunks}`);
          if (chunkIndex === 0) {
            // First chunk is starting to play, clear loading state
            setIsLoadingAudio(false);
            setIsPlaying(true);
          }
        },
        onChunkEnd: (chunkIndex, totalChunks) => {
          console.log(`Finished chunk ${chunkIndex + 1}/${totalChunks}`);
        },
        onComplete: () => {
          console.log('All chunks complete');
          setIsLoadingAudio(false);
          setIsPlaying(false);
        },
        onError: (error) => {
          console.error('Chunk playback error:', error);
          toast.error(`Playback error: ${error.message}`);
          setIsLoadingAudio(false);
          setIsPlaying(false);
        }
      });
    } catch (error) {
      toast.error("Unexpected error: " + (error instanceof Error ? error.message : String(error)));
      console.error("Unexpected error in readAloud:", error);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    }
  }, [entry, id]);

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
        
        // Auto-play if requested from the list view
        if (location.state?.autoPlay && data) {
          // Wait a brief moment for the component to fully render
          setTimeout(() => {
            readAloud();
          }, 500);
        }
      } catch (error) {
        console.error("Error fetching journal entry:", error);
        toast.error("Failed to load journal entry");
        navigate("/journal");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [id, user, navigate, location.state, readAloud]);

  // Stop audio playback when component unmounts
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

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
      <div className="space-y-6">
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
              variant={isPlaying || isEntryPlaying(id) ? "default" : "outline"} 
              className={isLoadingAudio ? "animate-pulse" : ""}
              onClick={readAloud}
            >
              <Volume2 className={`mr-2 h-4 w-4 ${isLoadingAudio ? "animate-pulse" : ""}`} />
              {isLoadingAudio ? "Loading..." : isPlaying || isEntryPlaying(id) ? "Stop" : "Read Aloud"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
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
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            isPlaying || isEntryPlaying(id) ? "bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500" : ""
          }`} 
          onClick={readAloud}
        >
          <CardContent className="p-6">
            <div className="prose max-w-none">
              {entry.content.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
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

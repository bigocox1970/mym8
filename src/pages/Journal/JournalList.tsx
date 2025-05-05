import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { FileText, Plus, Search, Mic, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { getConfig } from "@/lib/configManager";
import { textToSpeech } from "@/lib/api";
import { getCachedAudio, cacheAudio } from "@/lib/audioCache";
import { processAndPlayChunks, stopAllAudio, isEntryPlaying } from "@/lib/audioChunkProcessor";
import { PageHeader } from "@/components/PageHeader";
import AIAssistantButton from "@/components/AIAssistantButton";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

export const JournalList = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  // We need this to force re-renders when audio state changes
  const [audioState, setAudioState] = useState<{playing: boolean, entryId: string | null}>({
    playing: false,
    entryId: null
  });

  // Set up a timer to check for playing state changes
  useEffect(() => {
    const timer = setInterval(() => {
      // Get the current playing entry
      const anyEntryPlaying = entries.some(entry => isEntryPlaying(entry.id));
      const playingEntry = entries.find(entry => isEntryPlaying(entry.id));
      
      // Update state if needed to trigger re-render
      if (anyEntryPlaying !== audioState.playing || 
          (playingEntry && playingEntry.id !== audioState.entryId)) {
        setAudioState({
          playing: anyEntryPlaying,
          entryId: playingEntry ? playingEntry.id : null
        });
      }
    }, 500);
    
    return () => clearInterval(timer);
  }, [entries, audioState]);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setEntries(data as JournalEntry[]);
      } catch (error) {
        console.error("Error fetching journal entries:", error);
        toast.error("Failed to load your journal entries");
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user]);

  const readAloud = useCallback(async (entry: JournalEntry) => {
    if (!entry.content) {
      console.error("No content to read");
      return;
    }
    
    // If this entry is already playing, stop it and return
    if (isEntryPlaying(entry.id)) {
      console.log('Stopping playback for entry:', entry.id);
      stopAllAudio();
      
      // Update UI to show stopped state
      setAudioState({
        playing: false,
        entryId: null
      });
      
      return;
    }
    
    // Always stop any currently playing audio before starting a new one
    stopAllAudio();
    
    try {
      // Get configuration
      let config;
      try {
        config = getConfig();
      } catch (e) {
        console.error("Config error:", e);
        return;
      }
      
      // Set loading state when audio starts loading
      setLoadingAudioId(entry.id);
      
      const service = config.voice_service || 'browser';
      let voice = 'alloy';
      if (service === 'openai') voice = config.openai_voice || 'alloy';
      if (service === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
      if (service === 'google') voice = config.google_voice || 'en-US-Neural2-F';
      if (service === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
      if (service === 'amazon') voice = config.amazon_voice || 'Joanna';
      
      console.log('Starting audio playback for entry:', entry.id);
      console.log(`[JOURNAL-DEBUG] Using voice service: ${service}, voice: ${voice}`);
      
      // Use the chunked playback system
      await processAndPlayChunks(entry.content, {
        voiceService: service,
        voice: voice,
        entryId: entry.id,
        onChunkStart: (chunkIndex, totalChunks) => {
          console.log(`Starting chunk ${chunkIndex + 1}/${totalChunks} for entry ${entry.id}`);
          if (chunkIndex === 0) {
            // First chunk is starting to play, clear loading state
            setLoadingAudioId(null);
            // Force a UI update
            setAudioState({
              playing: true,
              entryId: entry.id
            });
          }
        },
        onChunkEnd: (chunkIndex, totalChunks) => {
          console.log(`Finished chunk ${chunkIndex + 1}/${totalChunks} for entry ${entry.id}`);
        },
        onComplete: () => {
          console.log('All chunks complete for entry', entry.id);
          setLoadingAudioId(null);
          // Force a UI update
          setAudioState({
            playing: false,
            entryId: null
          });
        },
        onError: (error) => {
          console.error('Chunk playback error:', error);
          
          // Don't show toast errors for expected interruptions
          if (!error.message.includes('interrupted') && !error.message.includes('canceled')) {
            console.error(`Unexpected playback error: ${error.message}`);
          }
          
          setLoadingAudioId(null);
          // Force a UI update
          setAudioState({
            playing: false,
            entryId: null
          });
        }
      });
    } catch (error) {
      console.error("Unexpected error in readAloud:", error);
      setLoadingAudioId(null);
      setAudioState({
        playing: false,
        entryId: null
      });
    }
  }, []);

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

  const filteredEntries = entries.filter(entry => 
    entry.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Journal</h1>
          <div className="flex items-center gap-2">
            <Link to="/journal/new" className="p-2 cursor-pointer hover:bg-primary/10 rounded-md">
              <Plus className="h-5 w-5" />
            </Link>
            <AIAssistantButton question="Can you give me some tips for journal writing or help me reflect on my entries?" />
            <MenuToggleButton />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search journal entries..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <p>Loading your journal entries...</p>
          ) : filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <Card 
                key={entry.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  isEntryPlaying(entry.id) || audioState.entryId === entry.id
                    ? "bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500" 
                    : ""
                }`}
                onClick={() => readAloud(entry)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div>
                        <h3 className="font-medium text-lg mb-2">
                          {entry.content?.substring(0, 50)}
                          {entry.content && entry.content.length > 50 ? "..." : ""}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {entry.content?.substring(0, 200)}
                        {entry.content && entry.content.length > 200 ? "..." : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(entry.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatTime(entry.created_at)}</div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <Link to={`/journal/${entry.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant={(isEntryPlaying(entry.id) || audioState.entryId === entry.id) ? "default" : "outline"} 
                          size="sm"
                          className={loadingAudioId === entry.id ? "animate-pulse" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            readAloud(entry);
                          }}
                        >
                          <Volume2 className={`h-4 w-4 mr-1 ${loadingAudioId === entry.id ? "animate-pulse" : ""}`} />
                          {isEntryPlaying(entry.id) || audioState.entryId === entry.id ? "Stop" : 
                           loadingAudioId === entry.id ? "Loading..." : "Play"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No journal entries yet</h3>
              <p className="text-gray-500 mb-4">Start recording your thoughts and reflections</p>
              <Link to="/journal/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Entry
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default JournalList;

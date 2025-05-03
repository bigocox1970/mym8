import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { FileText, Plus, Search, Mic, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { textToSpeech } from "@/lib/api";
import { getConfig } from "@/lib/configManager";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

const JournalList = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [playingEntryId, setPlayingEntryId] = useState<string | null>(null);
  const [lastPlayedEntryId, setLastPlayedEntryId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user) return;

      try {
        setLoading(true);
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
    
    // Clean up on unmount
    return () => {
      console.log("JournalList component unmounting, cleaning up audio");
      stopAudio();
      
      // Extra safeguard for speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [user]);

  useEffect(() => {
    console.log("playingEntryId changed:", playingEntryId);
  }, [playingEntryId]);

  useEffect(() => {
    // Pre-load voices for browser speech synthesis
    if (window.speechSynthesis) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
        console.log("Browser speech synthesis voices loaded");
      };
      
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      console.log("Stopping audio playback");
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    
    // Always reset the playing state
    setPlayingEntryId(null);
    
    // Cancel any browser speech synthesis if active
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  const playAudio = async (entry: JournalEntry) => {
    if (!entry?.content?.trim()) {
      toast.error("No content to read");
      return;
    }
    
    // If already playing this entry, stop it and return early
    if (playingEntryId === entry.id) {
      stopAudio();
      return;
    }
    
    // Stop any previously playing audio first
    stopAudio();
    
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
      
      // Set up voice service
      const service = config.voice_service || 'browser';
      let voice = 'alloy';
      if (service === 'openai') voice = config.openai_voice || 'alloy';
      if (service === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
      if (service === 'google') voice = config.google_voice || 'en-US-Neural2-F';
      if (service === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
      if (service === 'amazon') voice = config.amazon_voice || 'Joanna';
      
      // Mark as playing
      setPlayingEntryId(entry.id);
      setLastPlayedEntryId(entry.id);
      
      // Use browser TTS if selected
      if (service === 'browser') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Stop any previous speech
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
          
          // Make sure these callbacks are properly handling state
          utterance.onend = () => {
            console.log("Browser speech synthesis ended");
            setPlayingEntryId(null);
          };
          
          utterance.onerror = (error) => {
            console.error("Browser speech synthesis error:", error);
            setPlayingEntryId(null);
          };
          
          window.speechSynthesis.speak(utterance);
        } else {
          toast.error("Text-to-speech is not supported in your browser");
          setPlayingEntryId(null);
        }
        return;
      }
      
      // Use API-based TTS
      toast("Generating speech...");
      let audioBlob;
      try {
        audioBlob = await textToSpeech(entry.content, service, { voice });
      } catch (apiError) {
        toast.error("TTS API error: " + (apiError instanceof Error ? apiError.message : String(apiError)));
        console.error("TTS API error:", apiError);
        setPlayingEntryId(null);
        return;
      }
      
      if (!audioBlob) {
        toast.error("No audio returned from TTS API");
        setPlayingEntryId(null);
        return;
      }
      
      try {
        const audioUrl = URL.createObjectURL(audioBlob as Blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setPlayingEntryId(null);
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setPlayingEntryId(null);
          toast.error("Audio playback error");
        };
        
        await audio.play();
      } catch (audioError) {
        toast.error("Failed to play audio: " + (audioError instanceof Error ? audioError.message : String(audioError)));
        console.error("Audio playback error:", audioError);
        setPlayingEntryId(null);
      }
    } catch (error) {
      toast.error("Unexpected error: " + (error instanceof Error ? error.message : String(error)));
      console.error("Unexpected error in playAudio:", error);
      setPlayingEntryId(null);
    }
  };

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <div className="flex items-center gap-2">
            <Link to="/journal/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Button>
            </Link>
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
                className={cn(
                  "hover:shadow-md transition-all cursor-pointer",
                  playingEntryId === entry.id && "ring-2 ring-green-500 shadow-md bg-green-50 dark:bg-green-900/20 animate-pulse",
                  lastPlayedEntryId === entry.id && playingEntryId !== entry.id && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                )}
                onClick={() => playAudio(entry)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <Link 
                        to={`/journal/${entry.id}`}
                        onClick={(e) => e.stopPropagation()} // Prevent triggering card click
                      >
                        <h3 className="font-medium text-lg mb-2 hover:underline">
                          {entry.content?.substring(0, 50)}
                          {entry.content && entry.content.length > 50 ? "..." : ""}
                        </h3>
                      </Link>
                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                        {entry.content?.substring(0, 200)}
                        {entry.content && entry.content.length > 200 ? "..." : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(entry.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatTime(entry.created_at)}</div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button 
                          variant={playingEntryId === entry.id ? "default" : "outline"}
                          size="sm" 
                          className={cn(
                            playingEntryId === entry.id && "bg-green-500 hover:bg-green-600",
                            lastPlayedEntryId === entry.id && !playingEntryId && "text-green-600 border-green-300"
                          )}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering card click
                            console.log("Play/stop button clicked for entry:", entry.id);
                            playAudio(entry);
                          }}
                        >
                          <Volume2 className="h-4 w-4 mr-1" />
                          {playingEntryId === entry.id ? "Stop" : "Play"}
                        </Button>
                        <Link to={`/journal/${entry.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
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
                  <Mic className="mr-2 h-4 w-4" />
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

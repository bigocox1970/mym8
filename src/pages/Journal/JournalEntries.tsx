import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Volume2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/config";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

const JournalEntries = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  const readAloud = (content: string) => {
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Journal Entries</h1>
        
        {entries.length === 0 ? (
          <p className="text-gray-500">No journal entries yet.</p>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => readAloud(entry.content)}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Read Aloud
                  </Button>
                </div>
                <p className="whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default JournalEntries; 
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, Clock, Edit, Trash } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/configManager";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
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

const JournalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hasBeenPlayed, setHasBeenPlayed] = useState(false);
  
  // Use the text-to-speech hook for better audio caching
  const { speakText, isSpeaking, stopSpeaking } = useTextToSpeech({ initialEnabled: true });

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
    
    // Clean up any speech when component unmounts
    return () => {
      stopSpeaking();
    };
  }, [id, user, navigate, stopSpeaking]);

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

  const readAloud = () => {
    if (!entry?.content?.trim()) {
      toast.error("No content to read");
      return;
    }
    
    // If already speaking, stop it
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    
    // Mark as played
    setHasBeenPlayed(true);
    
    // Play the journal entry using the hook (with caching)
    speakText(entry.content, `journal-${entry.id}`);
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

        <Card className={`transition-all ${
          isSpeaking 
            ? 'ring-2 ring-green-500 animate-pulse' 
            : hasBeenPlayed 
              ? 'ring-2 ring-green-500' 
              : ''
        } ${
          hasBeenPlayed || isSpeaking
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : ''
        } cursor-pointer`}
        onClick={readAloud}>
          <CardContent className="p-6">
            <div className="prose dark:prose-invert max-w-none">
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

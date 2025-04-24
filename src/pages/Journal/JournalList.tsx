
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { FileText, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";

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
          <Link to="/journal/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </Link>
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
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <Link to={`/journal/${entry.id}`}>
                        <h3 className="font-medium text-lg mb-2 hover:underline">
                          {entry.content?.substring(0, 50)}
                          {entry.content && entry.content.length > 50 ? "..." : ""}
                        </h3>
                      </Link>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {entry.content?.substring(0, 200)}
                        {entry.content && entry.content.length > 200 ? "..." : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(entry.created_at)}</div>
                      <div className="text-xs text-gray-500">{formatTime(entry.created_at)}</div>
                      <Link to={`/journal/${entry.id}`}>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
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

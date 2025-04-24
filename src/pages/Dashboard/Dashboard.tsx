
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { FileText, Mic, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
}

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user goals
        const { data: goalsData, error: goalsError } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (goalsError) throw goalsError;
        setGoals(goalsData as Goal[]);

        // Fetch recent journal entries
        const { data: entriesData, error: entriesError } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (entriesError) throw entriesError;
        setRecentEntries(entriesData as JournalEntry[]);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load your dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link to="/journal/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Journal Entry
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Goals</CardTitle>
              <CardDescription>Personal goals you're working toward</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading your goals...</p>
              ) : goals.length > 0 ? (
                <ul className="space-y-2">
                  {goals.map((goal) => (
                    <li key={goal.id} className="p-3 bg-gray-50 rounded-md">
                      {goal.goal_text}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">You haven't set any goals yet</p>
                  <Link to="/onboarding">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Goals
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Journal Entries</CardTitle>
              <CardDescription>Your most recent reflections</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading journal entries...</p>
              ) : recentEntries.length > 0 ? (
                <ul className="space-y-2">
                  {recentEntries.map((entry) => (
                    <li key={entry.id}>
                      <Link 
                        to={`/journal/${entry.id}`}
                        className="p-3 block bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <FileText className="mr-2 h-4 w-4 text-gray-500" />
                            <p className="truncate max-w-[200px]">
                              {entry.content?.substring(0, 50)}
                              {entry.content && entry.content.length > 50 ? "..." : ""}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">No journal entries yet</p>
                  <Link to="/journal/new">
                    <Button variant="outline" size="sm">
                      <Mic className="mr-2 h-4 w-4" />
                      Create Entry
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

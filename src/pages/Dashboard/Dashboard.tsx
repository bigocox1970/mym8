import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { FileText, Plus, BarChart } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
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

  useEffect(() => {
    const calculateProgress = async () => {
      if (!user) return;

      const now = new Date();
      const startOfDay = new Date(now.setHours(0,0,0,0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      try {
        const { data: dailyEntries } = await supabase
          .from("journal_entries")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", startOfDay.toISOString());

        const { data: weeklyEntries } = await supabase
          .from("journal_entries")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", startOfWeek.toISOString());

        const { data: monthlyEntries } = await supabase
          .from("journal_entries")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        setProgress({
          daily: Math.min((dailyEntries?.length || 0) * 25, 100),
          weekly: Math.min((weeklyEntries?.length || 0) * 15, 100),
          monthly: Math.min((monthlyEntries?.length || 0) * 5, 100)
        });
      } catch (error) {
        console.error("Error calculating progress:", error);
      }
    };

    calculateProgress();
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <CardDescription>Track your journaling progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground">
                <span>Daily Progress</span>
                <span>{progress.daily}%</span>
              </div>
              <Progress value={progress.daily} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground">
                <span>Weekly Progress</span>
                <span>{progress.weekly}%</span>
              </div>
              <Progress value={progress.weekly} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground">
                <span>Monthly Progress</span>
                <span>{progress.monthly}%</span>
              </div>
              <Progress value={progress.monthly} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Journal Entries</CardTitle>
            <CardDescription>Your most recent reflections</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-foreground">Loading journal entries...</p>
            ) : recentEntries.length > 0 ? (
              <ul className="space-y-2">
                {recentEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link 
                      to={`/journal/${entry.id}`}
                      className="p-3 block bg-muted hover:bg-accent transition-colors rounded-md"
                    >
                      <div className="flex justify-between items-center text-foreground">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-foreground" />
                          <p className="truncate max-w-[200px]">
                            {entry.content?.substring(0, 50)}
                            {entry.content && entry.content.length > 50 ? "..." : ""}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4">
                <p className="text-foreground mb-2">No journal entries yet</p>
                <Link to="/journal/new">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Entry
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;


import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { BarChart, ListTodo, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [progress, setProgress] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  });

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
          
        if (error) {
          console.error("Error fetching goals:", error);
          toast.error("Failed to load goals");
          return;
        }
        
        setGoals(data || []);
      } catch (error) {
        console.error("Error fetching goals:", error);
        toast.error("Failed to load goals");
      }
    };

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
        toast.error("Failed to load progress data");
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
    calculateProgress();
  }, [user]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link to="/goals/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Track Your Progress
              </CardTitle>
              <CardDescription>See how you're doing with your goals</CardDescription>
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

          {/* Goals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Your Goals
              </CardTitle>
              <CardDescription>Recent goals you've set</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading your goals...</p>
              ) : goals.length > 0 ? (
                <ul className="space-y-2">
                  {goals.map((goal) => (
                    <li key={goal.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                      <Link to={`/goals/${goal.id}`} className="block">
                        <p className="font-medium">{goal.goal_text}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(goal.created_at).toLocaleDateString()}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">You haven't set any goals yet</p>
                  <Link to="/goals/new">
                    <Button size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Goal
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

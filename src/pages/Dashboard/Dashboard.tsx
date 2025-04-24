
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { BarChart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  });

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
        toast.error("Failed to load progress data");
      } finally {
        setLoading(false);
      }
    };

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

        <Card className="mb-6">
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
      </div>
    </Layout>
  );
};

export default Dashboard;


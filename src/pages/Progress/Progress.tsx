import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, BarChart2, CalendarDays, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface Action {
  id: string;
  completed: boolean;
  skipped: boolean;
  frequency: string;
}

interface ActionSummary {
  total: number;
  completed: number;
  percentage: number;
}

const ProgressPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionSummary, setActionSummary] = useState<{
    daily: ActionSummary;
    weekly: ActionSummary;
    monthly: ActionSummary;
    yearly: ActionSummary;
  }>({
    daily: { total: 0, completed: 0, percentage: 0 },
    weekly: { total: 0, completed: 0, percentage: 0 },
    monthly: { total: 0, completed: 0, percentage: 0 },
    yearly: { total: 0, completed: 0, percentage: 0 }
  });

  useEffect(() => {
    if (user) {
      calculateProgress();
    }
  }, [user]);

  const calculateProgress = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all tasks
      const { data: actions, error } = await supabase
        .from("tasks")
        .select("id, completed, skipped, frequency")
        .eq("user_id", user.id);
        
      if (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load progress data");
        return;
      }

      const now = new Date();
      
      // Filter for daily actions (in the last 24 hours)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const dailyActions = actions.filter((action: Action) => action.frequency === "daily");
      
      // Filter for weekly actions (in the last 7 days)
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const weeklyActions = actions.filter((action: Action) => 
        action.frequency === "daily" || action.frequency === "weekly"
      );
      
      // Filter for monthly actions (in the last 30 days)
      const lastMonth = new Date(now);
      lastMonth.setDate(lastMonth.getDate() - 30);
      const monthlyActions = actions.filter((action: Action) => 
        action.frequency === "daily" || action.frequency === "weekly" || action.frequency === "monthly"
      );

      // All actions for yearly summary
      const yearlyActions = actions;
      
      const calculateSummary = (actionList: Action[]): ActionSummary => {
        if (!actionList.length) return { total: 0, completed: 0, percentage: 0 };
        
        const total = actionList.length;
        const completed = actionList.filter(a => a.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          total,
          completed,
          percentage
        };
      };
      
      setActionSummary({
        daily: calculateSummary(dailyActions),
        weekly: calculateSummary(weeklyActions),
        monthly: calculateSummary(monthlyActions),
        yearly: calculateSummary(yearlyActions)
      });
    } catch (error) {
      console.error("Error calculating progress:", error);
      toast.error("Failed to calculate progress");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Your Progress</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Daily Progress</CardTitle>
              </div>
              <CardDescription>Actions completed today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {actionSummary.daily.completed} of {actionSummary.daily.total} completed
                    </p>
                  </div>
                  <span className="text-2xl font-bold">{actionSummary.daily.percentage}%</span>
                </div>
                <Progress value={actionSummary.daily.percentage} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Weekly Progress</CardTitle>
              </div>
              <CardDescription>Actions completed this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {actionSummary.weekly.completed} of {actionSummary.weekly.total} completed
                    </p>
                  </div>
                  <span className="text-2xl font-bold">{actionSummary.weekly.percentage}%</span>
                </div>
                <Progress value={actionSummary.weekly.percentage} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Monthly Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Monthly Progress</CardTitle>
              </div>
              <CardDescription>Actions completed this month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {actionSummary.monthly.completed} of {actionSummary.monthly.total} completed
                    </p>
                  </div>
                  <span className="text-2xl font-bold">{actionSummary.monthly.percentage}%</span>
                </div>
                <Progress value={actionSummary.monthly.percentage} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Overall Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Overall Progress</CardTitle>
              </div>
              <CardDescription>Total actions completed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {actionSummary.yearly.completed} of {actionSummary.yearly.total} completed
                    </p>
                  </div>
                  <span className="text-2xl font-bold">{actionSummary.yearly.percentage}%</span>
                </div>
                <Progress value={actionSummary.yearly.percentage} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mt-6">
          <Link to="/actions">
            <Button>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Manage Your Actions
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default ProgressPage; 
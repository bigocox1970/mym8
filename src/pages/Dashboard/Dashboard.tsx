import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { BarChart, ListTodo, Plus, CheckCircle2, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/configManager";

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
}

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

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actionSummary, setActionSummary] = useState<{
    daily: ActionSummary;
    weekly: ActionSummary;
    monthly: ActionSummary;
  }>({
    daily: { total: 0, completed: 0, percentage: 0 },
    weekly: { total: 0, completed: 0, percentage: 0 },
    monthly: { total: 0, completed: 0, percentage: 0 }
  });
  const [assistantName, setAssistantName] = useState<string | null>(null);

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

      try {
        // Fetch all tasks
        const { data: actions, error } = await supabase
          .from("tasks")
          .select("id, completed, skipped, frequency")
          .eq("user_id", user.id);

        if (error) throw error;
        
        if (!actions || actions.length === 0) {
          setActionSummary({
            daily: { total: 0, completed: 0, percentage: 0 },
            weekly: { total: 0, completed: 0, percentage: 0 },
            monthly: { total: 0, completed: 0, percentage: 0 }
          });
          setLoading(false);
          return;
        }
        
        // Group actions by frequency
        const dailyActions = actions.filter(action => 
          action.frequency === "morning" || 
          action.frequency === "afternoon" || 
          action.frequency === "evening" || 
          action.frequency === "daily"
        );
        
        const weeklyActions = actions.filter(action => 
          action.frequency === "weekly"
        );
        
        const monthlyActions = actions.filter(action => 
          action.frequency === "monthly"
        );
        
        // Calculate completion percentages
        const calculateSummary = (actionList: Action[]): ActionSummary => {
          if (actionList.length === 0) return { total: 0, completed: 0, percentage: 0 };
          
          const completedCount = actionList.filter(action => action.completed).length;
          const percentage = Math.round((completedCount / actionList.length) * 100);
          
          return {
            total: actionList.length,
            completed: completedCount,
            percentage
          };
        };
        
        setActionSummary({
          daily: calculateSummary(dailyActions),
          weekly: calculateSummary(weeklyActions),
          monthly: calculateSummary(monthlyActions)
        });
      } catch (error) {
        console.error("Error calculating progress:", error);
        toast.error("Failed to load progress data");
      } finally {
        setLoading(false);
      }
    };

    const fetchAssistantName = async () => {
      try {
        // Use the config manager to get the assistant name
        const config = getConfig();
        
        if (config && config.assistant_name) {
          setAssistantName(config.assistant_name);
        } else {
          setAssistantName("M8"); // Default name
        }
      } catch (error) {
        console.error("Error fetching assistant name:", error);
        setAssistantName("M8"); // Default name on error
      }
    };

    fetchGoals();
    calculateProgress();
    fetchAssistantName();
  }, [user]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <MenuToggleButton />
          </div>
        </div>

        <div className="space-y-6">
          {/* Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Track Your Progress
              </CardTitle>
              <CardDescription>Completion rate of your actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium">Daily Actions</h3>
                    <p className="text-xs text-muted-foreground">
                      {actionSummary.daily.completed} of {actionSummary.daily.total} completed
                    </p>
                  </div>
                  <span className="text-sm font-medium">{actionSummary.daily.percentage}%</span>
                </div>
                <Progress value={actionSummary.daily.percentage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium">Weekly Actions</h3>
                    <p className="text-xs text-muted-foreground">
                      {actionSummary.weekly.completed} of {actionSummary.weekly.total} completed
                    </p>
                  </div>
                  <span className="text-sm font-medium">{actionSummary.weekly.percentage}%</span>
                </div>
                <Progress value={actionSummary.weekly.percentage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium">Monthly Actions</h3>
                    <p className="text-xs text-muted-foreground">
                      {actionSummary.monthly.completed} of {actionSummary.monthly.total} completed
                    </p>
                  </div>
                  <span className="text-sm font-medium">{actionSummary.monthly.percentage}%</span>
                </div>
                <Progress value={actionSummary.monthly.percentage} className="h-2" />
              </div>
              
              <div className="flex justify-end mt-2">
                <Link to="/actions">
                  <Button variant="outline" size="sm" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    View All Actions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Goals Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  Your Goals
                </CardTitle>
                <CardDescription>Recent goals you've set</CardDescription>
              </div>
              <Link to="/goals/new">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Goal
                </Button>
              </Link>
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
              
              {goals.length > 0 && (
                <div className="flex justify-end mt-4">
                  <Link to="/goals">
                    <Button variant="outline" size="sm" className="text-xs">
                      <ListTodo className="mr-1 h-3 w-3" />
                      View All Goals
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Assistant Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <CardDescription>Your personal goal coach</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Chat with {assistantName || "your AI assistant"} to help manage goals, track actions, or get motivation.
              </p>
              <div className="space-y-2">
                <p className="text-sm">Try asking:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>What actions do I need to complete today?</li>
                  <li>Create a new goal for me to exercise more</li>
                  <li>Add a weekly action to my sleep better goal</li>
                  <li>Give me some motivation to stay on track</li>
                </ul>
              </div>
              <div className="flex justify-end mt-4">
                <Link to="/assistant">
                  <Button className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Talk to Assistant
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

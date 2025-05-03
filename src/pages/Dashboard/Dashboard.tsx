import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { BarChart, ListTodo, Plus, CheckCircle2, Bot, ChevronDown, Send, User } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/configManager";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  const navigate = useNavigate();
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
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [inputText, setInputText] = useState("");

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

  // Predefined questions
  const quickQuestions = [
    { id: 1, text: "What have I got on today?" },
    { id: 2, text: "How am I doing with my goals?" },
    { id: 3, text: "Let's make some changes to my plan" },
    { id: 4, text: "I need some motivation" }
  ];

  // Function to navigate to assistant with a predefined question
  const navigateToAssistantWithQuestion = (question: string) => {
    // Store both the question and a flag to create a new conversation
    localStorage.setItem('assistantQuestion', question);
    localStorage.setItem('createNewConversation', 'true');
    localStorage.setItem('newConversationTitle', question);
    
    // Navigate to the assistant page
    navigate('/assistant');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      navigateToAssistantWithQuestion(inputText);
    }
  };

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
          {/* AI Assistant Section - Chat-like UI with input field */}
          <Card className="overflow-hidden border shadow-md">
            <CardHeader className="bg-primary/5 border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Chat with {assistantName || "M8"}
              </CardTitle>
              <CardDescription>Your personal AI goal coach</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Quick Questions Bubbles */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">Quick questions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question.id}
                      className="text-left px-3 py-2 text-sm rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToAssistantWithQuestion(question.text)}
                    >
                      {question.text}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="max-h-[150px] overflow-y-auto p-3 space-y-3 bg-muted/20 rounded-md">
                {/* Bot message */}
                <div className="flex w-max max-w-[80%] rounded-lg px-3 py-2 bg-muted text-foreground">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm">Hello! I'm {assistantName || "your AI assistant"}. How can I help you with your goals today?</p>
                    </div>
                  </div>
                </div>
                
                {/* Bot summary of tasks */}
                <div className="flex w-max max-w-[80%] rounded-lg px-3 py-2 bg-muted text-foreground">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm">You have {actionSummary.daily.total} daily actions. {actionSummary.daily.completed} completed and {actionSummary.daily.total - actionSummary.daily.completed} remaining.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center p-3 border-t bg-card">
              <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Type your question..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Ask
                </Button>
              </form>
            </CardFooter>
          </Card>

          {/* Progress Section - Now collapsible */}
          <Card>
            <Collapsible open={isProgressOpen} onOpenChange={setIsProgressOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      Track Your Progress
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProgressOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CollapsibleTrigger>
                  <CardDescription>Completion rate of your actions</CardDescription>
                </div>
              </CardHeader>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Goals Section */}
          <Card>
            <Collapsible open={isGoalsOpen} onOpenChange={setIsGoalsOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo className="h-5 w-5" />
                      Your Goals
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isGoalsOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CollapsibleTrigger>
                  <CardDescription>Recent goals you've set</CardDescription>
                </div>
                <Link to="/goals/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Goal
                  </Button>
                </Link>
              </CardHeader>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

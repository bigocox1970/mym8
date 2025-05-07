import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { BarChart, ListTodo, Plus, CheckCircle2, Bot, ChevronDown, Settings, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { getConfig } from "@/lib/configManager";
import { cn } from "@/lib/utils";
import { PERSONALITIES, PersonalityType } from "@/personalities";
import AIAssistantButton from "@/components/AIAssistantButton";

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

interface QuoteData {
  text: string;
  author: string;
  book?: string;
}

// Function to create an Amazon affiliate link for a book
const createAmazonAffiliateLink = (bookTitle: string, author: string): string => {
  // Encode the book title and author for a URL
  const encodedSearch = encodeURIComponent(`${bookTitle} ${author}`);
  // Create the Amazon search URL with affiliate ID
  return `https://www.amazon.com/s?k=${encodedSearch}&tag=b000izj08k-20`;
};

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
  const [personalityType, setPersonalityType] = useState<string>("gentle");
  const [currentQuote, setCurrentQuote] = useState<QuoteData>({ 
    text: "", 
    author: "" 
  });
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Function to get a random quote, preferring the user's personality type
  const getRandomQuote = useCallback((): QuoteData => {
    // 70% chance to use the user's personality quotes, 30% chance to use any personality
    const useUserPersonality = Math.random() < 0.7;
    let personality;
    let randomQuoteText = "";
    let authorName = "";
    let bookTitle = "";
    
    if (useUserPersonality && PERSONALITIES[personalityType as PersonalityType]) {
      // Use quotes from the user's personality type
      personality = PERSONALITIES[personalityType as PersonalityType];
      const personalityQuotes = personality.quotes;
      const randomIndex = Math.floor(Math.random() * personalityQuotes.length);
      randomQuoteText = personalityQuotes[randomIndex];
      authorName = personality.name;
      
      // Try to find a matching book if possible
      if (personality.books && personality.books.length > 0) {
        // Just choose a random book for now - in a more advanced version we could match quotes to books
        const randomBookIndex = Math.floor(Math.random() * personality.books.length);
        bookTitle = personality.books[randomBookIndex].title;
      }
    } else {
      // Use quotes from any personality type
      // Get all personality types
      const personalityTypes = Object.keys(PERSONALITIES) as PersonalityType[];
      // Select a random personality type
      const randomPersonalityType = personalityTypes[Math.floor(Math.random() * personalityTypes.length)];
      personality = PERSONALITIES[randomPersonalityType];
      // Get quotes from that personality
      const quotes = personality.quotes;
      // Select a random quote from that personality
      const randomIndex = Math.floor(Math.random() * quotes.length);
      randomQuoteText = quotes[randomIndex];
      authorName = personality.name;
      
      // Try to find a matching book if possible
      if (personality.books && personality.books.length > 0) {
        // Just choose a random book for now
        const randomBookIndex = Math.floor(Math.random() * personality.books.length);
        bookTitle = personality.books[randomBookIndex].title;
      }
    }
    
    return {
      text: randomQuoteText,
      author: authorName,
      book: bookTitle || undefined
    };
  }, [personalityType]);

  // Set up the quote rotation
  useEffect(() => {
    // Set initial quote
    setCurrentQuote(getRandomQuote());
    
    // Set up interval to change quotes
    const interval = setInterval(() => {
      // Get the quote container and text element
      const quoteContainer = document.getElementById('quote-container');
      const quoteElement = document.getElementById('quote-text');
      
      if (quoteContainer && quoteElement) {
        // First, slide the current quote out to the left
        quoteElement.classList.add('translate-x-[-100%]');
        quoteElement.classList.add('opacity-0');
        
        // Wait for exit animation to complete
        setTimeout(() => {
          // Change the quote
          setCurrentQuote(getRandomQuote());
          
          // Position the new quote off-screen to the right
          quoteElement.classList.remove('translate-x-[-100%]');
          quoteElement.classList.add('translate-x-[100%]');
          
          // Force a reflow to ensure the positioning takes effect
          void quoteElement.offsetWidth;
          
          // Slide the new quote in from the right
          setTimeout(() => {
            quoteElement.classList.remove('translate-x-[100%]');
            quoteElement.classList.remove('opacity-0');
          }, 50);
        }, 500); // Match this to the transition duration in the JSX
      } else {
        // No animation if elements not found
        setCurrentQuote(getRandomQuote());
      }
    }, 10000); // Change quote every 10 seconds (increased from 8 to give more reading time)
    
    return () => clearInterval(interval);
  }, [getRandomQuote]);

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

    const fetchAssistantConfig = async () => {
      try {
        // Use the config manager to get the assistant config
        const config = getConfig();
        
        if (config && config.assistant_name) {
          setAssistantName(config.assistant_name);
        } else {
          setAssistantName("M8"); // Default name
        }

        if (config && config.personality_type) {
          setPersonalityType(config.personality_type);
        }
      } catch (error) {
        console.error("Error fetching assistant config:", error);
        setAssistantName("M8"); // Default name on error
      }
    };
    
    // Check if user just completed onboarding, and redirect to Assistant if they did
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        // Check if there's a flag in localStorage indicating the user just completed onboarding
        const justCompletedFlag = localStorage.getItem('just_completed_onboarding');
        
        if (justCompletedFlag === 'true') {
          console.log('User just completed onboarding - redirecting to Assistant');
          
          // Clear the flag so it only shows once
          localStorage.removeItem('just_completed_onboarding');
          
          // Get the user's goals to pass along to Assistant
          const { data: userGoals } = await supabase
            .from("goals")
            .select("goal_text")
            .eq("user_id", user.id);
            
          const goalsList = userGoals?.map(g => g.goal_text) || [];
          
          // Set welcome conversation flag for the Assistant page
          localStorage.setItem('show_welcome_conversation', 'true');
          
          // Pass along goals information
          if (goalsList.length > 0) {
            localStorage.setItem('user_goals', JSON.stringify(goalsList));
          }
          
          // Clear any existing conversation data from localStorage 
          localStorage.removeItem('currentConversationId');
          
          // Force the system to delete any previous Set Up conversations
          try {
            const { data: existingSetups } = await supabase
              .from('conversations')
              .select('id, title')
              .eq('user_id', user.id)
              .eq('title', 'Set Up');
              
            if (existingSetups && existingSetups.length > 0) {
              console.log('Removing existing Set Up conversations:', existingSetups.length);
              
              // Delete previous Set Up conversations to avoid confusion
              for (const conv of existingSetups) {
                await supabase
                  .from('chat_messages')
                  .delete()
                  .eq('conversation_id', conv.id);
                  
                await supabase
                  .from('conversations')
                  .delete()
                  .eq('id', conv.id);
              }
            }
          } catch (error) {
            console.error('Error cleaning up old Set Up conversations:', error);
          }
          
          // Create a unique timestamp to ensure we get a fresh conversation
          const timestamp = new Date().getTime();
          
          // Force creation of a new conversation with the title "Set Up"
          localStorage.setItem('createNewConversation', 'true');
          localStorage.setItem('newConversationTitle', `Set Up ${timestamp}`);
          localStorage.setItem('forceNewChat', 'true');
          
          // Redirect to Assistant page
          navigate('/assistant');
          return;
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    fetchGoals();
    calculateProgress();
    fetchAssistantConfig();
    checkOnboardingStatus();
  }, [user, navigate]);

  // Function to handle Amazon link click
  const handleAmazonClick = (event: React.MouseEvent, book: string, author: string) => {
    // Prevent the click from triggering other parent element clicks
    event.stopPropagation();
    // Open the Amazon link in a new tab
    window.open(createAmazonAffiliateLink(book, author), '_blank');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <AIAssistantButton question="Can you help me understand my dashboard data and provide tips for improving my goal progress?" />
            <MenuToggleButton />
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Links Card */}
          <Card className="shadow-md">
            <CardHeader className="bg-primary/5 border-b pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <div id="quote-container" className="overflow-hidden w-full">
                  <div 
                    id="quote-text" 
                    className="transition-all duration-500 ease-in-out text-sm md:text-base font-medium italic text-primary/80"
                  >
                    <span className="block">{currentQuote.text}</span>
                    {(currentQuote.author || currentQuote.book) && (
                      <span className="text-xs text-muted-foreground block mt-1">
                        — {currentQuote.author}
                        {currentQuote.book && (
                          <>
                            , "
                            <span 
                              className="text-primary/70 hover:text-primary hover:underline cursor-pointer" 
                              onClick={(e) => handleAmazonClick(e, currentQuote.book || '', currentQuote.author)}
                              title={`Buy "${currentQuote.book}" on Amazon`}
                            >
                              {currentQuote.book}
                            </span>
                            "
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Link to="/assistant">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <Bot className="h-6 w-6" />
                    <span>MyM8</span>
                  </Button>
                </Link>
                <Link to="/goals">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <ListTodo className="h-6 w-6" />
                    <span>Goals</span>
                  </Button>
                </Link>
                <Link to="/actions">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <CheckCircle2 className="h-6 w-6" />
                    <span>Actions</span>
                  </Button>
                </Link>
                <Link to="/todo">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <ListTodo className="h-6 w-6" />
                    <span>To Do List</span>
                  </Button>
                </Link>
                <Link to="/journal">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <BookOpen className="h-6 w-6" />
                    <span>Journal</span>
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <Settings className="h-6 w-6" />
                    <span>Settings</span>
                  </Button>
                </Link>
                <Link to="/help">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <BookOpen className="h-6 w-6" />
                    <span>Help</span>
                  </Button>
                </Link>
                <Link to="/logs">
                  <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-muted/50">
                    <ListTodo className="h-6 w-6" />
                    <span>Activity Log</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
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
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

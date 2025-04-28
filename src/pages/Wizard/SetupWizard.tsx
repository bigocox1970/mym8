import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Sparkles, ArrowRight, ArrowLeft, Bot, Heart, Check, X, Loader } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { updateConfig } from "@/lib/configManager";

const ISSUES = [
  { id: "depression", label: "Depression" },
  { id: "anxiety", label: "Anxiety" },
  { id: "lethargy", label: "Lethargy/Low energy" },
  { id: "anger", label: "Anger management" },
  { id: "procrastination", label: "Procrastination" },
  { id: "focus", label: "Difficulty focusing" },
  { id: "stress", label: "Stress" },
  { id: "sleep", label: "Sleep problems" },
  { id: "motivation", label: "Low motivation" },
  { id: "habits", label: "Breaking bad habits" },
  { id: "other", label: "Other" }
];

// Map issues to appropriate goal text
const ISSUE_TO_GOAL_MAP = {
  "depression": "Help with depression",
  "anxiety": "Help with anxiety",
  "lethargy": "Improve energy levels",
  "anger": "Better anger management",
  "procrastination": "Reduce procrastination",
  "focus": "Improve focus and concentration",
  "stress": "Reduce stress",
  "sleep": "Better sleep",
  "motivation": "Increase motivation",
  "habits": "Break unhealthy habits",
  "other": "Custom goal" // Will be replaced with the actual text from otherIssue
};

const GOALS = [
  { id: "better_sleep", label: "Better sleep" },
  { id: "improve_mood", label: "Improve mood" },
  { id: "manage_depression", label: "Help with depression" },
  { id: "manage_anxiety", label: "Help with anxiety" },
  { id: "reduce_procrastination", label: "Help with procrastination" },
  { id: "addiction_help", label: "Help with addiction" },
  { id: "build_habits", label: "Form good habits" },
  { id: "break_habits", label: "Ditch bad habits" },
  { id: "increase_productivity", label: "Increase productivity" },
  { id: "self_care", label: "Better self-care" },
  { id: "reduce_stress", label: "Reduce stress" },
  { id: "other", label: "Other (specify)" }
];

const PERSONALITY_TYPES = [
  { value: "direct", label: "Direct and forthright" },
  { value: "gentle", label: "Gentle and understanding" },
  { value: "sarcastic", label: "Slightly sarcastic but to the point" },
  { value: "no_prisoners", label: "Take no prisoners" },
  { value: "alan_watts", label: "Alan Watts - Philosophical, reflective, Zen-inspired" },
  { value: "earl_nightingale", label: "Earl Nightingale - Motivational, success-oriented, inspirational" },
  { value: "wayne_dyer", label: "Wayne Dyer - Spiritual, self-empowerment, positive thinking" },
  { value: "esther_hicks", label: "Esther Hicks - Law of attraction, spiritual well-being, alignment" },
];

const TOUGHNESS_LEVELS = [
  { value: "gentle", label: "Gentle & supportive - I need compassion" },
  { value: "balanced", label: "Balanced - Mix of support and push" },
  { value: "firm", label: "Firm - Hold me accountable" },
  { value: "tough", label: "Tough - Call me out on excuses" },
];

const VOICE_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "neutral", label: "Gender-neutral" },
];

// Define an interface for a Goal
interface Goal {
  id: string;
  user_id: string;
  goal_text: string;
  description: string | null;
  created_at?: string;
}

const SetupWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const forceRun = new URLSearchParams(location.search).get('force') === 'true';
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [otherIssue, setOtherIssue] = useState("");
  const [assistantName, setAssistantName] = useState("M8");
  const [userNickname, setUserNickname] = useState("");
  const [personality, setPersonality] = useState("gentle");
  const [voiceGender, setVoiceGender] = useState("neutral");
  const [toughness, setToughness] = useState("balanced");
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [redirecting, setRedirecting] = useState(false);
  const [keepExistingData, setKeepExistingData] = useState(false);
  const [loadingExistingData, setLoadingExistingData] = useState(false);
  const [existingGoals, setExistingGoals] = useState<Goal[]>([]);

  useEffect(() => {
    // Check if user has already completed the wizard
    const checkWizardStatus = async () => {
      if (!user) return;

      // Skip check if force parameter is present
      if (forceRun) return;

      try {
        // Fetch the user's profile data including their selected issues and preferences
        const { data, error } = await supabase
          .from("profiles")
          .select("wizard_completed, selected_issues, other_issue, nickname, assistant_toughness")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        // Check localStorage for the keep_existing_data preference
        const keepDataPref = localStorage.getItem('wizard_keep_existing_data');
        if (keepDataPref === 'true') {
          setKeepExistingData(true);
          
          // Load existing selections if available
          if (data) {
            // Load selected issues
            if (data.selected_issues && Array.isArray(data.selected_issues)) {
              setSelectedIssues(data.selected_issues);
            }
            
            // Load other issue text
            if (data.other_issue) {
              setOtherIssue(data.other_issue);
              // Make sure 'other' is selected if there's text
              if (!selectedIssues.includes('other')) {
                setSelectedIssues(prev => [...prev, 'other']);
              }
            }
            
            // Load nickname
            if (data.nickname) {
              setUserNickname(data.nickname);
            }
            
            // Load toughness preference
            if (data.assistant_toughness) {
              setToughness(data.assistant_toughness);
            }
          }
          
          // Load AI assistant preferences
          loadAssistantPreferences();
          
          // Also load existing goals
          loadExistingGoals();
        } else {
          setKeepExistingData(false);
        }

        if (data && data.wizard_completed) {
          // User has already completed the wizard
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking wizard status:", error);
      }
    };

    checkWizardStatus();
  }, [user, navigate, forceRun]);
  
  // Load existing goals when keepExistingData is set to true
  useEffect(() => {
    if (keepExistingData && user) {
      loadExistingGoals();
    }
  }, [keepExistingData, user]);
  
  // Function to load the user's existing goals
  const loadExistingGoals = async () => {
    if (!user) return;
    
    try {
      setLoadingExistingData(true);
      
      // Check if goals table exists first
      const { error: goalsExistError } = await supabase
        .from("goals")
        .select("count")
        .limit(1);
        
      // If table doesn't exist, just return without error
      if (goalsExistError) {
        console.log("Goals table doesn't exist yet, skipping load");
        return;
      }
      
      // Fetch user's existing goals
      const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      if (goals && goals.length > 0) {
        setExistingGoals(goals as Goal[]);
        
        // Map existing goals to predefined goals for selection
        const mappedGoals = mapGoalsToSelections(goals as Goal[]);
        setSelectedIssues(mappedGoals.selectedGoals);
        
        // If there's a custom goal that doesn't match predefined goals
        if (mappedGoals.customGoal) {
          setSelectedIssues(prev => [...prev, 'other']);
          setOtherIssue(mappedGoals.customGoal);
        }
      }
    } catch (error) {
      console.error("Error loading existing goals (continuing with defaults):", error);
    } finally {
      setLoadingExistingData(false);
    }
  };
  
  // Function to load assistant preferences
  const loadAssistantPreferences = async () => {
    if (!user) return;
    
    try {
      // Use the configManager to get settings instead of direct DB access
      const currentConfig = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'config')
        .single();
        
      if (currentConfig?.data?.value) {
        const config = currentConfig.data.value;
        
        // Set assistant name if available
        if (config.assistant_name) {
          setAssistantName(config.assistant_name);
        }
        
        // Set personality type if available
        if (config.personality_type) {
          setPersonality(config.personality_type);
        }
        
        // Set voice gender if available
        if (config.voice_gender) {
          setVoiceGender(config.voice_gender);
        }
      }
    } catch (error) {
      console.error("Error loading assistant preferences (continuing with defaults):", error);
      // Don't throw the error, just continue with defaults
    }
  };

  // Map existing goals to the predefined goals list
  const mapGoalsToSelections = (goals: Goal[]) => {
    const result = {
      selectedGoals: [] as string[],
      customGoal: ''
    };
    
    // Create a map of lowercase goal text to goal IDs for easier matching
    const goalMap = GOALS.reduce((acc, goal) => {
      acc[goal.label.toLowerCase()] = goal.id;
      return acc;
    }, {} as Record<string, string>);
    
    // Check each user goal against our predefined goals
    goals.forEach(goal => {
      const goalTextLower = goal.goal_text.toLowerCase();
      
      // If the goal matches one of our predefined goals, select it
      if (goalMap[goalTextLower]) {
        if (!result.selectedGoals.includes(goalMap[goalTextLower])) {
          result.selectedGoals.push(goalMap[goalTextLower]);
        }
      } else {
        // If it's a custom goal, save it
        // We just take the first custom goal we find
        if (!result.customGoal) {
          result.customGoal = goal.goal_text;
        }
      }
    });
    
    return result;
  };

  const handleIssueToggle = (issueId: string) => {
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId) 
        : [...prev, issueId]
    );
  };

  const handleGoalToggle = (goalId: string) => {
    setSelectedIssues(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId) 
        : [...prev, goalId]
    );
  };

  const getProgressPercentage = () => {
    return (step / 6) * 100;
  };

  const validateCurrentStep = () => {
    switch (step) {
      case 1:
        // At least one issue must be selected
        if (selectedIssues.length === 0) return false;
        // If "other" is selected, the text field must not be empty
        if (selectedIssues.includes("other") && !otherIssue.trim()) return false;
        return true;
      case 2: // Now this is the Assistant Name step (previously step 3)
        return assistantName.trim() !== "";
      case 3: // Was step 4, no validation needed
        return true;
      case 4: // Was step 5
        return personality !== "";
      case 5: // Was step 6
        return voiceGender !== "";
      case 6: // Was step 7
        return toughness !== "";
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (step < 6) {
      setStep(step + 1);
    } else if (validateCurrentStep()) {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Function to create goals based on selected issues
  const createGoalsFromIssues = async () => {
    if (!user || selectedIssues.length === 0) return [];
    
    try {
      const goals: { user_id: string; goal_text: string; description: string | null }[] = [];
      
      // Create a goal for each selected issue
      for (const issueId of selectedIssues) {
        let goalText = ISSUE_TO_GOAL_MAP[issueId as keyof typeof ISSUE_TO_GOAL_MAP] || `Help with ${issueId}`;
        
        // For "other" issue, use the text provided by the user
        if (issueId === "other" && otherIssue.trim()) {
          goalText = `Help with ${otherIssue.trim()}`;
        }
        
        goals.push({
          user_id: user.id,
          goal_text: goalText,
          description: `This goal was automatically created to help you with ${issueId === "other" ? otherIssue : ISSUES.find(i => i.id === issueId)?.label.toLowerCase() || issueId}.`
        });
      }
      
      // Insert the goals into the database
      const { data, error } = await supabase
        .from("goals")
        .insert(goals)
        .select();
      
      if (error) throw error;
      
      return data as Goal[];
    } catch (error) {
      console.error("Error creating goals from issues:", error);
      toast.error("Failed to create goals");
      return [];
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Create goals based on selected issues
      const createdGoals = await createGoalsFromIssues();
      
      // Convert selected issues to array for database storage
      const issuesArray = selectedIssues.map(id => id);
      
      // Save wizard data to profile
      const { error } = await supabase
        .from("profiles")
        .update({
          wizard_completed: true,
          selected_issues: issuesArray,
          other_issue: selectedIssues.includes("other") ? otherIssue : null,
          nickname: userNickname || null,
          assistant_toughness: toughness
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // Save assistant preferences
      await updateConfig({
        assistant_name: assistantName,
        personality_type: personality,
        voice_gender: voiceGender
      });
      
      // Show success message with goals created
      if (createdGoals.length > 0) {
        const goalsList = createdGoals.map(goal => `"${goal.goal_text}"`).join(", ");
        toast.success(`Created ${createdGoals.length} goals: ${goalsList}`);
      }
      
      // Mark wizard as completed
      setCompleted(true);
      
      // Start countdown to dashboard
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Clean up the interval if user manually closes
      return () => clearInterval(countdownInterval);

    } catch (error) {
      console.error("Error saving wizard data:", error);
      toast.error("There was a problem completing your setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipCountdown = () => {
    setRedirecting(true);
    navigate("/dashboard");
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Can MyM8 help you with any of the following?</CardTitle>
              <CardDescription>
                Select the issues you'd like help with (select all that apply). MyM8 will automatically create goals for you based on your selections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ISSUES.map((issue) => (
                  <div key={issue.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`issue-${issue.id}`} 
                      checked={selectedIssues.includes(issue.id)}
                      onCheckedChange={() => handleIssueToggle(issue.id)}
                    />
                    <Label htmlFor={`issue-${issue.id}`} className="cursor-pointer">
                      {issue.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedIssues.includes("other") && (
                <div className="mt-4">
                  <Label htmlFor="other-issue">Please specify:</Label>
                  <Input
                    id="other-issue"
                    value={otherIssue}
                    onChange={(e) => setOtherIssue(e.target.value)}
                    placeholder="Describe how else MyM8 can help you"
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </>
        );
      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Name your assistant</CardTitle>
              <CardDescription>
                What would you like to call your MyM8?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="assistant-name">Assistant Name</Label>
                  <Input
                    id="assistant-name"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="e.g., M8, Buddy, Coach, etc."
                    maxLength={20}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is how your assistant will refer to itself when chatting with you
                  </p>
                </div>
              </div>
            </CardContent>
          </>
        );
      case 3:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">What should we call you?</CardTitle>
              <CardDescription>
                What would you like your MyM8 to call you? (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="user-nickname">Your Nickname</Label>
                  <Input
                    id="user-nickname"
                    value={userNickname}
                    onChange={(e) => setUserNickname(e.target.value)}
                    placeholder="e.g., your name or nickname"
                    maxLength={30}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is how your assistant will address you (leave blank for no specific name)
                  </p>
                </div>
              </div>
            </CardContent>
          </>
        );
      case 4:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Assistant Personality</CardTitle>
              <CardDescription>
                What personality would you like your MyM8 to have?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={personality} onValueChange={setPersonality} className="space-y-3">
                {PERSONALITY_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={`personality-${type.value}`} />
                    <Label htmlFor={`personality-${type.value}`} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </>
        );
      case 5:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Voice Preference</CardTitle>
              <CardDescription>
                What gender voice would you like your MyM8 to have?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={voiceGender} onValueChange={setVoiceGender} className="space-y-3">
                {VOICE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`voice-${option.value}`} />
                    <Label htmlFor={`voice-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-muted-foreground mt-4">
                This will be used for any voice interactions with your assistant
              </p>
            </CardContent>
          </>
        );
      case 6:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Assistant Toughness</CardTitle>
              <CardDescription>
                How tough do you want your MyM8 to be with you?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={toughness} onValueChange={setToughness} className="space-y-3">
                {TOUGHNESS_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={level.value} id={`toughness-${level.value}`} />
                    <Label htmlFor={`toughness-${level.value}`} className="cursor-pointer">
                      {level.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </>
        );
      default:
        return null;
    }
  };

  if (completed) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <Card className="w-full max-w-md relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2" 
              onClick={handleSkipCountdown}
              disabled={redirecting}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardHeader className="text-center">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-2xl font-bold">Great! You're all set!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg font-medium">Mark this day as the start of the rest of your life!</p>
              <p>With your MyM8 at your side, there is nothing you cannot achieve!</p>
              <div className="flex justify-center pt-4">
                <Heart className="text-red-500 h-8 w-8 animate-pulse" />
              </div>
              <div className="mt-6 text-sm text-muted-foreground">
                {redirecting ? (
                  <p>Redirecting to dashboard...</p>
                ) : (
                  <p>Redirecting to dashboard in <span className="font-semibold">{countdown}</span> seconds...</p>
                )}
                <Progress value={(countdown / 10) * 100} className="h-1 mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-full max-w-3xl">
          <div className="flex items-center mb-8">
            <Sparkles className="mr-2 h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">MyM8 Setup Wizard</h1>
          </div>
          
          <div className="mb-6">
            <Progress value={getProgressPercentage()} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Step {step} of 6
            </p>
          </div>

          <Card className="w-full">
            {renderStepContent()}
            <CardFooter className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={step === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={isSubmitting || !validateCurrentStep()}
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : step === 6 ? (
                  <>
                    Complete
                    <Check className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SetupWizard; 
import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Bot, Send, User, Loader2, Mic, MicOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Add SpeechRecognition type definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Goal {
  id: string;
  goal_text: string;
  description: string | null;
}

interface Action {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  skipped: boolean;
  goal_id: string;
  frequency: string;
}

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! I'm your M8 AI assistant. How can I help you today? You can ask me about your tasks, add new goals, or get encouragement to achieve your objectives.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Get user goals
  const { data: goals } = useQuery({
    queryKey: ['goals-for-ai'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching goals:', error);
        return [];
      }
      
      return data as Goal[];
    },
    enabled: !!user,
  });
  
  // Get user actions
  const { data: actions, refetch: refetchActions } = useQuery({
    queryKey: ['actions-for-ai'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching actions:', error);
        return [];
      }
      
      return data as Action[];
    },
    enabled: !!user,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    let recognition: SpeechRecognition | null = null;
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
          
        setInput(transcript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast.error("Speech recognition failed. Try again or type your message.");
      };
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!isListening) {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.start();
        setIsListening(true);
        
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
            
          setInput(transcript);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
      } else {
        toast.error("Speech recognition is not supported in your browser.");
      }
    } else {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.stop();
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    try {
      // Process the message with OpenRouter API
      const response = await processUserMessage(input, goals || [], actions || []);
      
      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      
      // If the AI performed an action, display a toast and potentially navigate
      if (response.action) {
        toast.success(response.action);
        
        // Refresh data if needed
        if (response.refresh) {
          refetchActions();
        }
        
        // Navigate if needed
        if (response.navigate) {
          navigate(response.navigate);
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Failed to process your request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to process user messages and interact with OpenRouter API
  const processUserMessage = async (
    message: string, 
    userGoals: Goal[], 
    userActions: Action[]
  ) => {
    try {
      // Check if OpenRouter API key is configured
      const { data: config, error: configError } = await supabase
        .from('llm_configs')
        .select('*')
        .eq('function_name', 'openrouter')
        .single();
      
      if (configError || !config) {
        throw new Error("OpenRouter API configuration not found");
      }
      
      // Prepare context for the AI
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format goals and actions for context
      const goalsContext = userGoals.map(g => 
        `Goal: ${g.goal_text}${g.description ? ` - ${g.description}` : ''} (ID: ${g.id})`
      ).join('\n');
      
      const actionsContext = userActions.map(a => 
        `Action: ${a.title}${a.description ? ` - ${a.description}` : ''} (Status: ${a.completed ? 'Completed' : 'Pending'}, Frequency: ${a.frequency}, Goal ID: ${a.goal_id})`
      ).join('\n');
      
      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-opus:beta", // You can change this to whatever model you prefer
          messages: [
            {
              role: "system",
              content: `You are an AI assistant for a goal-tracking application called "My M8". Today is ${formattedDate}.
              
The user has the following goals:
${goalsContext || "No goals created yet."}

The user has the following actions:
${actionsContext || "No actions created yet."}

Your job is to:
1. Answer questions about the user's goals and actions
2. Provide encouragement and motivation
3. Process commands to add or modify goals and actions

If the user wants to create a new goal, respond with: {"action": "create_goal", "data": {"goal_text": "...", "description": "..." }}
If the user wants to add an action to a goal, respond with: {"action": "add_action", "data": {"goal_id": "...", "title": "...", "description": "...", "frequency": "..."}}
If the user wants to mark an action as complete, respond with: {"action": "complete_action", "data": {"action_id": "..."}}

Only use these formats for those specific intents. Otherwise, respond conversationally to help and encourage the user.`
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      const aiResponse = result.choices[0].message.content;
      
      // Check if the response contains a JSON action command
      try {
        if (aiResponse.includes('{"action":')) {
          const actionMatch = aiResponse.match(/\{.*?\}/s);
          if (actionMatch) {
            const actionCommand = JSON.parse(actionMatch[0]);
            
            // Process the different action types
            if (actionCommand.action === "create_goal" && actionCommand.data) {
              await handleCreateGoal(actionCommand.data.goal_text, actionCommand.data.description);
              return {
                message: `I've created a new goal: "${actionCommand.data.goal_text}"`,
                action: "New goal created successfully!",
                refresh: true,
                navigate: "/goals"
              };
            } 
            else if (actionCommand.action === "add_action" && actionCommand.data) {
              await handleAddAction(
                actionCommand.data.goal_id,
                actionCommand.data.title,
                actionCommand.data.description,
                actionCommand.data.frequency || "daily"
              );
              return {
                message: `I've added a new action: "${actionCommand.data.title}" to your goal`,
                action: "New action added successfully!",
                refresh: true
              };
            }
            else if (actionCommand.action === "complete_action" && actionCommand.data) {
              await handleCompleteAction(actionCommand.data.action_id);
              return {
                message: "I've marked that action as completed. Great job!",
                action: "Action marked as completed!",
                refresh: true
              };
            }
          }
        }
        
        // If no action command, return the plain response
        return { message: aiResponse };
      } catch (error) {
        console.error("Error parsing AI action:", error);
        return { message: aiResponse };
      }
    } catch (error) {
      console.error("Error in processUserMessage:", error);
      return { 
        message: "I'm having trouble connecting to my AI capabilities right now. Please try again later."
      };
    }
  };

  // Handle creating a new goal
  const handleCreateGoal = async (goalText: string, description: string | null) => {
    if (!user) throw new Error("User must be logged in to create a goal");
    
    const { data, error } = await supabase
      .from("goals")
      .insert([{ 
        goal_text: goalText, 
        description: description || null,
        user_id: user.id 
      }])
      .select();
      
    if (error) throw error;
    return data;
  };

  // Handle adding a new action to a goal
  const handleAddAction = async (
    goalId: string,
    title: string,
    description: string | null,
    frequency: string
  ) => {
    if (!user) throw new Error("User must be logged in to add an action");
    
    const { data, error } = await supabase
      .from("tasks")
      .insert([{ 
        title: title,
        description: description || null,
        goal_id: goalId,
        completed: false,
        frequency: frequency,
        user_id: user.id
      }])
      .select();
      
    if (error) throw error;
    return data;
  };

  // Handle marking an action as complete
  const handleCompleteAction = async (actionId: string) => {
    if (!user) throw new Error("User must be logged in to complete an action");
    
    const currentTime = new Date().toISOString();
    
    // Update the task
    const { error } = await supabase
      .from("tasks")
      .update({ 
        completed: true,
        skipped: false,
        updated_at: currentTime
      })
      .eq("id", actionId);
      
    if (error) throw error;
    
    // Log the activity
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        task_id: actionId,
        completed: true,
        timestamp: currentTime
      });
      
    if (logError) throw logError;
  };

  return (
    <Layout>
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
            <p className="text-muted-foreground">
              Chat with your goal-tracking AI assistant
            </p>
          </div>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              M8 Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 mb-4 max-h-[60vh] overflow-y-auto p-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-max max-w-[90%] rounded-lg px-4 py-3",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {message.role === "user" ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <p className="text-xs opacity-50 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question or give a command..."
                  className="resize-none"
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={toggleListening}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                
                <Button type="submit" disabled={isProcessing || !input.trim()}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AIAssistant; 
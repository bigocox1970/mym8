import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Bot, Send, User, Loader2, Mic, MicOff, Trash2, Plus, MoreVertical, Menu, History, ArrowLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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

interface Conversation {
  id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
}

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
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

  // Fetch user conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('last_message_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching conversations:', error);
          return;
        }
        
        setConversations(data || []);
        
        // If no current conversation is selected and there are conversations, select the most recent one
        if (!currentConversationId && data && data.length > 0) {
          setCurrentConversationId(data[0].id);
          loadMessages(data[0].id);
        } else if (!currentConversationId) {
          // If no conversations exist, create a new one
          createNewConversation("New Conversation");
        }
      } catch (error) {
        console.error('Error in fetchConversations:', error);
      }
    };
    
    fetchConversations();
  }, [user, currentConversationId]);

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(loadedMessages);
      } else {
        // If no messages, add a welcome message
        const welcomeMessage: Message = {
          id: "welcome",
          role: "assistant",
          content: "Hi there! I'm your M8 AI assistant. How can I help you today? You can ask me about your tasks, add new goals, or get encouragement to achieve your objectives.",
          timestamp: new Date(),
        };
        
        setMessages([welcomeMessage]);
        
        // Save welcome message to database
        await supabase
          .from('chat_messages')
          .insert({
            id: welcomeMessage.id,
            user_id: user.id,
            role: welcomeMessage.role,
            content: welcomeMessage.content,
            timestamp: welcomeMessage.timestamp.toISOString(),
            conversation_id: conversationId
          });
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  };

  // Create a new conversation
  const createNewConversation = async (title: string = "New Conversation") => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title,
          last_message_at: new Date().toISOString()
        })
        .select('*')
        .single();
        
      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }
      
      setConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([]);
      setShowNewConversationDialog(false);
      setNewConversationTitle("");
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: "welcome-" + Date.now().toString(),
        role: "assistant",
        content: "Hi there! I'm your M8 AI assistant. How can I help you today? You can ask me about your tasks, add new goals, or get encouragement to achieve your objectives.",
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // Save welcome message to database
      await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: welcomeMessage.role,
          content: welcomeMessage.content,
          timestamp: welcomeMessage.timestamp.toISOString(),
          conversation_id: data.id
        });
    } catch (error) {
      console.error('Error in createNewConversation:', error);
    }
  };

  // Delete current conversation
  const deleteCurrentConversation = async () => {
    if (!user || !currentConversationId) return;
    
    try {
      // First delete all messages in this conversation
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', currentConversationId);
        
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return;
      }
      
      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', currentConversationId);
        
      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        return;
      }
      
      // Update UI
      setConversations(prev => prev.filter(conv => conv.id !== currentConversationId));
      
      // Select another conversation or create a new one
      if (conversations.length > 1) {
        const nextConversation = conversations.find(conv => conv.id !== currentConversationId);
        if (nextConversation) {
          setCurrentConversationId(nextConversation.id);
          loadMessages(nextConversation.id);
        }
      } else {
        createNewConversation("New Conversation");
      }
      
      setShowDeleteDialog(false);
      toast.success("Conversation deleted");
    } catch (error) {
      console.error('Error in deleteCurrentConversation:', error);
      toast.error("Failed to delete conversation");
    }
  };

  // Clear current conversation (keep conversation but remove messages)
  const clearCurrentConversation = async () => {
    if (!user || !currentConversationId) return;
    
    try {
      // Delete all messages in this conversation
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', currentConversationId);
        
      if (error) {
        console.error('Error clearing messages:', error);
        toast.error("Failed to clear conversation");
        return;
      }
      
      // Reset UI
      setMessages([]);
      
      // Add new welcome message
      const welcomeMessage: Message = {
        id: "welcome-" + Date.now().toString(),
        role: "assistant",
        content: "I've cleared our conversation. How can I help you now?",
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // Save welcome message to database
      await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: welcomeMessage.role,
          content: welcomeMessage.content,
          timestamp: welcomeMessage.timestamp.toISOString(),
          conversation_id: currentConversationId
        });
      
      toast.success("Conversation cleared");
    } catch (error) {
      console.error('Error in clearCurrentConversation:', error);
      toast.error("Failed to clear conversation");
    }
  };

  // Update conversation title
  const updateConversationTitle = async (conversationId: string, newTitle: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversationId);
        
      if (error) {
        console.error('Error updating conversation title:', error);
        return;
      }
      
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, title: newTitle } : conv
      ));
    } catch (error) {
      console.error('Error in updateConversationTitle:', error);
    }
  };

  // Update conversation last message time
  const updateConversationLastMessageTime = async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
        
      if (error) {
        console.error('Error updating conversation last message time:', error);
      }
    } catch (error) {
      console.error('Error in updateConversationLastMessageTime:', error);
    }
  };

  // Save message to database
  const saveMessage = async (message: Message, conversationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
          conversation_id: conversationId
        });
        
      if (error) {
        console.error('Error saving message:', error);
      }
      
      // Update conversation last message time
      await updateConversationLastMessageTime(conversationId);
      
      // Update conversation title if it's the first user message
      if (message.role === 'user' && messages.length <= 1) {
        const title = message.content.length > 30 
          ? message.content.substring(0, 30) + '...' 
          : message.content;
        await updateConversationTitle(conversationId, title);
      }
    } catch (error) {
      console.error('Error in saveMessage:', error);
    }
  };

  // Fix the messagesEndRef scrolling behavior
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
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
    if (!input.trim() || isProcessing || !currentConversationId) return;
    
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
    
    // Save user message to database
    await saveMessage(userMessage, currentConversationId);
    
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
      
      // Save AI message to database
      await saveMessage(aiMessage, currentConversationId);
      
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
      
      // Save error message to database
      await saveMessage(errorMessage, currentConversationId);
      
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
      // Format the date for the assistant
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Check if OpenRouter API key is configured
      const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        throw new Error("OpenRouter API key not found in environment variables");
      }

      // Get AI assistant configuration
      const { data: config, error } = await supabase
        .from('llm_configs')
        .select('*')
        .eq('function_name', 'openrouter')
        .single();
      
      if (error || !config) {
        throw new Error("OpenRouter API configuration not found");
      }

      if (!config.enable_ai) {
        return { message: "AI assistant is currently disabled. You can enable it in the settings." };
      }

      // Prepare context for the assistant
      const goalsContext = userGoals.map(g => 
        `Goal: ${g.goal_text}${g.description ? ` - ${g.description}` : ''} (ID: ${g.id})`
      ).join('\n');
      
      const actionsContext = userActions.map(a => 
        `Action: ${a.title}${a.description ? ` - ${a.description}` : ''} (Status: ${a.completed ? 'Completed' : 'Pending'}, Frequency: ${a.frequency}, Goal ID: ${a.goal_id})`
      ).join('\n');
      
      // Get assistant name or use default
      const assistantName = config.assistant_name || "M8";
      
      // Use custom pre-prompt if available or fall back to default
      const prePrompt = config.pre_prompt || 
        `You are an AI assistant for a goal-tracking application. Your name is ${assistantName}. Today is ${formattedDate}.`;
      
      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: config.llm_provider || "anthropic/claude-3-opus:beta",
          messages: [
            {
              role: "system",
              content: `${prePrompt}
              
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

  // Get current conversation title
  const getCurrentConversationTitle = () => {
    if (!currentConversationId) return "New Conversation";
    
    const conversation = conversations.find(c => c.id === currentConversationId);
    return conversation?.title || "Untitled Conversation";
  };

  // Add this CSS class
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex items-center w-full justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Assistant</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Chat with your goal-tracking AI assistant
              </p>
            </div>
            
            {/* Mobile Menu Button - Show/Hide our own menu */}
            <Sheet open={showMobileNav} onOpenChange={setShowMobileNav}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Menu</h2>
                  </div>
                  <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/dashboard');
                            setShowMobileNav(false);
                          }}
                        >
                          Dashboard
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/goals');
                            setShowMobileNav(false);
                          }}
                        >
                          Goals
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/actions');
                            setShowMobileNav(false);
                          }}
                        >
                          Actions
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/logs');
                            setShowMobileNav(false);
                          }}
                        >
                          Activity Log
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/journal');
                            setShowMobileNav(false);
                          }}
                        >
                          Journal
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start bg-muted"
                          onClick={() => {
                            setShowMobileNav(false);
                          }}
                        >
                          AI Assistant
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate('/settings');
                            setShowMobileNav(false);
                          }}
                        >
                          Settings
                        </Button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-4 flex-1 overflow-hidden">
          {/* Conversations sidebar - can be shown on all screens */}
          <Card className={cn(
            "border-none shadow-md overflow-hidden transition-all duration-200 h-full",
            showChatHistory 
              ? "block fixed inset-0 z-50 md:relative md:z-auto md:col-span-1" 
              : "hidden md:block md:col-span-1"
          )}>
            <CardHeader className="px-3 py-2 sm:py-4 flex flex-row items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setShowChatHistory(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base">Conversations</CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowNewConversationDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <div className="overflow-y-auto no-scrollbar h-[calc(100vh-14rem)]">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <div 
                    key={conversation.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                      currentConversationId === conversation.id ? "bg-gray-100 dark:bg-gray-800" : ""
                    )}
                    onClick={() => {
                      setCurrentConversationId(conversation.id);
                      loadMessages(conversation.id);
                      setShowChatHistory(false);
                    }}
                  >
                    <div className="flex items-center space-x-2 truncate w-full">
                      <Bot className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{conversation.title || "Untitled Conversation"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-muted-foreground">
                  <p>No conversations yet</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setShowNewConversationDialog(true)}
                  >
                    Start a new chat
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Main chat area */}
          <Card className={cn(
            "border-none shadow-md flex flex-col h-full relative overflow-hidden",
            showChatHistory ? "hidden md:flex md:col-span-3" : "md:col-span-3"
          )}>
            <CardHeader className="px-2 sm:px-4 py-2 sm:py-3 flex flex-row items-center justify-between border-b shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div className="flex items-center space-x-2">
                  {/* Conversation selector for mobile */}
                  <div className="block md:hidden">
                    <Select
                      value={currentConversationId || ""}
                      onValueChange={(value) => {
                        if (value === "new") {
                          setShowNewConversationDialog(true);
                        } else if (value) {
                          setCurrentConversationId(value);
                          loadMessages(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px] sm:w-[180px]" aria-label="Select conversation">
                        <SelectValue placeholder="Select chat" />
                      </SelectTrigger>
                      <SelectContent>
                        {conversations.map((conversation) => (
                          <SelectItem key={conversation.id} value={conversation.id}>
                            {conversation.title || "Untitled Conversation"}
                          </SelectItem>
                        ))}
                        <SelectItem value="new" className="text-primary">
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            New Chat
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Title for desktop */}
                  <CardTitle className="hidden md:block text-base">
                    {getCurrentConversationTitle()}
                  </CardTitle>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowNewConversationDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearCurrentConversation}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowChatHistory(true)}
                    className="md:hidden"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Chat History
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 pb-40">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-max max-w-[85%] sm:max-w-[90%] rounded-lg px-3 sm:px-4 py-2 sm:py-3",
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 hidden sm:block">
                        {message.role === "user" ? (
                          <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm whitespace-pre-line break-words">{message.content}</p>
                        <p className="text-[10px] sm:text-xs opacity-50 mt-1">
                          {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t p-2 sm:p-3 shadow-md">
              <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message your assistant..."
                    className="resize-none min-h-[45px] sm:min-h-[60px]"
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
                  
                  <Button type="submit" disabled={isProcessing || !input.trim()} className="px-3 sm:px-4">
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Processing...</span>
                        <span className="sm:hidden">Wait</span>
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
      
      {/* New Conversation Dialog */}
      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Start a new conversation with your AI assistant
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Conversation title (optional)"
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewConversationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createNewConversation(newConversationTitle)}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteCurrentConversation}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AIAssistant; 
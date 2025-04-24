import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Bot, Send, User, Loader2, Mic, MicOff, Trash2, Plus, MoreVertical, Menu, History, ArrowLeft, Volume2, VolumeX, X } from "lucide-react";
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
import { v4 as uuidv4 } from 'uuid';

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
  timestamp: string;
  conversation_id?: string;
  created_at?: string;
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

// Add this interface before the AIAssistant component
interface LLMConfig {
  assistant_name?: string;
  personality_type?: string;
  pre_prompt?: string;
  llm_provider?: string;
  voice_gender?: string;
  voice_service?: string;
  elevenlabs_voice?: string;
  elevenlabs_api_key?: string;
}

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
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
          loadMessages();
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

  // Extract fetchConversations to be used elsewhere in the component
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
    } catch (error) {
      console.error('Error in fetchConversations:', error);
    }
  };

  // Load messages for a conversation
  const loadMessages = async () => {
    if (!user || !currentConversationId) return;

    setIsProcessing(true);
    try {
      // Fetch messages for the current conversation
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // If no messages, add a welcome message
      if (data.length === 0) {
        // Use the get_user_llm_config function instead of direct table access
        const { data: configData, error: configError } = await supabase.rpc('get_user_llm_config');

        if (configError) {
          console.error('Error fetching assistant config:', configError);
        }
        
        // Parse the JSON response and set defaults if needed
        const config = configData as LLMConfig || {};
        
        // Default values if no config found
        const assistantName = config?.assistant_name || 'M8';
        const personalityType = config?.personality_type || 'direct';
        
        // Create personalized welcome message based on personality
        let welcomeMessage = '';
        
        switch (personalityType) {
          case 'direct':
            welcomeMessage = `Hi there, I'm ${assistantName}. How can I help you today?`;
            break;
          case 'gentle':
            welcomeMessage = `Hello! I'm ${assistantName}, your friendly assistant. I'm here to support you with whatever you need. How are you feeling today?`;
            break;
          case 'sarcastic':
            welcomeMessage = `Hey, I'm ${assistantName}. What brilliance can I assist you with today? I'm all digital ears.`;
            break;
          case 'no_prisoners':
            welcomeMessage = `I'm ${assistantName}. Let's get straight to business. What do you need help with?`;
            break;
          default:
            welcomeMessage = `Hi there, I'm ${assistantName}. How can I help you today?`;
        }

        // Save welcome message to database
        const { error: insertError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: currentConversationId,
            user_id: user.id,
            role: 'assistant',
            content: welcomeMessage,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting welcome message:', insertError);
        } else {
          // Add welcome message to local state
          data.push({
            id: uuidv4(),
            conversation_id: currentConversationId,
            user_id: user.id,
            role: 'assistant',
            content: welcomeMessage,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString()
          });
        }
      }

      // Convert database records to Message format
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        conversation_id: msg.conversation_id,
        created_at: msg.created_at,
        timestamp: msg.timestamp
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Error in loadMessages:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Create a new conversation
  const createNewConversation = async (title: string) => {
    if (!user) return;

    try {
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      // Update local state
      setCurrentConversationId(data.id);
      
      // Use the get_user_llm_config function instead of direct table access
      const { data: configData, error: configError } = await supabase.rpc('get_user_llm_config');

      if (configError) {
        console.error('Error fetching assistant config:', configError);
      }
      
      // Parse the JSON response and set defaults if needed
      const config = configData as LLMConfig || {};
      
      // Default values if no config found
      const assistantName = config?.assistant_name || 'M8';
      const personalityType = config?.personality_type || 'direct';
      
      // Create personalized welcome message based on personality
      let welcomeMessage = '';
      
      switch (personalityType) {
        case 'direct':
          welcomeMessage = `Hi there, I'm ${assistantName}. How can I help you today?`;
          break;
        case 'gentle':
          welcomeMessage = `Hello! I'm ${assistantName}, your friendly assistant. I'm here to support you with whatever you need. How are you feeling today?`;
          break;
        case 'sarcastic':
          welcomeMessage = `Hey, I'm ${assistantName}. What brilliance can I assist you with today? I'm all digital ears.`;
          break;
        case 'no_prisoners':
          welcomeMessage = `I'm ${assistantName}. Let's get straight to business. What do you need help with?`;
          break;
        default:
          welcomeMessage = `Hi there, I'm ${assistantName}. How can I help you today?`;
      }

      // Add welcome message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: data.id,
          user_id: user.id,
          role: 'assistant',
          content: welcomeMessage,
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.error('Error adding welcome message:', messageError);
      }

      // Refresh conversations list
      fetchConversations();
      
      // Load messages for the new conversation
      setMessages([{
        id: uuidv4(),
        role: 'assistant' as "user" | "assistant",
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
        conversation_id: data.id
      }]);
      
      // Clear the new conversation title and close the dialog
      setNewConversationTitle('');
      setShowNewConversationDialog(false);
    } catch (err) {
      console.error('Error in createNewConversation:', err);
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
          loadMessages();
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
      
      // Fetch assistant configuration
      const { data: config } = await supabase
        .from('llm_configs')
        .select('*')
        .eq('function_name', 'openrouter')
        .single();
      
      const assistantName = config?.assistant_name || "M8";
      const personalityType = config?.personality_type || "gentle";
      
      // Create personalized welcome message
      let welcomeContent = `I've cleared our conversation. I'm ${assistantName}, `;
      
      // Add personality-specific content
      switch (personalityType) {
        case "direct":
          welcomeContent += "what do you need help with now?";
          break;
        case "gentle":
          welcomeContent += "how else can I support you today?";
          break;
        case "sarcastic":
          welcomeContent += "ready for a fresh start or just hiding the evidence?";
          break;
        case "no_prisoners":
          welcomeContent += "now let's get back to what matters. What's next?";
          break;
        default:
          welcomeContent += "how can I help you now?";
      }
      
      // Add new welcome message with personalized content
      const welcomeMessage: Message = {
        id: "welcome-" + Date.now().toString(),
        role: "assistant",
        content: welcomeContent,
        timestamp: new Date().toISOString(),
      };
      
      setMessages([welcomeMessage]);
      
      // Save welcome message to database
      await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: welcomeMessage.role,
          content: welcomeMessage.content,
          timestamp: welcomeMessage.timestamp,
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
          timestamp: message.timestamp,
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Text-to-speech functionality
  const speakText = async (text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(true);
    
    try {
      // Get user's voice preference from settings
      const { data: configData, error: configError } = await supabase.rpc('get_user_llm_config');
      if (configError) {
        console.error('Error fetching voice settings:', configError);
      }
      
      const config = configData as LLMConfig || {};
      const voiceService = config?.voice_service || 'browser';
      
      // Use ElevenLabs if configured
      if (voiceService === 'elevenlabs' && config?.elevenlabs_api_key) {
        const apiKey = config.elevenlabs_api_key;
        const voiceId = getElevenLabsVoiceId(config.elevenlabs_voice || 'rachel');
        
        // Call ElevenLabs API
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to convert text to speech using ElevenLabs');
        }

        // Get audio data from response
        const arrayBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Play the audio
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
        };
        
        audio.play();
      } else {
        // Use browser's built-in speech synthesis
        const utterance = new SpeechSynthesisUtterance(text);
        const voiceType = config?.voice_gender || 'female';
        
        // Get available voices and select based on preference
        const voices = window.speechSynthesis.getVoices();
        let preferredVoice;
        
        if (voiceType === 'male') {
          preferredVoice = voices.find(voice => 
            voice.lang === 'en-US' && !voice.name.includes('Female')
          );
        } else if (voiceType === 'female') {
          preferredVoice = voices.find(voice => 
            voice.lang === 'en-US' && voice.name.includes('Female')
          );
        } else {
          // Neutral or default
          preferredVoice = voices.find(voice => 
            voice.lang === 'en-US'
          );
        }
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      // Fallback to browser TTS if ElevenLabs fails
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };
  
  // Function to get ElevenLabs voice ID from our simplified voice names
  const getElevenLabsVoiceId = (voiceName: string): string => {
    switch (voiceName) {
      case 'rachel':
        return '21m00Tcm4TlvDq8ikWAM'; // Rachel
      case 'domi':
        return 'AZnzlk1XvdvUeBnXmlld'; // Domi
      case 'bella':
        return 'EXAVITQu4vr4xnSDxMaL'; // Bella
      case 'antoni':
        return 'ErXwobaYiN019PkySvjV'; // Antoni
      case 'josh':
        return 'TxGEqnHWrfWFTfGW9XjX'; // Josh
      case 'elli':
        return 'MF3mGyEYCl7XYWbV9V6O'; // Elli
      default:
        return '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)
    }
  };
  
  // Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  // Toggle voice response mode
  const toggleVoiceMode = () => {
    setVoiceEnabled(prev => !prev);
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  // Initialize voices when component loads
  useEffect(() => {
    // Load voices - sometimes they're not immediately available
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Clean up
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Speak new assistant messages if voice is enabled
  useEffect(() => {
    if (voiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        speakText(lastMessage.content);
      }
    }
  }, [messages, voiceEnabled]);

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

  // Add these functions before toggleListening
  const startListening = () => {
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
  };

  const stopListening = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
      timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
    if (!message || !userGoals || !userActions || isProcessing) return;

    // Add user message to the conversation immediately for UX
    const userMessageObj: Message = {
      id: uuidv4(),
      conversation_id: currentConversationId || "",
      content: message,
      role: 'user',
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    setIsProcessing(true);
    setIsSpeaking(true);

    try {
      // Get AI assistant configuration
      const assistantConfig = await getAssistantConfig();
      
      // Format actions for the AI
      const formattedActions = userActions.map(action => ({
        id: action.id,
        title: action.title,
        completed: action.completed,
        frequency: action.frequency,
        goalId: action.goal_id
      }));
      
      // Format goals for the AI
      const formattedGoals = userGoals.map(goal => ({
        id: goal.id,
        text: goal.goal_text,
        description: goal.description
      }));
      
      // Prepare user info message
      const userGoalsContext = `Here are the user's current goals:\n${formattedGoals.map((goal, index) => 
        `${index + 1}. ${goal.text} (ID: ${goal.id})${goal.description ? ` - ${goal.description}` : ''}`
      ).join('\n')}`;
      
      const userActionsContext = `Here are the user's current actions:\n${formattedActions.map((action, index) => 
        `${index + 1}. ${action.title} (ID: ${action.id}, Frequency: ${action.frequency}, Completed: ${action.completed ? 'Yes' : 'No'})`
      ).join('\n')}`;
      
      // Combine contexts with instructions for the AI
      const contextMessage = `${userGoalsContext}\n\n${userActionsContext}\n\n
IMPORTANT: When using functions like complete_action, add_action, or create_goal, always use the FULL UUID format for IDs.
Example of correct usage: complete_action with actionId: "7bc1fdb5-fce8-49aa-8e9b-a63b2bc6a9fb"
Example of INCORRECT usage: complete_action with actionId: "2"
      
When displaying goals or actions to the user, present them in a clean, numbered list format without IDs or technical details. Don't use markdown formatting like bold (**) in your responses.`;
      
      // Prepare the API request
      const endpoint = "https://openrouter.ai/api/v1/chat/completions";
      
      // Get the AI key from env
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      
      if (!apiKey) {
        throw new Error("OpenRouter API key is missing");
      }
      
      // Get model from config or use fallback
      const { data: configData, error: configError } = await supabase.rpc('get_user_llm_config');
      const config = configData as LLMConfig | null;
      const modelToUse = config?.llm_provider || "gpt-4o";
      
      // AI request body
      const requestBody = {
        model: modelToUse,
        messages: [
          {
            role: "system",
            content: assistantConfig.prePrompt
          },
          {
            role: "system",
            content: contextMessage
          },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: "user",
            content: message
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_goal",
              description: "Create a new goal for the user",
              parameters: {
                type: "object",
                properties: {
                  goalText: {
                    type: "string",
                    description: "The text describing the goal"
                  },
                  description: {
                    type: "string",
                    description: "Additional details about the goal"
                  }
                },
                required: ["goalText"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "add_action",
              description: "Add a new action item to an existing goal",
              parameters: {
                type: "object",
                properties: {
                  goalId: {
                    type: "string",
                    description: "The ID of the goal to add the action to"
                  },
                  title: {
                    type: "string",
                    description: "The title of the action"
                  },
                  description: {
                    type: "string",
                    description: "Additional details about the action"
                  },
                  frequency: {
                    type: "string",
                    enum: ["morning", "afternoon", "evening", "daily", "weekly", "monthly"],
                    description: "How often the action should be performed"
                  }
                },
                required: ["goalId", "title", "frequency"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "complete_action",
              description: "Mark an action as completed",
              parameters: {
                type: "object",
                properties: {
                  actionId: {
                    type: "string",
                    description: "The ID of the action to mark as completed"
                  }
                },
                required: ["actionId"]
              }
            }
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
        tool_choice: "auto"
      };

      // Send the API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      // Check for tool calls in the response
      if (result.choices[0].message.tool_calls && result.choices[0].message.tool_calls.length > 0) {
        const toolCall = result.choices[0].message.tool_calls[0];
        
        // Process function calls
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log("AI function call:", functionName, functionArgs);
          
          // Handle different function calls
          if (functionName === 'create_goal') {
            await handleCreateGoal(functionArgs.goalText, functionArgs.description);
            return {
              message: `I've created a new goal: "${functionArgs.goalText}"`,
              action: "New goal created successfully!",
              refresh: true,
              navigate: "/goals"
            };
          } 
          else if (functionName === 'add_action') {
            // Ensure goalId is a valid UUID
            if (!functionArgs.goalId || !functionArgs.goalId.includes('-')) {
              return {
                message: "I couldn't add that action because I need a valid goal ID. Please try again with a specific goal.",
                action: "Failed to add action: Invalid goal ID format",
                refresh: false
              };
            }
            await handleAddAction(
              functionArgs.goalId,
              functionArgs.title,
              functionArgs.description,
              functionArgs.frequency || "daily"
            );
            return {
              message: `I've added a new action: "${functionArgs.title}" to your goal`,
              action: "New action added successfully!",
              refresh: true
            };
          }
          else if (functionName === 'complete_action') {
            // Ensure actionId is a valid UUID
            if (!functionArgs.actionId || !functionArgs.actionId.includes('-')) {
              return {
                message: "I couldn't mark that action as completed because I need a valid action ID. Please try again by specifying the exact action.",
                action: "Failed to complete action: Invalid action ID format",
                refresh: false
              };
            }
            await handleCompleteAction(functionArgs.actionId);
            return {
              message: "I've marked that action as completed. Great job!",
              action: "Action marked as completed!",
              refresh: true
            };
          }
        }
      }
      
      // If no tool calls, get regular content
      const aiResponse = result.choices[0].message.content || "I'm not sure how to respond to that.";
      
      // Check if the response contains a JSON action command (legacy format)
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
    } finally {
      setIsProcessing(false);
      setIsSpeaking(false);
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

  // Function to get assistant configuration
  const getAssistantConfig = async (): Promise<{
    name: string;
    personality: string;
    prePrompt: string;
  }> => {
    const defaultConfig = {
      name: 'M8',
      personality: 'gentle',
      prePrompt: 'You are a helpful AI assistant for a goal-tracking application called "My M8". Your job is to help users manage their goals and actions, provide encouragement, and answer questions.'
    };
    
    if (!user) return defaultConfig;
    
    try {
      // Use the get_user_llm_config RPC function
      const { data: configData, error: configError } = await supabase.rpc('get_user_llm_config');
      
      if (configError) {
        // Fallback to using profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nickname, assistant_toughness')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          return defaultConfig;
        }
        
        // Create a basic pre-prompt using profile data
        const name = profileData.nickname || defaultConfig.name;
        const personality = profileData.assistant_toughness || 'balanced';
        
        let personalityPrompt = '';
        switch (personality) {
          case 'gentle':
            personalityPrompt = 'Be gentle, supportive, and understanding. Use encouraging language.';
            break;
          case 'balanced':
            personalityPrompt = 'Balance support with accountability. Gently remind the user of their commitments.';
            break;
          case 'firm':
            personalityPrompt = 'Hold the user accountable. Remind them of their goals and commitments firmly.';
            break;
          case 'tough':
            personalityPrompt = 'Be tough on excuses. Call out procrastination and push the user towards their goals firmly.';
            break;
          default:
            personalityPrompt = 'Be supportive and helpful.';
        }
        
        const prePrompt = `You are a helpful AI assistant for a goal-tracking application. Your name is ${name}. ${personalityPrompt}`;
        
        return {
          name,
          personality,
          prePrompt
        };
      }
      
      // Parse the RPC response and use it
      const config = configData as LLMConfig || {};
      
      return {
        name: config.assistant_name || defaultConfig.name,
        personality: config.personality_type || defaultConfig.personality,
        prePrompt: config.pre_prompt || defaultConfig.prePrompt
      };
    } catch (error) {
      console.error('Error getting assistant config:', error);
      return defaultConfig;
    }
  };

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
                <>
                  {/* Group conversations by date */}
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    const lastWeekStart = new Date(today);
                    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
                    
                    const thisMonth = new Date(today);
                    thisMonth.setDate(1);
                    
                    // Create date groups
                    const todayConvos = conversations.filter(c => {
                      const date = new Date(c.last_message_at);
                      return date >= today;
                    });
                    
                    const yesterdayConvos = conversations.filter(c => {
                      const date = new Date(c.last_message_at);
                      return date >= yesterday && date < today;
                    });
                    
                    const lastWeekConvos = conversations.filter(c => {
                      const date = new Date(c.last_message_at);
                      return date >= lastWeekStart && date < yesterday;
                    });
                    
                    const olderConvos = conversations.filter(c => {
                      const date = new Date(c.last_message_at);
                      return date < lastWeekStart;
                    });
                    
                    // Helper function to render a group
                    const renderGroup = (title: string, convos: Conversation[]) => {
                      if (convos.length === 0) return null;
                      return (
                        <div key={title}>
                          <div className="px-3 py-1 text-xs text-muted-foreground font-medium bg-muted/50">
                            {title}
                          </div>
                          {convos.map((conversation) => (
                            <div 
                              key={conversation.id}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                                currentConversationId === conversation.id ? "bg-gray-100 dark:bg-gray-800" : ""
                              )}
                              onClick={() => {
                                setCurrentConversationId(conversation.id);
                                loadMessages();
                                setShowChatHistory(false);
                              }}
                            >
                              <div className="flex items-center space-x-2 truncate w-full">
                                <Bot className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{conversation.title || "Untitled Conversation"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    };
                    
                    return (
                      <>
                        {renderGroup("Today", todayConvos)}
                        {renderGroup("Yesterday", yesterdayConvos)}
                        {renderGroup("Last 7 Days", lastWeekConvos)}
                        {renderGroup("Older", olderConvos)}
                      </>
                    );
                  })()}
                </>
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
                          loadMessages();
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
            
            <div className="flex-1 overflow-y-auto no-scrollbar pb-[80px] sm:pb-[100px]">
              <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
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
                          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t p-2 sm:p-3 shadow-md z-10">
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
                    variant="outline"
                    size="icon"
                    onClick={toggleVoiceMode}
                    title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
                    className={`${voiceEnabled ? 'bg-primary/10' : ''}`}
                  >
                    {voiceEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline" 
                    size="icon"
                    onClick={toggleListening}
                    disabled={isProcessing}
                    title={isListening ? "Stop listening" : "Start listening"}
                    className={`${isListening ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button type="submit" disabled={isProcessing || !input.trim()} className="px-3 sm:px-4">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
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
            <Button onClick={() => {
              createNewConversation(newConversationTitle);
            }}>
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
      
      {/* Add a speaking indicator if needed */}
      {isSpeaking && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1 shadow-md">
          <Volume2 className="h-4 w-4 animate-pulse" />
          <span>Speaking...</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 ml-1" 
            onClick={stopSpeaking}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Layout>
  );
};

export default AIAssistant; 
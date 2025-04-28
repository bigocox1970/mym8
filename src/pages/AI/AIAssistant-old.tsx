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
import { getConfig, initConfig } from "@/lib/configManager";
import { processMessage, textToSpeech } from "@/lib/api";

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
  lang: string;
  maxAlternatives?: number;
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
    speechSynthesisHasInteracted?: boolean;
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
  google_api_key?: string;
  google_voice?: string;
  azure_api_key?: string;
  azure_voice?: string;
  amazon_api_key?: string;
  amazon_voice?: string;
  openai_api_key?: string;
  openai_voice?: string;
}

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const lastSpokenRef = useRef<string | null>(null);
  const lastSpokenContentRef = useRef<string | null>(null);
  
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

      // Convert database records to Message format
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        conversation_id: msg.conversation_id,
        created_at: msg.created_at,
        timestamp: msg.timestamp
      }));

      // Wrap setMessages to add debug logging
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
      
      // Use our config manager instead of database call
      const config = getConfig();
      
      // Get values from config
      const assistantName = config.assistant_name || 'M8';
      const personalityType = config.personality_type || 'friendly';
      
      // Create personalized welcome message based on personality
      let welcomeMessage = '';
      
      switch (personalityType) {
        case 'direct':
          welcomeMessage = `Hi there, I'm ${assistantName}. How can I help you today?`;
          break;
        case 'gentle':
          welcomeMessage = `Hello! I'm ${assistantName}, your friendly assistant. I'm here to support you with whatever you need. How are you feeling today?`;
          break;
        case 'friendly':
          welcomeMessage = `Hi there! It's ${assistantName} here. I'm ready to chat and help you with your goals. How are you doing today?`;
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
      
      // Use our config manager instead of database call
      const config = getConfig();
      
      const assistantName = config.assistant_name || "M8";
      const personalityType = config.personality_type || "friendly";
      
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
        case "friendly":
          welcomeContent += "ready to chat about something new?";
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
      
      // Wrap setMessages to add debug logging
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
    
    if (message.role === "assistant") {
      console.log("[saveMessage] Saving assistant message:", message.content, message.id, "conversation:", conversationId);
    }
    if (message.role === "user") {
      console.log("[saveMessage] Saving user message:", message.content, message.id, "conversation:", conversationId);
    }
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

  // Ensure config is initialized before using TTS
  useEffect(() => {
    (async () => {
      await initConfig();
      console.log("Config initialized for AI Assistant");
      const config = getConfig();
      console.log("Loaded TTS config on mount:", config);
    })();
  }, []);

  // Text-to-speech functionality
  const speakText = async (text: string) => {
    if (!text || !isVoiceEnabled) return;

    let config;
    try {
      config = getConfig();
      console.log("TTS config in speakText:", config);
    } catch (e) {
      toast.error("TTS config not loaded. Please refresh the page.");
      setIsSpeaking(false);
      return;
    }
    const voiceService = config.voice_service || 'browser';
    let voice = 'alloy';
    if (voiceService === 'openai') voice = config.openai_voice || 'alloy';
    if (voiceService === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
    if (voiceService === 'google') voice = config.google_voice || 'en-US-Neural2-F';
    if (voiceService === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
    if (voiceService === 'amazon') voice = config.amazon_voice || 'Joanna';
    console.log("voiceService:", voiceService, "voice:", voice);

    if (voiceService === 'browser') {
      console.log("Using browser TTS");
      // Browser TTS logic (existing)
      if (!window.speechSynthesis) {
        toast.error("Speech synthesis is not supported in your browser");
        setIsSpeaking(false);
        return;
      }
      // Stop any existing speech first
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setIsSpeaking(true);
      const selectedVoiceName = config.voice_gender === 'male' ? 'Alex' : 'Samantha';
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === selectedVoiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (error) => {
        setIsSpeaking(false);
        if (error.error !== 'interrupted' && error.error !== 'canceled') {
          toast.error("Speech synthesis failed.");
        }
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    // API-based TTS
    try {
      console.log("Using API TTS");
      setIsSpeaking(true);
      toast("Generating speech...");
      const audioBlob = await textToSpeech(text, voiceService, { voice });
      const audioUrl = URL.createObjectURL(audioBlob as Blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
      };
      await audio.play();
    } catch (error) {
      setIsSpeaking(false);
      toast.error("Failed to generate speech.");
      console.error(error);
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
    setIsVoiceEnabled(prev => !prev);
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
    if (isVoiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only speak if the last message is from the assistant and is truly new
      if (
        lastMessage.role === 'assistant' &&
        (!lastSpokenRef.current || lastSpokenRef.current !== lastMessage.id || lastSpokenContentRef.current !== lastMessage.content) &&
        !isSpeaking
      ) {
        // Update refs BEFORE calling speakText to avoid race conditions
        lastSpokenRef.current = lastMessage.id;
        lastSpokenContentRef.current = lastMessage.content;
        console.log("[TTS useEffect] Speaking message:", lastMessage.id, lastMessage.content);
        speakText(lastMessage.content);
      } else {
        console.log("[TTS useEffect] Not speaking. lastSpokenRef:", lastSpokenRef.current, "lastMessage.id:", lastMessage.id, "lastSpokenContentRef:", lastSpokenContentRef.current, "lastMessage.content:", lastMessage.content);
      }
    }
  }, [messages, isVoiceEnabled, isSpeaking]);

  // Start speech recognition
  const startListening = () => {
    // Check for browser support
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in your browser.");
      setIsListening(false);
      return;
    }
    
    try {
      // Detect iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
        !(window as unknown as { MSStream: boolean }).MSStream;
      
      // On iOS, we need to request permission explicitly first
      if (isIOS) {
        console.log("iOS device detected for speech recognition");
        // iOS requires user interaction to grant microphone permission
        toast.message("Please allow microphone access when prompted");
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure recognition - different settings for mobile
      recognition.continuous = false; // Set to false for better mobile compatibility
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Set language explicitly
      
      // For mobile devices, we may need shorter timeouts
      if (isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Mobile device - can time out more quickly
        console.log("Mobile device detected, using mobile-optimized speech recognition");
        recognition.maxAlternatives = 1; // Limit alternatives for speed
      }
      
      // Handle results
      recognition.onresult = (event) => {
        // Get the most confident result
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
          
        console.log("Speech recognized:", transcript);
        setInput(transcript);
        
        // On mobile, we often want to submit immediately after speaking
        if (isIOS && event.results[0].isFinal) {
          console.log("iOS final result detected, auto-stopping recognition");
          recognition.stop();
        }
      };
      
      // Handle end of recognition
      recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
      };
      
      // Handle errors with better mobile-specific messaging
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Provide more specific error messages based on error type and device
        if (event.error === 'not-allowed') {
          if (isIOS) {
            toast.error("Microphone access denied. Please enable microphone in your iOS Settings app.");
          } else {
            toast.error("Microphone access denied. Please enable microphone permissions in your browser settings.");
          }
        } else if (event.error === 'network') {
          toast.error("Network error occurred. Check your internet connection.");
        } else if (event.error === 'no-speech') {
          toast.message("No speech detected. Please try again.", {
            description: "Speak clearly and ensure your microphone is working."
          });
        } else if (event.error === 'aborted') {
          // This is usually intentional, so no toast needed
          console.log("Speech recognition aborted");
        } else {
          toast.error("Speech recognition failed. Try typing your message instead.");
        }
      };
      
      // On some mobile browsers, especially iOS, we need a user gesture to start recognition
      // This function ensures we've had user interaction before trying to use the microphone
      const ensureUserInteraction = () => {
        // Try to unlock audio context if needed (helps with microphone access on some devices)
        if (typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined') {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const audioContext = new AudioContextClass();
            if (audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
              });
            }
          }
        }
        
        // Now start recognition
        recognition.start();
        setIsListening(true);
        console.log("Speech recognition started");
      };
      
      // Start recognition with user interaction handling
      ensureUserInteraction();
      
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("Failed to start speech recognition. Please try again.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (isListening) {
      try {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          // Create a new instance to stop
          const recognition = new SpeechRecognition();
          recognition.stop();
          setIsListening(false);
          console.log("Speech recognition stopped");
        }
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
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
    
    console.log("[handleSubmit] Submitting user message:", input, "conversation:", currentConversationId);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    // Save user message to database
    await saveMessage(userMessage, currentConversationId);
    
    try {
      // Process the message with the AI
      console.log("[handleSubmit] Calling processUserMessage for:", input, "conversation:", currentConversationId);
      const response = await processUserMessage(input, goals || [], actions || []);

      // Create AI message
      const aiMessage: Message = {
        id: uuidv4(), // Use uuid for uniqueness
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        conversation_id: currentConversationId
      };
      console.log("[handleSubmit] Saving assistant message:", aiMessage.content, aiMessage.id, "conversation:", currentConversationId);
      
      // Add AI message to local state
      setMessages((prev) => [...prev, aiMessage]);
      
      // Save AI message to database (without reloading all messages)
      await saveMessage(aiMessage, currentConversationId);
      
      // Speak the response if voice is enabled
      if (isVoiceEnabled) {
        speakText(response.message);
      }
      
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
      toast.error("Failed to process your request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to process user messages
  const processUserMessage = async (
    message: string, 
    userGoals: Goal[], 
    userActions: Action[]
  ) => {
    if (!message || !userGoals || !userActions || isProcessing) return;

    setIsProcessing(true);

    try {
      // Use the API service to process messages through the backend
      const response = await processMessage(message, {
        goals: userGoals,
        actions: userActions,
        conversation: messages.slice(-10) // Send the last 10 messages for context
      });
      
      return response;
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Return a fallback error message
      return {
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        action: null,
        navigate: null,
        refresh: false
      };
    } finally {
      setIsProcessing(false);
    }
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
    
    try {
      // Use the config manager instead of supabase
      const config = getConfig();
      
      // Generate the personality prompt based on personality type
      let personalityPrompt = '';
      const personality = config.personality_type || defaultConfig.personality;
      
      switch (personality) {
        case 'gentle':
          personalityPrompt = 'Be gentle, supportive, and understanding. Use encouraging language.';
          break;
        case 'friendly':
          personalityPrompt = 'Be friendly, warm and casual. Use conversational language and light humor.';
          break;
        case 'balanced':
          personalityPrompt = 'Balance support with accountability. Gently remind the user of their commitments.';
          break;
        case 'firm':
          personalityPrompt = 'Hold the user accountable. Remind them of their goals and commitments firmly.';
          break;
        case 'sarcastic':
          personalityPrompt = 'Be sarcastic and witty. Use humor to motivate the user, but be careful not to be too harsh.';
          break;
        case 'tough':
          personalityPrompt = 'Be tough on excuses. Call out procrastination and push the user towards their goals firmly.';
          break;
        default:
          personalityPrompt = 'Be supportive and helpful.';
      }
      
      // Create the pre-prompt
      const name = config.assistant_name || defaultConfig.name;
      const prePrompt = `You are a helpful AI assistant for a goal-tracking application. Your name is ${name}. ${personalityPrompt}`;
      
      return {
        name: name,
        personality: personality,
        prePrompt: prePrompt
      };
    } catch (error) {
      console.error('Error getting assistant config:', error);
      return defaultConfig;
    }
  };

  // Function to load available voices for speech synthesis
  const loadVoices = () => {
    try {
      const availableVoices = window.speechSynthesis.getVoices();
      console.log(`Voices loaded: ${availableVoices.length}`);
      return availableVoices;
    } catch (error) {
      console.error("Error loading voices:", error);
      return [];
    }
  };

  // Load voice settings from config
  useEffect(() => {
    try {
      const config = getConfig();
      // Enable voice if the user had previously enabled it
      if (config.voice_enabled !== undefined) {
        setIsVoiceEnabled(config.voice_enabled);
      } else if (config.voice_service && config.voice_service !== 'none') {
        // Fallback to checking if a voice service is selected
        setIsVoiceEnabled(true);
      }
      
      // Pre-load voices for browser speech synthesis
      loadVoices();
      
      // Some browsers need an event handler to load voices
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  }, []);

  // Initialize speech recognition when component loads
  useEffect(() => {
    // Check if speech recognition is supported
    const isSpeechRecognitionSupported = 
      'SpeechRecognition' in window || 
      'webkitSpeechRecognition' in window;
    
    if (!isSpeechRecognitionSupported) {
      console.log("Speech recognition is not supported in this browser");
    }
    
    // Clean up any active speech recognition on unmount
    return () => {
      if (isListening) {
        stopListening();
      }
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
                    title={isVoiceEnabled ? "Disable voice responses" : "Enable voice responses"}
                    className={`${isVoiceEnabled ? 'bg-primary/10' : ''}`}
                  >
                    {isVoiceEnabled ? (
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

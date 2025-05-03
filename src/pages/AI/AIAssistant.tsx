import React, { useState, useRef, useEffect } from "react";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '@/lib/configManager';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Custom hooks
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useConversations } from "@/hooks/use-conversations";
import { useAIProcessing } from "@/hooks/use-ai-processing";

// Components
import { ChatHistory } from "./components/ChatHistory";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";
import { NewConversationDialog } from "./components/NewConversationDialog";
import { DeleteConversationDialog } from "./components/DeleteConversationDialog";

// Types
import { Message } from "./types";

const AIAssistant = () => {
  const { user, profile } = useAuth();
  const [input, setInput] = useState("");
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const initialLoadRef = useRef(true);
  const [assistantName, setAssistantName] = useState("");
  const initialQuestionSubmittedRef = useRef(false);
  
  // Add new state variables for the visual feedback
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get user goals and actions using React Query
  const { data: goals = [] } = useQuery({
    queryKey: ['goals-for-ai'],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Use direct Supabase query instead of API endpoint
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) {
          throw new Error(`Failed to fetch goals: ${error.message}`);
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching goals:', error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Get user actions
  const { data: actions = [], refetch: refetchActions } = useQuery({
    queryKey: ['actions-for-ai'],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Use direct Supabase query instead of API endpoint
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
          
        if (error) {
          throw new Error(`Failed to fetch actions: ${error.message}`);
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching actions:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Get assistant name from config
  useEffect(() => {
    try {
      const config = getConfig();
      console.log("Loading assistant name from config:", config.assistant_name);
      
      // Skip setting if it's 'M8' or empty
      if (config.assistant_name && config.assistant_name !== 'M8') {
        setAssistantName(config.assistant_name);
      } else {
        console.log("Skipping default assistant name 'M8'");
        // Explicitly set to empty to override any previous value
        setAssistantName("");
      }
    } catch (error) {
      console.error("Error loading assistant name:", error);
      // Set to empty on error
      setAssistantName("");
    }
  }, []);

  // Initialize hooks
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    isLoading,
    fetchConversations,
    loadMessages,
    createNewConversation,
    deleteConversation,
    deleteCurrentConversation,
    clearCurrentConversation,
    getCurrentConversationTitle,
    addMessage
  } = useConversations({ userId: user?.id });

  const {
    isProcessing,
    processUserMessage
  } = useAIProcessing({ 
    goals, 
    actions, 
    onRefreshActions: refetchActions,
    userNickname: profile?.nickname || "",
    userId: user?.id
  });

  const {
    isVoiceEnabled,
    isSpeaking,
    speakText,
    stopSpeaking,
    toggleVoiceMode,
    shouldSpeakMessage,
    updateLastSpokenRefs
  } = useTextToSpeech();

  const {
    isListening,
    toggleListening
  } = useSpeechRecognition({
    onTranscript: (transcript) => setInput(transcript)
  });

  // Handle initial creation of conversation if needed (runs once on mount)
  useEffect(() => {
    const handleInitialConversation = async () => {
      // Skip if user isn't loaded
      if (!user) return;
      
      const shouldCreateNew = localStorage.getItem('createNewConversation') === 'true';
      const newTitle = localStorage.getItem('newConversationTitle') || '';
      
      if (shouldCreateNew && newTitle) {
        // Clear the flags but keep the question for the next effect
        localStorage.removeItem('createNewConversation');
        localStorage.removeItem('newConversationTitle');
        
        // Create new conversation with the question as title
        console.log('Creating new conversation with title:', newTitle);
        await createNewConversation(newTitle);
      }
    };
    
    handleInitialConversation();
    // Only run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  // Check for a predefined question in localStorage and process it
  useEffect(() => {
    const checkPredefinedQuestion = async () => {
      // Skip if we don't have a conversation or user yet
      if (!currentConversationId || !user) return;
      
      // Check if there's a question in localStorage and we haven't already submitted it
      const question = localStorage.getItem('assistantQuestion');
      if (question && !initialQuestionSubmittedRef.current) {
        // Set the input to the question
        setInput(question);
        
        // Clear the question from localStorage
        localStorage.removeItem('assistantQuestion');
        
        // Small delay to ensure the conversation is ready
        setTimeout(() => {
          // Trigger the form submission programmatically
          handleSubmit(new Event('submit') as unknown as React.FormEvent);
          initialQuestionSubmittedRef.current = true;
        }, 500);
      }
    };
    
    checkPredefinedQuestion();
  }, [currentConversationId, user]);

  // Handle changing conversations
  const handleConversationChange = (conversationId: string) => {
    // Reset initialLoadRef to prevent TTS from speaking when loading an existing conversation
    initialLoadRef.current = true;
    
    // Set the current conversation ID
    // The useEffect in useConversations will handle loading messages
    setCurrentConversationId(conversationId);
  };

  // Play a message when clicked
  const handlePlayMessage = (messageContent: string, messageId: string) => {
    if (!isVoiceEnabled) {
      // If voice is not enabled, prompt the user to enable it
      toast.message("Voice playback disabled", {
        description: "Enable voice responses to play messages",
        action: {
          label: "Enable",
          onClick: () => {
            toggleVoiceMode();
            // Wait a bit to ensure voice is enabled, then try again
            setTimeout(() => {
              setIsLoadingAudio(true);
              updateLastSpokenRefs(messageId, messageContent);
              speakText(messageContent, messageId);
              setIsLoadingAudio(false);
            }, 300);
          }
        }
      });
      return;
    }
    
    // If already speaking, stop it first - the hook will track the messageId internally
    if (isSpeaking) {
      stopSpeaking();
      // If we were already speaking this message, we're done after stopping
      return;
    }
    
    setIsLoadingAudio(true);
    
    // Small delay to show loading animation
    setTimeout(() => {
      updateLastSpokenRefs(messageId, messageContent);
      speakText(messageContent, messageId);
      setIsLoadingAudio(false);
    }, 300);
  };

  // Handle form submission with visual feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || !currentConversationId) return;
    
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    // Clear input and add user message to UI
    setInput("");
    setIsSubmitting(true);
    await addMessage(userMessage);
    
    try {
      // Process the message with the AI
      const aiMessage = await processUserMessage(input, messages);
      
      // Add AI message to UI and database
      await addMessage(aiMessage);
      
      // Speak the response if voice is enabled
      if (shouldSpeakMessage(aiMessage.id, aiMessage.content)) {
        setIsLoadingAudio(true);
        updateLastSpokenRefs(aiMessage.id, aiMessage.content);
        speakText(aiMessage.content, aiMessage.id);
        setIsLoadingAudio(false);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle creating a new conversation
  const handleNewConversation = () => {
    createNewConversation(newConversationTitle);
    setNewConversationTitle("");
    setShowNewConversationDialog(false);
  };

  // Handle deleting multiple conversations
  const handleDeleteMultipleConversations = async (conversationIds: string[]) => {
    if (!user || conversationIds.length === 0) return;
    
    try {
      // Delete each conversation
      for (const id of conversationIds) {
        await deleteConversation(id);
      }
      
      // Show success message
      toast.success(`${conversationIds.length} ${conversationIds.length === 1 ? 'conversation' : 'conversations'} deleted`);
      
      // Refresh the conversations list
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversations:', error);
      toast.error("Failed to delete conversations");
    }
  };

  // Effect to speak new assistant messages, but not on initial load
  React.useEffect(() => {
    if (messages.length > 0) {
      // Skip speaking on initial load of existing conversations
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && shouldSpeakMessage(lastMessage.id, lastMessage.content)) {
        setIsLoadingAudio(true);
        updateLastSpokenRefs(lastMessage.id, lastMessage.content);
        speakText(lastMessage.content, lastMessage.id);
        setIsLoadingAudio(false);
      }
    }
  }, [messages]);

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              MyM8 {assistantName && ` ${assistantName}`}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Chat with {assistantName ? `${assistantName} your` : "your"} goal tracking AI assistant
            </p>
          </div>
          <MenuToggleButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-4 flex-1 min-h-0">
          {/* Conversations sidebar */}
          <ChatHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            showChatHistory={showChatHistory}
            setShowChatHistory={setShowChatHistory}
            setCurrentConversationId={handleConversationChange}
            onNewConversation={() => setShowNewConversationDialog(true)}
            onDeleteConversations={handleDeleteMultipleConversations}
          />

          {/* Main chat area - Fixed layout with sticky header and footer */}
          <div className={cn(
            "md:col-span-3 flex flex-col h-[calc(100vh-10rem)] relative",
            showChatHistory ? "hidden md:flex" : "flex"
          )}>
            <Card className="border-none shadow-md flex flex-col flex-1 relative overflow-hidden bg-background/95 dark:bg-background/90">
              {/* Sticky header */}
              <div className="sticky top-0 z-10 bg-background/95 dark:bg-background/90 border-b">
                <ChatHeader
                  title={getCurrentConversationTitle()}
                  showChatHistory={showChatHistory}
                  setShowChatHistory={setShowChatHistory}
                  onNewConversation={() => setShowNewConversationDialog(true)}
                  onClearConversation={clearCurrentConversation}
                  onDeleteConversation={() => setShowDeleteDialog(true)}
                />
              </div>
              
              {/* Scrollable message area - using flex instead of fixed height */}
              <div className="flex-1 overflow-y-auto mb-[105px] sm:mb-[120px]">
                <ChatMessages 
                  messages={messages} 
                  onPlayMessage={handlePlayMessage}
                />
              </div>
              
              {/* Fixed footer at bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-background border-t">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  isProcessing={isProcessing}
                  onSubmit={handleSubmit}
                  isVoiceEnabled={isVoiceEnabled}
                  toggleVoiceMode={toggleVoiceMode}
                  isListening={isListening}
                  toggleListening={toggleListening}
                  isLoadingAudio={isLoadingAudio}
                  isSpeaking={isSpeaking}
                  isSubmitting={isSubmitting}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <NewConversationDialog
        open={showNewConversationDialog}
        onOpenChange={setShowNewConversationDialog}
        title={newConversationTitle}
        setTitle={setNewConversationTitle}
        onCreateConversation={handleNewConversation}
      />
      
      <DeleteConversationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleteConversation={deleteCurrentConversation}
      />
    </Layout>
  );
};

export default AIAssistant;

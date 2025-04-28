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
import { SpeakingIndicator } from "./components/SpeakingIndicator";
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
  const [assistantName, setAssistantName] = useState("AI Assistant");
  
  // Get user goals and actions using React Query
  const { data: goals = [] } = useQuery({
    queryKey: ['goals-for-ai'],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const response = await fetch('/api/goals');
        if (!response.ok) {
          throw new Error('Failed to fetch goals');
        }
        return await response.json();
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
        const response = await fetch('/api/tasks');
        if (!response.ok) {
          throw new Error('Failed to fetch actions');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching actions:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Get assistant name from config
  useEffect(() => {
    const config = getConfig();
    if (config.assistant_name) {
      setAssistantName(config.assistant_name);
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
    userNickname: profile?.nickname || ""
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

  // Handle changing conversations
  const handleConversationChange = (conversationId: string) => {
    // Reset initialLoadRef to prevent TTS from speaking when loading an existing conversation
    initialLoadRef.current = true;
    
    // Set the current conversation ID
    // The useEffect in useConversations will handle loading messages
    setCurrentConversationId(conversationId);
  };

  // Handle form submission
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
    await addMessage(userMessage);
    
    try {
      // Process the message with the AI
      const aiMessage = await processUserMessage(input, messages);
      
      // Add AI message to UI and database
      await addMessage(aiMessage);
      
      // Speak the response if voice is enabled
      if (shouldSpeakMessage(aiMessage.id, aiMessage.content)) {
        updateLastSpokenRefs(aiMessage.id, aiMessage.content);
        speakText(aiMessage.content);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
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
        updateLastSpokenRefs(lastMessage.id, lastMessage.content);
        speakText(lastMessage.content);
      }
    }
  }, [messages]);

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">MyM8 {assistantName}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Chat with {assistantName} your goal tracking AI assistant
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MenuToggleButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-4 flex-1 overflow-hidden">
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

          {/* Main chat area */}
          <Card className={cn(
            "border-none shadow-md flex flex-col h-full relative overflow-hidden bg-background/95 dark:bg-background/90",
            showChatHistory ? "hidden md:flex md:col-span-3" : "md:col-span-3"
          )}>
            <ChatHeader
              title={getCurrentConversationTitle()}
              showChatHistory={showChatHistory}
              setShowChatHistory={setShowChatHistory}
              onNewConversation={() => setShowNewConversationDialog(true)}
              onClearConversation={clearCurrentConversation}
              onDeleteConversation={() => setShowDeleteDialog(true)}
            />
            
            <ChatMessages messages={messages} />
            
            <ChatInput
              input={input}
              setInput={setInput}
              isProcessing={isProcessing}
              onSubmit={handleSubmit}
              isVoiceEnabled={isVoiceEnabled}
              toggleVoiceMode={toggleVoiceMode}
              isListening={isListening}
              toggleListening={toggleListening}
            />
          </Card>
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
      
      {/* Speaking indicator */}
      <SpeakingIndicator
        isSpeaking={isSpeaking}
        onStop={stopSpeaking}
      />
    </Layout>
  );
};

export default AIAssistant;

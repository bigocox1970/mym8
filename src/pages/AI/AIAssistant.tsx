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
  const welcomeConversationHandledRef = useRef(false);
  const lastClickRef = useRef<number>(0);
  
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
    addMessage,
    setMessages,
    saveMessage
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
    speakSimpleText,
    stopSpeaking,
    toggleVoiceMode,
    shouldSpeakMessage,
    updateLastSpokenRefs,
    lastSpokenRef
  } = useTextToSpeech();

  const {
    isListening,
    toggleListening
  } = useSpeechRecognition({
    onTranscript: (transcript) => setInput(transcript)
  });

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

  // Handle initial creation of conversation if needed (runs once on mount)
  useEffect(() => {
    const handleInitialConversation = async () => {
      // Skip if user isn't loaded
      if (!user) return;
      
      // Create local helper function to trigger welcome conversation
      const triggerWelcomeMessage = () => {
        welcomeConversationHandledRef.current = false;
        console.log('Manually triggering welcome message display');
        // This will trigger the welcome conversation effect
      };
      
      try {
        const shouldCreateNew = localStorage.getItem('createNewConversation') === 'true';
        const newTitle = localStorage.getItem('newConversationTitle') || '';
        const forceNewChat = localStorage.getItem('forceNewChat') === 'true';
        
        if (shouldCreateNew && newTitle) {
          // Clear the flags immediately to prevent recursive triggering
          localStorage.removeItem('createNewConversation');
          localStorage.removeItem('newConversationTitle');
          localStorage.removeItem('forceNewChat');
          
          console.log('Creating new conversation with title:', newTitle);
          
          // Special handling for Set Up conversations (may include timestamp)
          if (newTitle.startsWith('Set Up')) {
            console.log('Setting up a clean Set Up conversation');
            
            // Force reset of the current conversation ID to ensure we start fresh
            setCurrentConversationId('');
            
            // Make sure the welcome handler will fire for the new conversation
            welcomeConversationHandledRef.current = false;
            
            // Clear messages state first
            setMessages([]);
            
            // Make sure we clear the initialLoad reference so the TTS will fire
            initialLoadRef.current = false;
            
            // Small delay to ensure state updates
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Create a completely new conversation with the full title (including timestamp if present)
            const newConvId = await createNewConversation(newTitle);
            console.log('Created new Set Up conversation with ID:', newConvId);
            
            // If we're setting up after the wizard, ensure the welcome message loads
            if (localStorage.getItem('show_welcome_conversation') === 'true') {
              console.log('Set Up will show the welcome message');
              
              // Ensure we use the right conversation ID for the welcome message
              if (newConvId) {
                // Delete any existing welcome messages for this conversation
                try {
                  await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('conversation_id', newConvId);
                  console.log('Cleared any existing messages in new conversation');
                } catch (err) {
                  console.error('Error clearing messages:', err);
                }
                
                // Force an immediate fetch of conversations to update the list
                await fetchConversations();
                
                // Set the current conversation ID to the new one
                setCurrentConversationId(newConvId);
                
                // Just to be super safe, add a delay and try again
                setTimeout(() => {
                  console.log('Ensuring we are on the new conversation:', newConvId);
                  setCurrentConversationId(newConvId);
                  
                  // Delay the welcome message handling until after conversation is properly set
                  setTimeout(() => {
                    triggerWelcomeMessage();
                  }, 1000);
                }, 500);
              }
            }
          } else {
            // Regular new conversation
            await createNewConversation(newTitle);
          }
        }
      } catch (error) {
        console.error('Error in handleInitialConversation:', error);
      }
    };
    
    handleInitialConversation();
    // Only run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle welcome conversation for users who just completed onboarding
  useEffect(() => {
    const handleWelcomeConversation = async () => {
      // Skip if user isn't loaded or no conversation exists yet
      if (!user || !currentConversationId) {
        console.log('Skipping welcome conversation - missing user or conversation ID');
        return;
      }
      
      // Skip if we've already handled this
      if (welcomeConversationHandledRef.current) {
        console.log('Welcome conversation already handled');
        return;
      }
      
      // Check for the welcome conversation flag
      const showWelcome = localStorage.getItem('show_welcome_conversation') === 'true';
      if (!showWelcome) {
        console.log('No welcome flag set, skipping welcome conversation');
        return;
      }
      
      console.log('Handling welcome conversation in conversation ID:', currentConversationId);
      
      // Mark as handled to prevent duplicate messages
      welcomeConversationHandledRef.current = true;
      
      // Clear the flag
      localStorage.removeItem('show_welcome_conversation');
      
      // Get any goals from localStorage
      let userGoals: string[] = [];
      try {
        const storedGoals = localStorage.getItem('user_goals');
        if (storedGoals) {
          userGoals = JSON.parse(storedGoals);
          localStorage.removeItem('user_goals'); // Clear after reading
          console.log('Found user goals:', userGoals);
        }
      } catch (error) {
        console.error('Error parsing user goals from localStorage:', error);
      }
      
      try {
        // First, force clear any existing messages in this conversation
        try {
          await supabase
            .from('chat_messages')
            .delete()
            .eq('conversation_id', currentConversationId);
          console.log('Cleared any existing messages before generating welcome message');
        } catch (err) {
          console.error('Error clearing messages:', err);
        }
        
        // Clear UI messages as well
        setMessages([]);
        
        // Create welcome messages
        const welcomeMessages: string[] = [];
        
        // Start with a positive, congratulatory tone
        welcomeMessages.push(`👋 Congratulations! Your setup is complete. I'm ${assistantName || "your M8"}, your personal AI goal coach.`);
        
        // Add customized goal information
        if (userGoals.length > 0) {
          if (userGoals.length === 1) {
            welcomeMessages.push(`I've created a goal for you called "${userGoals[0]}".`);
            
            // Add goal-specific action suggestions based on the goal type
            const goalLower = userGoals[0].toLowerCase();
            
            if (goalLower.includes('depress') || goalLower.includes('mood') || goalLower.includes('mental')) {
              welcomeMessages.push(`For your "${userGoals[0]}" goal, here are some daily actions I recommend:`);
              welcomeMessages.push(`1. "10-minute morning meditation" - Starting your day with mindfulness can help manage symptoms of depression`);
              welcomeMessages.push(`2. "Daily outdoor walk" - Exercise and sunlight are proven to help with mood regulation`);
              welcomeMessages.push(`3. "Gratitude journaling" - Writing down 3 things you're grateful for can shift your perspective`);
            } 
            else if (goalLower.includes('anxiety') || goalLower.includes('stress')) {
              welcomeMessages.push(`For your "${userGoals[0]}" goal, here are some daily actions I recommend:`);
              welcomeMessages.push(`1. "Deep breathing practice" - 5 minutes of deep breathing can help reduce anxiety`);
              welcomeMessages.push(`2. "Limit social media" - Reducing exposure to stressful content can help manage anxiety`);
              welcomeMessages.push(`3. "Progressive muscle relaxation" - This technique can help relieve physical tension`);
            }
            else if (goalLower.includes('exercise') || goalLower.includes('fit') || goalLower.includes('health')) {
              welcomeMessages.push(`For your "${userGoals[0]}" goal, here are some actions I recommend:`);
              welcomeMessages.push(`1. "30-minute workout" (daily) - Consistent exercise is key to fitness progress`);
              welcomeMessages.push(`2. "10,000 steps" (daily) - Walking is an excellent foundation for fitness`);
              welcomeMessages.push(`3. "Meal prep" (weekly) - Preparing healthy meals in advance supports your fitness goals`);
            }
            else if (goalLower.includes('habit') || goalLower.includes('routine')) {
              welcomeMessages.push(`For your "${userGoals[0]}" goal, here are some actions I recommend:`);
              welcomeMessages.push(`1. "Morning routine checklist" - Creating consistency in your mornings`);
              welcomeMessages.push(`2. "Evening wind-down" - Establishing a calming pre-sleep routine`);
              welcomeMessages.push(`3. "Weekly review" (weekly) - Reflecting on your progress and planning ahead`);
            }
            else if (goalLower.includes('productiv') || goalLower.includes('focus') || goalLower.includes('work')) {
              welcomeMessages.push(`For your "${userGoals[0]}" goal, here are some actions I recommend:`);
              welcomeMessages.push(`1. "Two-hour focus block" - Dedicated time without distractions`);
              welcomeMessages.push(`2. "Daily prioritization" - Setting your top 3 tasks each morning`);
              welcomeMessages.push(`3. "Digital detox hour" - Taking breaks from screens to reset your focus`);
            }
            else if (goalLower.includes('sleep')) {
              welcomeMessages.push(`For your "${userGoals[0]}" goal, here are some actions I recommend:`);
              welcomeMessages.push(`1. "No screens before bed" - Reducing blue light exposure 1 hour before sleep`);
              welcomeMessages.push(`2. "Consistent bedtime routine" - Going to bed at the same time each night`);
              welcomeMessages.push(`3. "Morning sunlight exposure" - Getting early sunlight helps regulate your circadian rhythm`);
            }
            else {
              // Generic suggestions for any other goal
              welcomeMessages.push(`I'd like to suggest some actions to help with your "${userGoals[0]}" goal:`);
              welcomeMessages.push(`1. "Daily progress check-in" - Reflect on your progress each day`);
              welcomeMessages.push(`2. "Weekly planning session" (weekly) - Set intentions and plan your week`);
              welcomeMessages.push(`3. "Celebrate small wins" - Acknowledge your progress, no matter how small`);
            }
          } 
          else {
            // Multiple goals
            welcomeMessages.push(`I've created these goals for you: ${userGoals.join(', ')}.`);
            welcomeMessages.push(`Let me suggest some specific actions for each of your goals:`);
            
            // Provide suggestions for each goal
            userGoals.forEach((goal, index) => {
              const goalLower = goal.toLowerCase();
              
              if (goalLower.includes('depress') || goalLower.includes('mood') || goalLower.includes('mental')) {
                welcomeMessages.push(`For your "${goal}" goal:`);
                welcomeMessages.push(`• "10-minute morning meditation" (daily)`);
                welcomeMessages.push(`• "Outdoor walk" (daily)`);
              } 
              else if (goalLower.includes('anxiety') || goalLower.includes('stress')) {
                welcomeMessages.push(`For your "${goal}" goal:`);
                welcomeMessages.push(`• "Deep breathing practice" (daily)`);
                welcomeMessages.push(`• "Limit social media" (daily)`);
              }
              else if (goalLower.includes('exercise') || goalLower.includes('fit') || goalLower.includes('health')) {
                welcomeMessages.push(`For your "${goal}" goal:`);
                welcomeMessages.push(`• "30-minute workout" (daily)`);
                welcomeMessages.push(`• "Healthy meal prep" (weekly)`);
              }
              else if (goalLower.includes('sleep')) {
                welcomeMessages.push(`For your "${goal}" goal:`);
                welcomeMessages.push(`• "No screens before bed" (daily)`);
                welcomeMessages.push(`• "Consistent bedtime" (daily)`);
              }
              else {
                welcomeMessages.push(`For your "${goal}" goal:`);
                welcomeMessages.push(`• "Daily check-in" (daily)`);
                welcomeMessages.push(`• "Weekly planning" (weekly)`);
              }
            });
          }
          
          welcomeMessages.push(`Would you like me to create any of these suggested actions for you? I can set them up right away to help you start making progress on your goals.`);
        } 
        else {
          // No goals yet
          welcomeMessages.push(`I notice you don't have any goals set up yet. Would you like me to help you create your first goal? What's something you'd like to work on or improve?`);
        }
          
        // Create welcome message content
        const welcomeContent = welcomeMessages.join('\n\n');
        
        // Generate a database-friendly ID (no UUIDs to avoid duplicates)
        const dbMessageId = `welcome-${Date.now()}`;
        console.log('Creating welcome message with ID:', dbMessageId);
        
        // First, directly insert into database
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            id: dbMessageId,
            user_id: user.id,
            conversation_id: currentConversationId,
            role: 'assistant',
            content: welcomeContent,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select();
          
        if (error) {
          console.error('Error saving welcome message to database:', error);
          throw error;
        }
        
        console.log('Welcome message saved to database successfully:', data);
        
        // Create message object for UI with same ID
        const assistantMessage: Message = {
          id: dbMessageId,
          role: "assistant",
          content: welcomeContent,
          timestamp: new Date().toISOString(),
        };
        
        // Update the UI with the message
        setMessages([assistantMessage]);
        
        // Wait a moment before trying to speak
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Ensure we're still in the current conversation
        if (currentConversationId) {
          // Force reload messages from database
          await loadMessages(currentConversationId);
          
          // Try to speak the welcome message
          console.log('Speaking welcome message...');
          setIsLoadingAudio(true);
          stopSpeaking(); // Stop any existing speech first
          await new Promise(resolve => setTimeout(resolve, 300)); // Wait for speech to stop
          
          try {
            // Speak only the first paragraph to avoid overwhelming the browser
            const firstParagraph = welcomeMessages[0] + (welcomeMessages.length > 1 ? '\n\n' + welcomeMessages[1] : '');
            updateLastSpokenRefs(dbMessageId, firstParagraph);
            await speakSimpleText(firstParagraph, dbMessageId);
          } catch (speechError) {
            console.error('Error speaking welcome message:', speechError);
          } finally {
            setIsLoadingAudio(false);
          }
        }
      } catch (error) {
        console.error('Error creating welcome message:', error);
        toast.error("Error setting up your assistant. Please refresh the page.");
      }
    };
    
    // Add a small delay to ensure conversation is fully loaded
    const timer = setTimeout(() => {
      handleWelcomeConversation();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user, currentConversationId, assistantName, setMessages, stopSpeaking, speakSimpleText, updateLastSpokenRefs, loadMessages]);

  // Handle changing conversations
  const handleConversationChange = (conversationId: string) => {
    // Reset initialLoadRef to prevent TTS from speaking when loading an existing conversation
    initialLoadRef.current = true;
    
    // Set the current conversation ID
    // The useEffect in useConversations will handle loading messages
    setCurrentConversationId(conversationId);
  };

  // Play a message when clicked - minimal implementation
  const handlePlayMessage = (messageContent: string, messageId: string) => {
    // Always stop current speech first
    stopSpeaking();
    
    // Toggle behavior - if we were playing this message, just stop
    if (lastSpokenRef.current === messageId) {
      console.log(`Stopping playback of message: ${messageId}`);
      lastSpokenRef.current = null;
      return;
    }
    
    // Show loading indicator
    setIsLoadingAudio(true);
    
    try {
      // Use only the first paragraph for better reliability
      const paragraphs = messageContent.split('\n\n');
      const textToSpeak = paragraphs[0] || messageContent;
      
      // Speak the text after a small delay
      setTimeout(() => {
        speakSimpleText(textToSpeak, messageId);
        setIsLoadingAudio(false);
      }, 300);
    } catch (error) {
      console.error('Error preparing speech:', error);
      setIsLoadingAudio(false);
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-4 flex-1 min-h-0">
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
            "lg:col-span-3 flex flex-col h-[calc(100vh-10rem)] relative",
            showChatHistory ? "hidden lg:flex" : "flex"
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
                  stopSpeaking={stopSpeaking}
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

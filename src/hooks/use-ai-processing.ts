import { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid';
import { processMessage } from '@/lib/api';
import { Message, Goal, Action } from '@/pages/AI/types';

interface UseAIProcessingProps {
  goals: Goal[] | undefined;
  actions: Action[] | undefined;
  onRefreshActions?: () => void;
  userNickname?: string;
  userId?: string;
}

export function useAIProcessing({
  goals = [],
  actions = [],
  onRefreshActions,
  userNickname = "",
  userId
}: UseAIProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Process a user message and get AI response
  const processUserMessage = async (
    message: string,
    conversationContext: Message[] = []
  ): Promise<Message> => {
    if (!message || isProcessing) {
      throw new Error("Cannot process empty message or already processing");
    }

    setIsProcessing(true);

    try {
      // Use the API service to process messages through the backend
      console.log("[processUserMessage] Calling processMessage for:", message);
      const response = await processMessage(message, {
        goals: goals || [],
        actions: actions || [],
        conversation: conversationContext.slice(-10), // Send the last 10 messages for context
        userNickname: userNickname,
        userId: userId
      });

      // Create AI message
      const aiMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString()
      };
      
      console.log("[processUserMessage] Got AI response:", aiMessage.content);
      
      // Handle any special actions from the AI
      if (response.action) {
        toast.success(response.action);
        
        // Refresh data if needed
        if (response.refresh && onRefreshActions) {
          onRefreshActions();
        }
      }

      return aiMessage;
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Return error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      };
      
      toast.error("Failed to process your request");
      return errorMessage;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processUserMessage
  };
}

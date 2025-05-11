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

// Stream assistant reply from backend, updating content in real time
export async function processUserMessageStream(
  message: string,
  conversationContext: Message[] = [],
  {
    goals = [],
    actions = [],
    userNickname = '',
    userId = '',
    model = 'gpt-4',
    temperature = 0.7,
    max_tokens = 1000,
    onStream,
  }: {
    goals?: Goal[];
    actions?: Action[];
    userNickname?: string;
    userId?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    onStream?: (partial: string) => void;
  } = {}
): Promise<Message> {
  if (!message) throw new Error('Cannot process empty message');

  // Prepare the messages array for the backend
  const messages = [
    ...conversationContext.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  // POST to the streaming endpoint
  const response = await fetch('/.netlify/functions/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model,
      temperature,
      max_tokens
    })
  });

  if (!response.body) throw new Error('No response body from streaming endpoint');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;
  let buffer = '';
  let fullContent = '';

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      // Parse SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const data = trimmed.replace('data:', '').trim();
          if (data === '[DONE]') {
            done = true;
            break;
          }
          try {
            const json = JSON.parse(data);
            if (json.error) {
              // If the backend sent an error, show it in the chat bubble
              fullContent = `Error: ${json.error}`;
              if (onStream) onStream(fullContent);
              done = true;
              break;
            }
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              if (onStream) onStream(fullContent);
            }
          } catch (err) {
            // Ignore JSON parse errors for non-data lines
          }
        }
      }
    }
    done = done || doneReading;
  }

  // Return the final message
  return {
    id: uuidv4(),
    role: 'assistant',
    content: fullContent,
    timestamp: new Date().toISOString(),
  };
}

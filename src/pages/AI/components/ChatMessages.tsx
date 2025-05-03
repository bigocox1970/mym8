import React, { useRef, useEffect, useState } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/pages/AI/types';

interface ChatMessagesProps {
  messages: Message[];
  onPlayMessage?: (messageContent: string, messageId: string) => void;
}

export function ChatMessages({ messages, onPlayMessage }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(null);

  // Add CSS class for hiding scrollbar
  useEffect(() => {
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMessageClick = (message: Message) => {
    if (!onPlayMessage) return;
    
    // Only assistant messages can be played back
    if (message.role === 'assistant') {
      setLoadingMessageId(message.id);
      
      // Simulate loading state for demo purposes
      setTimeout(() => {
        setLoadingMessageId(null);
        setPlayingMessageId(message.id);
        // Also set as last played message
        setLastPlayedMessageId(message.id);
        onPlayMessage(message.content, message.id);
        
        // Reset playing state after a few seconds to simulate playback
        setTimeout(() => {
          setPlayingMessageId(null);
          // Note: we intentionally don't reset lastPlayedMessageId
        }, 3000);
      }, 500);
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-full">
        {messages.map((message) => (
          <div
            key={message.id}
            onClick={() => handleMessageClick(message)}
            className={cn(
              "flex w-max max-w-[85%] sm:max-w-[90%] rounded-lg px-3 sm:px-4 py-2 sm:py-3",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : message.role === "assistant" && (
                  loadingMessageId === message.id
                    ? "animate-pulse bg-green-100 dark:bg-green-900/20 ring-2 ring-green-500"
                    : playingMessageId === message.id
                      ? "bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500 animate-pulse"
                      : lastPlayedMessageId === message.id
                        ? "bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500"
                        : "bg-muted text-foreground hover:bg-muted/80"
                ),
              message.role === "assistant" && "cursor-pointer"
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
              <div className="relative">
                <p className="text-sm whitespace-pre-line break-words">{message.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] sm:text-xs opacity-50">
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}

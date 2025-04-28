import React, { useRef, useEffect } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/pages/AI/types';

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-full">
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
  );
}

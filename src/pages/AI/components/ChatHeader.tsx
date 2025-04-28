import React from 'react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, History, MoreVertical, Plus, ArrowLeft, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  title: string;
  showChatHistory: boolean;
  setShowChatHistory: (show: boolean) => void;
  onNewConversation: () => void;
  onClearConversation: () => void;
  onDeleteConversation: () => void;
}

export function ChatHeader({
  title,
  showChatHistory,
  setShowChatHistory,
  onNewConversation,
  onClearConversation,
  onDeleteConversation
}: ChatHeaderProps) {
  return (
    <CardHeader className="px-2 sm:px-4 py-2 sm:py-3 flex flex-row items-center justify-between shrink-0 bg-background/95 dark:bg-background/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5" />
        <CardTitle className="text-base">
          {title}
        </CardTitle>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setShowChatHistory(true)}
        >
          <History className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onNewConversation}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearConversation}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDeleteConversation}
              className="text-red-500 focus:text-red-500"
            >
              <X className="h-4 w-4 mr-2" />
              Delete Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
  );
}

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, Plus, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Conversation } from '@/pages/AI/types';

interface ChatHistoryProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  showChatHistory: boolean;
  setShowChatHistory: (show: boolean) => void;
  setCurrentConversationId: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversations?: (ids: string[]) => void;
}

export function ChatHistory({
  conversations,
  currentConversationId,
  showChatHistory,
  setShowChatHistory,
  setCurrentConversationId,
  onNewConversation,
  onDeleteConversations
}: ChatHistoryProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  
  // Group conversations by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
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
              "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors",
              currentConversationId === conversation.id ? "bg-muted/70 dark:bg-muted/50" : ""
            )}
            onClick={() => {
              if (isEditMode) {
                // In edit mode, toggle selection
                if (selectedConversations.includes(conversation.id)) {
                  setSelectedConversations(prev => prev.filter(id => id !== conversation.id));
                } else {
                  setSelectedConversations(prev => [...prev, conversation.id]);
                }
              } else {
                // Normal mode, select conversation
                setCurrentConversationId(conversation.id);
                setShowChatHistory(false);
              }
            }}
          >
            <div className="flex items-center space-x-2 truncate w-full">
              {isEditMode ? (
                <Checkbox 
                  checked={selectedConversations.includes(conversation.id)}
                  className="mr-2"
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedConversations(prev => [...prev, conversation.id]);
                    } else {
                      setSelectedConversations(prev => prev.filter(id => id !== conversation.id));
                    }
                  }}
                />
              ) : (
                <Bot className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate">{conversation.title || "Untitled Conversation"}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn(
      "border-none shadow-md overflow-hidden transition-all duration-200 h-full bg-background/95 dark:bg-background/90",
      showChatHistory 
        ? "block fixed inset-0 z-50 md:relative md:z-auto md:col-span-1" 
        : "hidden md:block md:col-span-1"
    )}>
      <CardHeader className="px-3 py-2 sm:py-4 flex flex-row items-center justify-between sticky top-0 bg-card z-10 border-b">
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
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setIsEditMode(!isEditMode)}
            className={isEditMode ? "bg-muted" : ""}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onNewConversation}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-y-auto no-scrollbar h-[calc(100vh-14rem)] relative">
        {conversations.length > 0 ? (
          <>
            {renderGroup("Today", todayConvos)}
            {renderGroup("Yesterday", yesterdayConvos)}
            {renderGroup("Last 7 Days", lastWeekConvos)}
            {renderGroup("Older", olderConvos)}
          </>
        ) : (
          <div className="px-3 py-6 text-center text-muted-foreground">
            <p>No conversations yet</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={onNewConversation}
            >
              Start a new chat
            </Button>
          </div>
        )}
        
        {/* Delete button for edit mode */}
        {isEditMode && selectedConversations.length > 0 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <Button 
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                if (onDeleteConversations) {
                  onDeleteConversations(selectedConversations);
                  setSelectedConversations([]);
                  setIsEditMode(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete {selectedConversations.length} {selectedConversations.length === 1 ? 'conversation' : 'conversations'}</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

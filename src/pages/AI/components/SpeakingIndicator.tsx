import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, X } from 'lucide-react';

interface SpeakingIndicatorProps {
  isSpeaking: boolean;
  onStop: () => void;
}

export function SpeakingIndicator({ isSpeaking, onStop }: SpeakingIndicatorProps) {
  if (!isSpeaking) return null;
  
  return (
    <div className="fixed bottom-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1 shadow-md z-50">
      <Volume2 className="h-4 w-4 animate-pulse" />
      <span>Speaking...</span>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 p-0 ml-1" 
        onClick={onStop}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

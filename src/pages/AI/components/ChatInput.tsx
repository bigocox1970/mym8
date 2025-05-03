import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  isVoiceEnabled: boolean;
  toggleVoiceMode: () => void;
  isListening: boolean;
  toggleListening: () => void;
  isLoadingAudio?: boolean;
  isSpeaking?: boolean;
  isSubmitting?: boolean;
}

export function ChatInput({
  input,
  setInput,
  isProcessing,
  onSubmit,
  isVoiceEnabled,
  toggleVoiceMode,
  isListening,
  toggleListening,
  isLoadingAudio = false,
  isSpeaking = false,
  isSubmitting = false
}: ChatInputProps) {
  return (
    <div className="p-2 sm:p-3">
      <form onSubmit={onSubmit} className="w-full flex flex-col space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your assistant..."
            className="resize-none min-h-[45px] sm:min-h-[60px]"
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleVoiceMode}
            title={isVoiceEnabled ? "Disable voice responses" : "Enable voice responses"}
            className={cn(
              isLoadingAudio && "animate-pulse",
              isSpeaking && "bg-green-100 text-green-600 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
              isVoiceEnabled && !isSpeaking && "bg-primary/10"
            )}
            type="button"
          >
            {isVoiceEnabled ? (
              <Volume2 className={cn("h-4 w-4", isSpeaking && "animate-pulse text-green-600 dark:text-green-400")} />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline" 
            size="icon"
            onClick={toggleListening}
            disabled={isProcessing}
            title={isListening ? "Stop listening" : "Start listening"}
            className={cn(
              isListening && "bg-green-100 text-green-600 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
              isListening && "animate-pulse"
            )}
            type="button"
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            type="submit" 
            disabled={isProcessing || !input.trim()} 
            className={cn(
              "px-3 sm:px-4",
              isSubmitting && "bg-green-600 hover:bg-green-700 animate-pulse"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

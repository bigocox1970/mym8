import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  isVoiceEnabled: boolean;
  toggleVoiceMode: () => void;
  isListening: boolean;
  toggleListening: () => void;
}

export function ChatInput({
  input,
  setInput,
  isProcessing,
  onSubmit,
  isVoiceEnabled,
  toggleVoiceMode,
  isListening,
  toggleListening
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
            className={`${isVoiceEnabled ? 'bg-primary/10' : ''}`}
            type="button"
          >
            {isVoiceEnabled ? (
              <Volume2 className="h-4 w-4" />
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
            className={`${isListening ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
            type="button"
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          <Button type="submit" disabled={isProcessing || !input.trim()} className="px-3 sm:px-4">
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

import React, { useRef, useEffect, useState } from 'react';
import { Bot, User, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/pages/AI/types';
import { getConfig } from '@/lib/configManager';
import { textToSpeech } from '@/lib/api';
import { getCachedAudioAsync, cacheAudioAsync } from '@/lib/audioCache';

interface ChatMessagesProps {
  messages: Message[];
  onPlayMessage?: (messageContent: string, messageId: string) => void;
  streamVersion?: number;
}

// Simple in-memory cache for last 10 audio blobs/URLs
const audioCache = new Map<string, string>(); // messageId -> audioUrl
const MAX_CACHE = 10;

export function ChatMessages({ messages, onPlayMessage, streamVersion }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [audioStates, setAudioStates] = useState<Record<string, 'idle' | 'loading' | 'ready' | 'playing'>>({});
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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

  // On mount or messages change, set state to 'ready' for cached messages
  useEffect(() => {
    (async () => {
      for (const message of messages) {
        if (message.role === 'assistant') {
          const cached = await getCachedAudioAsync(message.id);
          console.log('[AUDIO CACHE DEBUG] Checking cache for message', message.id, 'found:', !!cached);
          if (cached) {
            setAudioState(message.id, 'ready');
          }
        }
      }
    })();
    // eslint-disable-next-line
  }, [messages]);

  // Helper to update state for a message
  const setAudioState = (id: string, state: 'idle' | 'loading' | 'ready' | 'playing') => {
    setAudioStates((prev) => ({ ...prev, [id]: state }));
  };

  // Helper to cache audio, keep only last 10
  const cacheAudio = (id: string, url: string) => {
    if (!audioCache.has(id)) {
      if (audioCache.size >= MAX_CACHE) {
        // Remove oldest
        const oldest = audioCache.keys().next().value;
        URL.revokeObjectURL(audioCache.get(oldest)!);
        audioCache.delete(oldest);
      }
      audioCache.set(id, url);
    }
  };

  // Helper to get last 10 assistant message IDs
  const getLast10AssistantIds = () => {
    return messages.filter(m => m.role === 'assistant').slice(-10).map(m => m.id);
  };

  // Real TTS API call
  const fetchTTS = async (text: string) => {
    const config = getConfig();
    const service = config.voice_service || 'openai';
    let voice = 'alloy';
    if (service === 'openai') voice = config.openai_voice || 'alloy';
    if (service === 'elevenlabs') voice = config.elevenlabs_voice || 'rachel';
    if (service === 'google') voice = config.google_voice || 'en-US-Neural2-F';
    if (service === 'azure') voice = config.azure_voice || 'en-US-JennyNeural';
    if (service === 'amazon') voice = config.amazon_voice || 'Joanna';
    try {
      const response = await textToSpeech(text, service, { voice });
      if (response instanceof Blob) {
        return response;
      } else {
        // If it's a URL, fetch the blob
        const audioResponse = await fetch(response);
        return await audioResponse.blob();
      }
    } catch (e) {
      throw new Error('TTS failed');
    }
  };

  // Handle speaker icon click
  const handleSpeakerClick = async (message: Message) => {
    if (message.role !== 'assistant') return;
    const id = message.id;
    // If already playing, stop
    if (audioStates[id] === 'playing') {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      setAudioState(id, 'ready');
      return;
    }
    // If cached in memory or IndexedDB, play
    const cached = await getCachedAudioAsync(id);
    if (cached) {
      const url = URL.createObjectURL(cached);
      playAudio(id, url);
      return;
    }
    // Not cached: fetch from API
    setAudioState(id, 'loading');
    try {
      const blob = await fetchTTS(message.content);
      await cacheAudioAsync(id, blob, getLast10AssistantIds());
      const url = URL.createObjectURL(blob);
      setAudioState(id, 'ready');
      playAudio(id, url);
    } catch (e) {
      setAudioState(id, 'idle');
    }
  };

  // Play audio and update state
  const playAudio = (id: string, url: string) => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      // Set all playing states to 'ready'
      setAudioStates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key] === 'playing') updated[key] = 'ready';
        });
        return updated;
      });
    }
    const audio = new Audio(url);
    setCurrentAudio(audio);
    setAudioState(id, 'playing');
    audio.onended = () => {
      setAudioState(id, 'ready');
      setCurrentAudio(null);
    };
    audio.onerror = () => {
      setAudioState(id, 'ready');
      setCurrentAudio(null);
    };
    audio.play();
  };

  // Determine border class based on state
  const getBorderClass = (id: string) => {
    const state = audioStates[id];
    if (state === 'loading') return 'ring-2 ring-amber-500 animate-pulse';
    if (state === 'ready') return 'ring-2 ring-green-500';
    if (state === 'playing') return 'ring-2 ring-green-500 animate-pulse';
    return '';
  };

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
                : "bg-muted text-foreground",
              message.role === "assistant" && getBorderClass(message.id)
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
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] sm:text-xs opacity-50">
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => handleSpeakerClick(message)}
                      className={cn(
                        'ml-2 p-1 rounded-full border border-transparent hover:bg-green-100 focus:outline-none',
                        audioStates[message.id] === 'playing' && 'bg-green-200',
                        audioStates[message.id] === 'loading' && 'bg-amber-100',
                        audioStates[message.id] === 'ready' && 'bg-green-100'
                      )}
                      title="Play message audio"
                    >
                      <Volume2 className="h-4 w-4 text-green-700" />
                    </button>
                  )}
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

// Speech Recognition type definitions
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionError extends Event {
  error: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
    speechSynthesisHasInteracted?: boolean;
  }
}

// Data types
export interface Conversation {
  id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  conversation_id?: string;
}

export interface Goal {
  id: string;
  goal_text: string;
  description: string | null;
  notes: string | null;
}

export interface Action {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  skipped: boolean;
  goal_id: string;
  frequency: string;
}

/**
 * Personality type definitions for the MyM8 app
 */

export interface PersonalityBook {
  title: string;
  description: string;
  year?: number;
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  prompt: string;
  quotes: string[];
  books?: PersonalityBook[];
}

// Export all personality IDs
export type PersonalityType =
  | "gentle"
  | "direct" 
  | "sarcastic"
  | "motivational"
  | "analytical"
  | "waynedyer"
  | "estherhicks"
  | "alanwatts"
  | "earlnightingale"
  | "napoleonhill"
  | "georgecarlin"
  | "adaptive"; 
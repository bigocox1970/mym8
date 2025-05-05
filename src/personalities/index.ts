import { Personality, PersonalityType } from './types';
import gentle from './gentle';
import direct from './direct';
import sarcastic from './sarcastic';
import motivational from './motivational';
import analytical from './analytical';
import waynedyer from './waynedyer';
import estherhicks from './estherhicks';
import alanwatts from './alanwatts';
import earlnightingale from './earlnightingale';
import napoleonhill from './napoleonhill';
import georgecarlin from './georgecarlin';
import adaptive from './adaptive';

// Map of all personalities by ID
export const PERSONALITIES: Record<PersonalityType, Personality> = {
  gentle,
  direct,
  sarcastic,
  motivational,
  analytical,
  waynedyer,
  estherhicks,
  alanwatts,
  earlnightingale,
  napoleonhill,
  georgecarlin,
  adaptive
};

// Helper function to get a personality by ID
export const getPersonality = (id: PersonalityType): Personality => {
  return PERSONALITIES[id];
};

// Helper function to get all personality options for dropdown menus
export const getPersonalityOptions = () => {
  return Object.values(PERSONALITIES).map(p => ({
    value: p.id,
    label: p.name,
    description: p.description
  }));
};

// Get a random quote from a specific personality
export const getRandomQuote = (personalityId: PersonalityType) => {
  const personality = PERSONALITIES[personalityId];
  if (!personality) return '';
  
  const randomIndex = Math.floor(Math.random() * personality.quotes.length);
  return personality.quotes[randomIndex];
};

// Get a random quote from any personality
export const getRandomQuoteFromAny = () => {
  const personalityIds = Object.keys(PERSONALITIES) as PersonalityType[];
  const randomPersonalityId = personalityIds[Math.floor(Math.random() * personalityIds.length)];
  return getRandomQuote(randomPersonalityId);
};

export * from './types';
export {
  gentle,
  direct,
  sarcastic,
  motivational,
  analytical,
  waynedyer,
  estherhicks,
  alanwatts,
  earlnightingale,
  napoleonhill,
  georgecarlin,
  adaptive
}; 
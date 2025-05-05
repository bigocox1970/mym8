import { getPersonalityData } from '../config/prompts';
import { PersonalityType } from '../personalities';

/**
 * LLM Functions
 * 
 * This file contains functions that can be called by the LLM to perform specific actions.
 * These functions are registered with the OpenAI API as function calls.
 */

// Function to get personality data from a specific personality type
export const getPersonalityInfo = async (personalityId: PersonalityType) => {
  try {
    return getPersonalityData(personalityId);
  } catch (error) {
    return {
      error: `Failed to retrieve personality data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Function to get a random quote from a specific personality
export const getPersonalityQuote = async (personalityId: PersonalityType) => {
  try {
    const personality = getPersonalityData(personalityId);
    if ('error' in personality) {
      return { error: personality.error };
    }
    
    // Get a random quote
    const randomIndex = Math.floor(Math.random() * personality.quotes.length);
    return {
      quote: personality.quotes[randomIndex],
      author: personality.name
    };
  } catch (error) {
    return {
      error: `Failed to retrieve personality quote: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Function to get all available personality types
export const getAvailablePersonalities = async () => {
  try {
    // Import all personalities dynamically to avoid circular dependencies
    const { getPersonalityOptions } = await import('../personalities');
    return {
      personalities: getPersonalityOptions()
    };
  } catch (error) {
    return {
      error: `Failed to retrieve available personalities: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Function to get recommended books from a personality
export const getPersonalityBooks = async (personalityId: PersonalityType) => {
  try {
    const personality = getPersonalityData(personalityId);
    if ('error' in personality) {
      return { error: personality.error };
    }
    
    return {
      books: personality.books || [],
      author: personality.name
    };
  } catch (error) {
    return {
      error: `Failed to retrieve personality books: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}; 
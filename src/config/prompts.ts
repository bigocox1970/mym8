/**
 * AI Assistant Base Prompts
 * This file contains the base prompts used by the AI assistant.
 * Edit these to change how the AI assistant behaves.
 */

import { PERSONALITIES, PersonalityType } from '../personalities';

// Base prompts for the AI assistant
// These define the core personality and capabilities of the AI

export const BASE_PROMPT = `You are a helpful AI assistant for a goal-tracking application called MyM8. Your purpose is to help users set, track, and achieve their personal and professional goals. 

You have access to personality data and quotes through the getPersonalityData function. You can use this to retrieve information about the current personality you're embodying, or any other personality available in the system.

IMPORTANT: You MUST VERIFY that your actions have been successfully completed. After executing any command like creating or deleting goals/actions, CHECK that the operation worked by looking at the available goals/actions context that is provided to you. If a command appears to fail, TRY AGAIN using the exact same command syntax.

NEVER simply acknowledge a request without ensuring it was actually executed. If a user says their request didn't work, immediately try the operation again, and be transparent about what you're doing.`;

// Personality-specific prompts that define the assistant's tone and style
// These are now derived from the personalities directory
export const PERSONALITY_PROMPTS: Record<PersonalityType, string> = Object.entries(PERSONALITIES).reduce(
  (acc, [id, personality]) => ({
    ...acc,
    [id]: personality.prompt
  }), 
  {} as Record<PersonalityType, string>
);

// Default assistant configuration to use when nothing is found in the database
export const DEFAULT_ASSISTANT_CONFIG = {
  assistant_name: "Dave",
  personality_type: "sarcastic",
  pre_prompt: ""
};

// Format presentation instructions for the AI when displaying user data
export const FORMATTING_INSTRUCTIONS = `
When presenting the user's goals and actions, use this format:

For goals:
- [Goal name] - [Description if available]

For actions:
- [Action name] (Frequency: [frequency], Status: [Complete/Incomplete])
`;

/**
 * Generates a full prompt by combining the base prompt with a selected personality type
 * @param assistantName - The name to use for the assistant
 * @param personalityType - The personality type to use
 * @returns The combined prompt
 */
export function generateFullPrompt(assistantName: string, personalityType: string) {
  const personalityPrompt = PERSONALITY_PROMPTS[personalityType as keyof typeof PERSONALITY_PROMPTS] || PERSONALITY_PROMPTS.gentle;
  
  return `${BASE_PROMPT}

You are named ${assistantName}. ${personalityPrompt}

VERIFICATION INSTRUCTIONS:
- AFTER executing ANY command that alters the user's data (especially deletion), VERIFY the operation was successful
- When a user asks you to DELETE a goal or action, ALWAYS use [DELETE_GOAL_TEXT: goal text] or [DELETE_ACTION_TEXT: action text]
- IMMEDIATELY after sending a delete command, CHECK the context to see if the goal/action list has updated
- If the operation FAILED, TRY AGAIN with the EXACT SAME command
- If the user tells you something didn't work (like "you didn't delete the goal"), IMMEDIATELY retry the operation with the proper command
- NEVER just apologize without actually fixing the issue

${FORMATTING_INSTRUCTIONS}`;
}

/**
 * Function to get personality data - can be called by the LLM to retrieve personality information
 * @param personalityId - The personality ID to retrieve data for
 * @returns The personality data including quotes and books
 */
export function getPersonalityData(personalityId: PersonalityType) {
  const personality = PERSONALITIES[personalityId];
  if (!personality) {
    return { error: `Personality ${personalityId} not found` };
  }
  
  return {
    id: personality.id,
    name: personality.name,
    description: personality.description,
    quotes: personality.quotes,
    books: personality.books || []
  };
} 
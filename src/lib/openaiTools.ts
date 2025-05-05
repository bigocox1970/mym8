import { PersonalityType } from '../personalities';

/**
 * OpenAI Tool Definitions
 * 
 * This file contains definitions for OpenAI function calling that will be passed to the API.
 * These definitions allow the LLM to access personality data and quotes.
 */

// Tool definition for getting personality information
export const getPersonalityInfoTool = {
  type: "function",
  function: {
    name: "getPersonalityInfo",
    description: "Get detailed information about a specific personality type including description, quotes, and recommended books.",
    parameters: {
      type: "object",
      properties: {
        personalityId: {
          type: "string",
          description: "The ID of the personality to retrieve information for. Must be one of the available personality types.",
          enum: [
            "gentle", "direct", "sarcastic", "motivational", "analytical", 
            "waynedyer", "estherhicks", "alanwatts", "earlnightingale", 
            "napoleonhill", "georgecarlin"
          ]
        }
      },
      required: ["personalityId"]
    }
  }
};

// Tool definition for getting a random quote from a personality
export const getPersonalityQuoteTool = {
  type: "function",
  function: {
    name: "getPersonalityQuote",
    description: "Get a random inspirational quote from a specific personality type.",
    parameters: {
      type: "object",
      properties: {
        personalityId: {
          type: "string",
          description: "The ID of the personality to retrieve a quote from. Must be one of the available personality types.",
          enum: [
            "gentle", "direct", "sarcastic", "motivational", "analytical", 
            "waynedyer", "estherhicks", "alanwatts", "earlnightingale", 
            "napoleonhill", "georgecarlin"
          ]
        }
      },
      required: ["personalityId"]
    }
  }
};

// Tool definition for getting all available personalities
export const getAvailablePersonalitiesTool = {
  type: "function",
  function: {
    name: "getAvailablePersonalities",
    description: "Get a list of all available personality types with their names and descriptions.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
};

// Tool definition for getting book recommendations from a personality
export const getPersonalityBooksTool = {
  type: "function",
  function: {
    name: "getPersonalityBooks",
    description: "Get book recommendations from a specific personality type.",
    parameters: {
      type: "object",
      properties: {
        personalityId: {
          type: "string",
          description: "The ID of the personality to retrieve book recommendations from. Must be one of the available personality types.",
          enum: [
            "gentle", "direct", "sarcastic", "motivational", "analytical", 
            "waynedyer", "estherhicks", "alanwatts", "earlnightingale", 
            "napoleonhill", "georgecarlin"
          ]
        }
      },
      required: ["personalityId"]
    }
  }
};

// Export all tools together
export const personalityTools = [
  getPersonalityInfoTool,
  getPersonalityQuoteTool,
  getAvailablePersonalitiesTool,
  getPersonalityBooksTool
];

// Export a handler for tool calls
export const handlePersonalityToolCall = async (
  toolName: string, 
  parameters: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  // Import functions dynamically to avoid circular dependencies
  const { 
    getPersonalityInfo, 
    getPersonalityQuote,
    getAvailablePersonalities,
    getPersonalityBooks
  } = await import('../utils/llmFunctions');
  
  switch (toolName) {
    case 'getPersonalityInfo':
      return await getPersonalityInfo(parameters.personalityId as PersonalityType);
    
    case 'getPersonalityQuote':
      return await getPersonalityQuote(parameters.personalityId as PersonalityType);
    
    case 'getAvailablePersonalities':
      return await getAvailablePersonalities();
    
    case 'getPersonalityBooks':
      return await getPersonalityBooks(parameters.personalityId as PersonalityType);
    
    default:
      return {
        error: `Unknown tool: ${toolName}`
      };
  }
}; 
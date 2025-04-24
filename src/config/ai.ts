/**
 * AI Model Configuration
 * This file contains all AI model-related configurations for the application.
 * Edit this file to add new models, update descriptions, or change default settings.
 */

// Available AI models from OpenRouter
export const AI_MODELS = [
  {
    value: "gpt-4o",
    label: "GPT-4o (Recommended)",
    description: "OpenAI's multimodal model with great performance",
  },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    description: "Faster and more cost-effective for simpler tasks",
  },
  {
    value: "anthropic/claude-3-opus:beta",
    label: "Claude 3 Opus",
    description: "Anthropic's most powerful model with exceptional reasoning",
  },
  {
    value: "anthropic/claude-3-sonnet",
    label: "Claude 3 Sonnet",
    description: "Balanced blend of intelligence and speed",
  },
  {
    value: "google/gemini-pro",
    label: "Gemini Pro",
    description: "Google's advanced reasoning model",
  },
];

// Default AI model to use
export const DEFAULT_AI_MODEL = "gpt-4o";

// Function tool definitions for the AI assistant
export const AI_TOOLS = {
  create_goal: {
    name: "create_goal",
    description: "Create a new goal for the user",
    parameters: {
      type: "object",
      properties: {
        goalText: {
          type: "string",
          description: "The text describing the goal"
        },
        description: {
          type: "string",
          description: "Additional details about the goal"
        }
      },
      required: ["goalText"]
    }
  },
  add_action: {
    name: "add_action",
    description: "Add a new action item to an existing goal",
    parameters: {
      type: "object",
      properties: {
        goalId: {
          type: "string",
          description: "The ID of the goal to add the action to"
        },
        title: {
          type: "string",
          description: "The title of the action"
        },
        description: {
          type: "string",
          description: "Additional details about the action"
        },
        frequency: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "daily", "weekly", "monthly"],
          description: "How often the action should be performed"
        }
      },
      required: ["goalId", "title", "frequency"]
    }
  },
  complete_action: {
    name: "complete_action",
    description: "Mark an action as completed",
    parameters: {
      type: "object",
      properties: {
        actionId: {
          type: "string",
          description: "The ID of the action to mark as completed"
        }
      },
      required: ["actionId"]
    }
  }
};

// Default settings for AI API requests
export const AI_REQUEST_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 1000,
  stream: false,
  tool_choice: "auto"
}; 
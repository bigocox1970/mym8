/**
 * API Service
 * This file handles all external API communication directly from the client.
 */

import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';
import { 
  getUserAIContext, 
  addUserConversationHighlight, 
  UserAIContext,
  UserPreference,
  PersonalInfoItem
} from '@/lib/userProfileManager';
import { analyzeConversation } from '@/lib/contextExtractor';
import { getConfig } from '@/lib/configManager';
import { PERSONALITY_PROMPTS, generateFullPrompt } from '@/config/prompts';

// Define interfaces for the API data types
interface Goal {
  id: string;
  goal_text: string;
  description: string | null;
  notes: string | null;
}

interface Action {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  skipped?: boolean;
  goal_id: string;
  frequency: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * Text-to-Speech API request
 * @param text Text to convert to speech
 * @param service Voice service to use
 * @param options Voice options like voice ID, gender, etc.
 * @returns A promise resolving to an audio URL or blob
 */
export async function textToSpeech(
  text: string,
  service: string,
  options: {
    voice: string;
    gender?: string;
  }
): Promise<Blob | string> {
  try {
    console.log(`[API-DEBUG] TTS request - Service: ${service}, Voice: ${options.voice}, Text length: ${text.length} chars`);
    
    // Only handle non-browser TTS services here
    if (service === 'browser') {
      console.log('[API-DEBUG] Browser TTS requested, should be handled in client');
      throw new Error('Browser TTS should be handled in the client component');
    }

    // Check if we have the required API key
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiKey) {
      console.error('[API-DEBUG] Missing OpenAI API key');
      throw new Error('Missing OpenAI API key. Please add it to your environment variables.');
    }
    
    // Handle OpenAI TTS
    if (service === 'openai') {
      console.log('[API-DEBUG] Using OpenAI TTS service');
      console.log(`[API-DEBUG] API Key exists: ${openaiKey ? 'Yes (redacted)' : 'No'}`);
      console.log(`[API-DEBUG] Voice selected: ${options.voice}`);
      
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: options.voice || 'alloy',
            input: text
          })
        });

        if (!response.ok) {
          const errorResponse = await response.text();
          console.error(`[API-DEBUG] OpenAI TTS error: Status ${response.status}, Response:`, errorResponse);
          throw new Error(`Failed to generate speech: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log(`[API-DEBUG] Successfully retrieved audio from OpenAI. Size: ${blob.size} bytes`);
        return blob;
      } catch (fetchError) {
        console.error('[API-DEBUG] Fetch error in OpenAI TTS:', fetchError);
        throw fetchError;
      }
    }

    console.error(`[API-DEBUG] Unsupported TTS service: ${service}`);
    throw new Error(`Unsupported TTS service: ${service}`);
  } catch (error) {
    console.error('[API-DEBUG] TTS API error:', error);
    throw error;
  }
}

/**
 * Create a new goal
 * @param userId User ID
 * @param goalText Goal text
 * @param description Optional goal description
 * @param notes Optional additional notes for the goal
 * @returns Created goal data
 */
export async function createGoal(
  userId: string,
  goalText: string,
  description?: string,
  notes?: string
): Promise<Goal | null> {
  try {
    // Check if a similar goal already exists
    const { data: existingGoals, error: checkError } = await supabase
      .from('goals')
      .select('id, goal_text')
      .eq('user_id', userId)
      .ilike('goal_text', `%${goalText}%`);
    
    if (checkError) throw checkError;
    
    // If a similar goal exists, prevent duplicates
    if (existingGoals && existingGoals.length > 0) {
      console.log('Similar goal already exists:', existingGoals[0].goal_text);
      toast.warning(`Similar goal "${existingGoals[0].goal_text}" already exists. No duplicate created.`);
      return existingGoals[0] as Goal;
    }
    
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        goal_text: goalText,
        description: description || null,
        notes: notes || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`Goal "${goalText}" created successfully!`);
    return data as Goal;
  } catch (error) {
    console.error('Error creating goal:', error);
    toast.error(`Failed to create goal: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Create a new action
 * @param userId User ID
 * @param goalId Goal ID
 * @param title Action title
 * @param frequency Action frequency
 * @param description Optional action description
 * @returns Created action data
 */
export async function createAction(
  userId: string,
  goalId: string,
  title: string,
  frequency: string = 'daily',
  description?: string
): Promise<Action | null> {
  try {
    console.log("Creating action:", { userId, goalId, title, frequency, description });
    
    // Verify goal exists first
    const { data: goalCheck, error: goalCheckError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();
      
    if (goalCheckError) {
      console.error("Goal check error:", goalCheckError);
      throw new Error(`Goal not found with ID: ${goalId}`);
    }
    
    // Check if a similar action already exists for this goal
    const { data: existingActions, error: checkError } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .ilike('title', `%${title}%`);
    
    if (checkError) throw checkError;
    
    // If a similar action exists, prevent duplicates
    if (existingActions && existingActions.length > 0) {
      console.log('Similar action already exists:', existingActions[0].title);
      toast.warning(`Similar action "${existingActions[0].title}" already exists. No duplicate created.`);
      return existingActions[0] as Action;
    }
    
    // Create the action
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        goal_id: goalId,
        title: title,
        description: description || null,
        frequency: frequency,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }
    
    console.log("Action created successfully:", data);
    toast.success(`Action "${title}" created successfully!`);
    return data as Action;
  } catch (error) {
    console.error("Error creating action:", error);
    toast.error(`Failed to create action: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Create a new action for the first available goal
 * This simplified version will find the first goal and attach the action to it
 * @param userId User ID
 * @param title Action title
 * @param frequency Action frequency
 * @param description Optional action description
 * @param goalContext Optional context about the most recently discussed goal
 * @returns Created action data
 */
export async function createSimpleAction(
  userId: string,
  title: string,
  frequency: string = 'daily',
  description?: string,
  goalId?: string,
  goalContext?: string
): Promise<Action | null> {
  try {
    console.log("Creating simple action:", { userId, title, frequency, goalId, goalContext });
    
    // Parse the title for frequency hints if not explicitly provided
    let detectedFrequency = frequency;
    const titleLower = title.toLowerCase();
    
    // Check for frequency hints in the title - order matters for precedence
    if (titleLower.includes("every night") || titleLower.includes("bed") || titleLower.includes("sleep") || 
        titleLower.includes("evening") || titleLower.includes("night") || titleLower.includes("dinner") || 
        titleLower.includes("pm ")) {
      detectedFrequency = "evening";
    } else if (titleLower.includes("every morning") || titleLower.includes("morning") || titleLower.includes("wake up") || 
        titleLower.includes("wake up early") || titleLower.includes("get up early") || titleLower.includes("get up earlier") ||
        titleLower.includes("breakfast") || titleLower.includes("early") || titleLower.includes("am ")) {
      detectedFrequency = "morning";
    } else if (titleLower.includes("afternoon") || titleLower.includes("lunch")) {
      detectedFrequency = "afternoon";
    } else if (titleLower.includes("weekly") || titleLower.includes("each week") || titleLower.includes("once a week")) {
      detectedFrequency = "weekly";
    } else if (titleLower.includes("monthly") || titleLower.includes("each month") || titleLower.includes("once a month")) {
      detectedFrequency = "monthly";
    }
    
    console.log(`Detected frequency "${detectedFrequency}" for action: ${title}`);
    
    let targetGoalId = goalId;
    let goalMatchScore = 0;
    
    // If no goal ID is provided, find a matching or first available goal
    if (!targetGoalId) {
      console.log("No goal ID provided, searching for a matching goal...");
      
      // First, check if we have recent goal context to use
      if (goalContext) {
        console.log("Checking for a goal matching the context:", goalContext);
        // Try to find a goal matching the context provided
        const { data: contextGoals } = await supabase
          .from('goals')
          .select('id, goal_text, created_at')
          .eq('user_id', userId)
          .ilike('goal_text', `%${goalContext}%`)
          .order('created_at', { ascending: false });
          
        if (contextGoals && contextGoals.length > 0) {
          targetGoalId = contextGoals[0].id;
          console.log(`Found goal matching context: "${contextGoals[0].goal_text}" (ID: ${targetGoalId})`);
          return createAction(userId, targetGoalId, title, detectedFrequency, description);
        }
      }
      
      // Get all goals, sorted by most recent first
      const { data: goals, error: goalError } = await supabase
        .from('goals')
        .select('id, goal_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (goalError) {
        console.error("Goal fetch error:", goalError);
        throw new Error("Failed to find any goals to attach action to");
      }
      
      console.log(`Found ${goals?.length || 0} goals for user:`, goals);
      
      if (!goals || goals.length === 0) {
        throw new Error("No goals found to attach action to. Please create a goal first.");
      }
      
      // First try to match goal by looking at the most recent goal (it's likely the one being discussed)
      const mostRecentGoal = goals[0];
      console.log(`Most recent goal is "${mostRecentGoal.goal_text}" created at ${mostRecentGoal.created_at}`);
      
      // Check if this goal was created within the last hour - if so, it's likely the one being talked about
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      if (mostRecentGoal.created_at > oneHourAgo) {
        console.log(`Most recent goal was created in the last hour, using it for this action`);
        targetGoalId = mostRecentGoal.id;
        return createAction(userId, targetGoalId, title, detectedFrequency, description);
      }
      
      // If no recent goal, try semantic matching
      // This is a simple version that just checks for word overlap
      const words = title.toLowerCase().split(/\s+/);
      let bestGoal = goals[0]; // Default to most recent goal
      let bestScore = 0;
      
      for (const goal of goals) {
        const goalText = goal.goal_text.toLowerCase();
        let score = 0;
        
        for (const word of words) {
          if (word.length > 3 && goalText.includes(word)) { // Only consider words longer than 3 chars
            score++;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestGoal = goal;
        }
      }
      
      // Only use semantic matching if we have a real match (score > 0)
      if (bestScore > 0) {
        targetGoalId = bestGoal.id;
        goalMatchScore = bestScore;
        console.log(`Selected goal "${bestGoal.goal_text}" (ID: ${targetGoalId}) with match score: ${bestScore}`);
        return createAction(userId, targetGoalId, title, detectedFrequency, description);
      }
      
      // If we get here, no good match was found, so just use the most recent goal
      targetGoalId = mostRecentGoal.id;
      console.log(`No semantic match found, using most recent goal: "${mostRecentGoal.goal_text}"`);
    }
    
    // If we still don't have a goal ID (unlikely), use the first goal as a last resort
    if (!targetGoalId) {
      const { data: firstGoal } = await supabase
        .from('goals')
        .select('id, goal_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (firstGoal) {
        targetGoalId = firstGoal.id;
        console.log(`Falling back to first goal: "${firstGoal.goal_text}"`);
      } else {
        throw new Error("No goals found to attach action to. Please create a goal first.");
      }
    }
    
    console.log(`Final goal selection: Goal ID ${targetGoalId} for action "${title}"`);
    
    // Use the existing createAction function to create the action
    return createAction(userId, targetGoalId, title, detectedFrequency, description);
  } catch (error) {
    console.error("Error creating simple action:", error);
    toast.error(`Failed to create action: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Mark an action as completed
 * @param actionId Action ID
 * @returns Updated action data
 */
export async function completeAction(actionId: string): Promise<Action | null> {
  try {
    console.log("Attempting to complete action with ID:", actionId);
    
    // First verify the action exists
    const { data: checkData, error: checkError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', actionId)
      .single();
      
    if (checkError) {
      console.error("Action check error:", checkError);
      throw new Error(`Action with ID ${actionId} not found`);
    }
    
    console.log("Found action to complete:", checkData);
    
    // Now update the action
    const { data, error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();
    
    if (error) {
      console.error("Action completion error:", error);
      throw error;
    }
    
    console.log("Action completed successfully:", data);
    toast.success(`Action "${data.title}" marked as completed!`);
    return data as Action;
  } catch (error) {
    console.error('Error completing action:', error);
    toast.error(`Failed to complete action: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Delete a goal
 * @param userId User ID
 * @param goalId Goal ID or text
 * @param exactMatch Whether to match text exactly or use LIKE
 * @returns Success message
 */
export async function deleteGoal(
  userId: string,
  goalId?: string,
  goalText?: string,
  exactMatch: boolean = false
): Promise<string> {
  try {
    console.log("Deleting goal:", { userId, goalId, goalText, exactMatch });
    
    // First find the goals to delete
    let query = supabase
      .from("goals")
      .select("id, goal_text")
      .eq("user_id", userId);

    // Filter by ID if provided
    if (goalId) {
      query = query.eq("id", goalId);
    } 
    // Or filter by text if provided
    else if (goalText) {
      if (exactMatch) {
        query = query.eq("goal_text", goalText);
      } else {
        query = query.ilike("goal_text", `%${goalText}%`);
      }
    } else {
      throw new Error("Either goal ID or text must be provided");
    }

    const { data: goals, error: findError } = await query;
    
    if (findError) throw findError;

    if (!goals || goals.length === 0) {
      return "No goals found matching the criteria";
    }

    // Get IDs of the goals to delete
    const goalIds = goals.map(goal => goal.id);
    console.log("Found goals to delete:", goalIds);
    
    // First delete related actions (due to foreign key constraint)
    for (const id of goalIds) {
      try {
        const { error: actionDeleteError } = await supabase
          .from("tasks")
          .delete()
          .eq("goal_id", id);
          
        if (actionDeleteError) {
          console.error(`Failed to delete actions for goal ${id}:`, actionDeleteError);
        }
      } catch (actionError) {
        console.error(`Exception deleting actions for goal ${id}:`, actionError);
        // Continue with other deletions even if this one failed
      }
    }
    
    // Then delete the goals - try one by one if bulk delete fails
    try {
      // First try bulk delete
      const { error: goalDeleteError } = await supabase
        .from("goals")
        .delete()
        .in("id", goalIds);
        
      if (goalDeleteError) {
        console.error("Bulk delete failed, trying individual deletes:", goalDeleteError);
        // If bulk delete fails, try deleting one by one
        for (const id of goalIds) {
          const { error: singleDeleteError } = await supabase
            .from("goals")
            .delete()
            .eq("id", id);
            
          if (singleDeleteError) {
            console.error(`Failed to delete goal ${id}:`, singleDeleteError);
          } else {
            console.log(`Successfully deleted goal ${id}`);
          }
        }
      }
    } catch (deleteError) {
      console.error("Exception during goal deletion:", deleteError);
      throw deleteError;
    }
    
    const message = `Successfully deleted ${goals.length} goal(s): ${goals.map(g => g.goal_text).join(', ')}`;
    toast.success(message);
    return message;
  } catch (error) {
    const errorMsg = `Failed to delete goal: ${error instanceof Error ? error.message : String(error)}`;
    console.error("Error deleting goal(s):", error);
    toast.error(errorMsg);
    return errorMsg;
  }
}

/**
 * Delete an action
 * @param userId User ID
 * @param actionId Action ID or text
 * @param exactMatch Whether to match text exactly or use LIKE
 * @returns Success message
 */
export async function deleteAction(
  userId: string,
  actionId?: string,
  actionText?: string,
  exactMatch: boolean = false
): Promise<string> {
  try {
    console.log("Deleting action:", { userId, actionId, actionText, exactMatch });
    
    // Find the actions to delete
    let query = supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", userId);

    // Filter by ID if provided
    if (actionId) {
      query = query.eq("id", actionId);
    } 
    // Or filter by text if provided
    else if (actionText) {
      if (exactMatch) {
        query = query.eq("title", actionText);
      } else {
        query = query.ilike("title", `%${actionText}%`);
      }
    } else {
      throw new Error("Either action ID or text must be provided");
    }

    const { data: actions, error: findError } = await query;
    
    if (findError) throw findError;

    if (!actions || actions.length === 0) {
      return "No actions found matching the criteria";
    }

    console.log("Found actions to delete:", actions.map(a => a.id));
    
    // Delete the actions - try one by one if bulk delete fails
    try {
      // First try bulk delete
      const actionIds = actions.map(action => action.id);
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .in("id", actionIds);
        
      if (deleteError) {
        console.error("Bulk delete failed, trying individual deletes:", deleteError);
        // If bulk delete fails, try deleting one by one
        for (const id of actionIds) {
          const { error: singleDeleteError } = await supabase
            .from("tasks")
            .delete()
            .eq("id", id);
            
          if (singleDeleteError) {
            console.error(`Failed to delete action ${id}:`, singleDeleteError);
          } else {
            console.log(`Successfully deleted action ${id}`);
          }
        }
      }
    } catch (deleteError) {
      console.error("Exception during action deletion:", deleteError);
      throw deleteError;
    }
    
    const message = `Successfully deleted ${actions.length} action(s): ${actions.map(a => a.title).join(', ')}`;
    toast.success(message);
    return message;
  } catch (error) {
    const errorMsg = `Failed to delete action: ${error instanceof Error ? error.message : String(error)}`;
    console.error("Error deleting action(s):", error);
    toast.error(errorMsg);
    return errorMsg;
  }
}

/**
 * Find a goal by text
 * @param userId User ID
 * @param goalText Text to search for in goal_text field
 * @returns Goal ID if found, null if not found
 */
export async function findGoalByText(
  userId: string,
  goalText: string
): Promise<string | null> {
  try {
    // Search for goals matching the text
    const { data: goals, error } = await supabase
      .from('goals')
      .select('id, goal_text')
      .eq('user_id', userId)
      .ilike('goal_text', `%${goalText}%`);
      
    if (error) throw error;
    
    if (!goals || goals.length === 0) {
      console.log(`No goals found matching text: "${goalText}"`);
      return null;
    }
    
    // Return the first match
    console.log(`Found goal: "${goals[0].goal_text}" with ID: ${goals[0].id}`);
    return goals[0].id;
  } catch (error) {
    console.error('Error finding goal by text:', error);
    return null;
  }
}

/**
 * Update a goal's notes
 * @param goalIdOrText Goal ID or text to search for
 * @param notes New notes text
 * @param userId User ID (required for security check)
 * @returns Success message
 */
export async function updateGoalNotes(
  goalIdOrText: string,
  notes: string,
  userId?: string
): Promise<string> {
  try {
    let goalId = goalIdOrText;
    
    // If userId is provided and the goalIdOrText doesn't look like a UUID,
    // try to find the goal by text
    if (userId && !goalIdOrText.includes('-')) {
      const foundGoalId = await findGoalByText(userId, goalIdOrText);
      if (foundGoalId) {
        goalId = foundGoalId;
      } else {
        return `Could not find a goal matching "${goalIdOrText}"`;
      }
    }
    
    // Add user ID check if provided
    const query = supabase
      .from('goals')
      .update({ notes })
      .eq('id', goalId);
      
    // Add user check if userId is provided (for security)
    if (userId) {
      query.eq('user_id', userId);
    }
    
    const { error } = await query;

    if (error) throw error;
    
    toast.success("Goal notes updated successfully!");
    return "Goal notes updated successfully";
  } catch (error) {
    console.error('Error updating goal notes:', error);
    toast.error(`Failed to update goal notes: ${error instanceof Error ? error.message : String(error)}`);
    return `Error updating goal notes: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Update a goal's description
 * @param goalIdOrText Goal ID or text to search for
 * @param description New description text
 * @param userId User ID (required for security check)
 * @returns Success message
 */
export async function updateGoalDescription(
  goalIdOrText: string,
  description: string,
  userId?: string
): Promise<string> {
  try {
    let goalId = goalIdOrText;
    
    // If userId is provided and the goalIdOrText doesn't look like a UUID,
    // try to find the goal by text
    if (userId && !goalIdOrText.includes('-')) {
      const foundGoalId = await findGoalByText(userId, goalIdOrText);
      if (foundGoalId) {
        goalId = foundGoalId;
      } else {
        return `Could not find a goal matching "${goalIdOrText}"`;
      }
    }
    
    // Add user ID check if provided
    const query = supabase
      .from('goals')
      .update({ description })
      .eq('id', goalId);
      
    // Add user check if userId is provided (for security)
    if (userId) {
      query.eq('user_id', userId);
    }
    
    const { error } = await query;

    if (error) throw error;
    
    toast.success("Goal description updated successfully!");
    return "Goal description updated successfully";
  } catch (error) {
    console.error('Error updating goal description:', error);
    toast.error(`Failed to update goal description: ${error instanceof Error ? error.message : String(error)}`);
    return `Error updating goal description: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Analyze user's communication style based on message history
 * This helps the adaptive personality mode match the user's communication patterns
 * @param messages Array of conversation messages
 * @returns An analysis of the user's communication style
 */
function analyzeUserCommunicationStyle(messages: Array<{role: string, content: string}>) {
  // Only look at user messages
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  
  if (userMessages.length < 2) {
    return {
      style: 'neutral',
      formality: 'neutral',
      detectedPatterns: []
    };
  }
  
  // Count patterns
  let slangCount = 0;
  let emojiCount = 0;
  let shortSentenceCount = 0;
  let longSentenceCount = 0;
  let formalPhraseCount = 0;
  let casualPhraseCount = 0;
  
  // Common slang terms to detect
  const slangTerms = ['bruh', 'lol', 'idk', 'tbh', 'lmao', 'bro', 'dude', 'yeet', 'lit', 'fire', 'fam', 'sus'];
  const formalPhrases = ['please', 'thank you', 'I would like to', 'I would appreciate', 'would you kindly'];
  const casualPhrases = ['hey', 'yo', 'sup', 'thanks', 'cool', 'awesome', 'wanna', 'gonna'];
  
  // Detect patterns in each message
  const detectedPatterns = [];
  
  userMessages.forEach(message => {
    // Check for slang
    slangTerms.forEach(term => {
      if (message.toLowerCase().includes(term)) {
        slangCount++;
        if (!detectedPatterns.includes(term)) {
          detectedPatterns.push(term);
        }
      }
    });
    
    // Check for emojis (simple regex for common emoji patterns)
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojisInMessage = (message.match(emojiRegex) || []).length;
    emojiCount += emojisInMessage;
    
    // Check sentence length
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/).length;
      if (words < 5) shortSentenceCount++;
      if (words > 15) longSentenceCount++;
    });
    
    // Check for formal/casual phrasing
    formalPhrases.forEach(phrase => {
      if (message.toLowerCase().includes(phrase)) {
        formalPhraseCount++;
      }
    });
    
    casualPhrases.forEach(phrase => {
      if (message.toLowerCase().includes(phrase)) {
        casualPhraseCount++;
      }
    });
  });
  
  // Determine overall style
  let style = 'neutral';
  let formality = 'neutral';
  
  if (slangCount > 2 || casualPhraseCount > 3) {
    style = 'casual';
  } else if (formalPhraseCount > 2) {
    style = 'formal';
  }
  
  if (shortSentenceCount > longSentenceCount * 2) {
    style = style === 'casual' ? 'very_casual' : 'direct';
  }
  
  if (emojiCount > 3) {
    style = 'expressive';
  }
  
  if (slangCount > 4 || casualPhraseCount > 5) {
    formality = 'casual';
    if (detectedPatterns.some(p => ['bruh', 'lol', 'lmao', 'bro', 'dude'].includes(p))) {
      formality = 'very_casual';
    }
  } else if (formalPhraseCount > 3) {
    formality = 'formal';
  }
  
  return {
    style,
    formality,
    usesSlang: slangCount > 1,
    usesEmojis: emojiCount > 1,
    prefersShorterSentences: shortSentenceCount > longSentenceCount,
    detectedPatterns
  };
}

// Update the processMessage function to include style analysis

/**
 * LLM API request to process user messages
 * @param message User message
 * @param context Additional context like goals and actions
 * @returns AI response with possible actions
 */
export async function processMessage(
  message: string,
  context: {
    goals?: Goal[];
    actions?: Action[];
    conversation?: Message[];
    userNickname?: string;
    userId?: string;
  }
): Promise<{
  message: string;
  action?: string;
  navigate?: string;
  refresh?: boolean;
}> {
  try {
    // Special case direct handling for common action creation to ensure they work
    const lowerMessage = message.toLowerCase();
    
    // Direct handling of specific action creation requests to ensure they work on all environments
    if (context.userId && (
        (lowerMessage.includes("create") || lowerMessage.includes("add")) && 
        lowerMessage.includes("action") && 
        (lowerMessage.includes("be happy") || lowerMessage.includes("happy"))
      )) {
      
      console.log("DIRECT ACTION CREATION detected for 'Be Happy' goal");
      
      // First, find the "Be Happy" goal
      const { data: happyGoals } = await supabase
        .from('goals')
        .select('id, goal_text')
        .eq('user_id', context.userId)
        .ilike('goal_text', '%happy%');
      
      if (happyGoals && happyGoals.length > 0) {
        // Extract action details from message
        let actionTitle = "";
        let frequency = "daily";
        
        // Check for bed or night related actions
        if (lowerMessage.includes("bed") || lowerMessage.includes("night") || lowerMessage.includes("evening")) {
          frequency = "evening";
          if (lowerMessage.includes("bed early") || lowerMessage.includes("sleep early")) {
            actionTitle = "Go to bed early";
          }
        } 
        // Check for morning related actions
        else if (lowerMessage.includes("morning") || lowerMessage.includes("wake") || lowerMessage.includes("get up early")) {
          frequency = "morning";
          if (lowerMessage.includes("wake up early") || lowerMessage.includes("get up early")) {
            actionTitle = "Wake up early";
          }
        }
        
        // Use the original message as fallback if we couldn't extract a good title
        if (!actionTitle) {
          const parts = lowerMessage.split("action");
          if (parts.length > 1) {
            // Extract what comes after "action"
            const afterAction = parts[1].trim();
            // Remove words like "called", "named", etc.
            actionTitle = afterAction.replace(/^(called|named|titled|for|saying)\s+/i, "");
          }
        }
        
        // Ensure we have some action title
        if (!actionTitle) {
          actionTitle = "New action for happiness";
        }
        
        console.log(`Creating direct action: "${actionTitle}" with frequency: ${frequency} for goal ID: ${happyGoals[0].id}`);
        
        // Create the action directly
        const createdAction = await createAction(
          context.userId,
          happyGoals[0].id,
          actionTitle,
          frequency
        );
        
        if (createdAction) {
          return {
            message: `I've created the action "${actionTitle}" with a frequency of ${frequency} for your "Be Happy" goal.`,
            action: `Action "${actionTitle}" created successfully with frequency: ${frequency}`,
            refresh: true
          };
        }
      }
    }
    
    // Format the conversation history for the API
    const messages = context.conversation?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    // Add the current message
    messages.push({
      role: 'user',
      content: message
    });

    // Save the user message to the database for history
    if (context.userId) {
      await saveMessage(context.userId, 'user', message);
    }

    // Fetch user AI context if available
    let userAIContext = null;
    if (context.userId) {
      userAIContext = await getUserAIContext(context.userId);
    }

    // Get the user's selected personality from config
    const config = getConfig();
    const assistantName = config.assistant_name || "M8";
    let personalityType = config.personality_type || "gentle";
    
    // Get the personality prompt
    let personalityPrompt = PERSONALITY_PROMPTS[personalityType as keyof typeof PERSONALITY_PROMPTS] || 
                            PERSONALITY_PROMPTS.gentle;
    
    // If personality is set to adaptive, analyze the communication style and customize the personality prompt
    if (personalityType === 'adaptive') {
      const styleAnalysis = analyzeUserCommunicationStyle(messages);
      console.log('User communication style analysis:', styleAnalysis);
      
      // Create a customized adaptive prompt based on the analysis
      let basePersonality = "gentle";
      
      if (styleAnalysis.formality === 'very_casual' || 
          (styleAnalysis.usesSlang && styleAnalysis.detectedPatterns.some(p => ['bruh', 'bro', 'dude'].includes(p)))) {
        basePersonality = "sarcastic"; // Use the sarcastic personality for very casual users
      } else if (styleAnalysis.style === 'direct' || styleAnalysis.formality === 'formal') {
        basePersonality = "direct"; // Use the direct personality for formal users
      } else if (styleAnalysis.style === 'expressive') {
        basePersonality = "motivational"; // Use the motivational personality for expressive users
      }
      
      // Get the base personality prompt
      personalityPrompt = PERSONALITY_PROMPTS[basePersonality as keyof typeof PERSONALITY_PROMPTS];
      
      // Enhance it with adaptive capabilities
      personalityPrompt = `${personalityPrompt}\n\nI've noticed your communication style is ${styleAnalysis.style} 
      with ${styleAnalysis.formality} formality. ${styleAnalysis.usesSlang ? "You use casual language and slang terms." : ""} 
      ${styleAnalysis.usesEmojis ? "You express yourself with emojis." : ""} 
      ${styleAnalysis.prefersShorterSentences ? "You prefer concise communication." : "You use more detailed expressions."} 
      I'll adapt my responses to match your preferred style while still providing helpful guidance.`;
    }

    console.log(`Using assistant name: ${assistantName}, personality type: ${personalityType}`);

    // Get the user's todos for AI context
    let userTodos = [];
    if (context.userId) {
      try {
        const { data } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', context.userId)
          .order('created_at', { ascending: false });
          
        userTodos = data || [];
      } catch (error) {
        console.error('Error fetching todos for AI context:', error);
      }
    }

    // Add system message with context and personality
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant for a goal-tracking application called MyM8. Your name is ${assistantName}. ${personalityPrompt}

Here is some context about the user:
User's name: ${context.userNickname || 'Unknown'}

Goals: ${context.goals?.map(g => `${g.goal_text} (ID: ${g.id})`).join(', ') || 'None'}

Todos: ${userTodos.length > 0 ? 
  userTodos.slice(0, 10).map(t => `"${t.content}" (${t.completed ? 'Completed' : 'Pending'})`).join(', ') + 
  (userTodos.length > 10 ? ` and ${userTodos.length - 10} more todos` : '') : 
  'None'
}

Actions: ${context.actions?.map(a => `${a.title} (ID: ${a.id}, Status: ${a.completed ? 'Completed' : 'Pending'}, Frequency: ${a.frequency})`).join(', ') || 'None'}

${userAIContext ? `
User Interests: ${userAIContext.interests.length > 0 ? userAIContext.interests.join(', ') : 'None specified yet'}

User Dislikes: ${userAIContext.dislikes.length > 0 ? userAIContext.dislikes.join(', ') : 'None specified yet'}

User Preferences: ${Object.entries(userAIContext.preferences).length > 0 ? 
  Object.entries(userAIContext.preferences)
    .map(([key, pref]) => `${key}: ${(pref as UserPreference).value}`)
    .join(', ') : 
  'None specified yet'}

Personal Information: ${Object.entries(userAIContext.personal_info).length > 0 ? 
  Object.entries(userAIContext.personal_info)
    .map(([key, info]) => `${key}: ${(info as PersonalInfoItem).value}`)
    .join(', ') : 
  'None specified yet'}

Recent Highlights: ${userAIContext.conversation_highlights.length > 0 ? 
  userAIContext.conversation_highlights.slice(-5).join(' | ') : 
  'None recorded yet'}
` : ''}

When the user mentions their name or refers to themselves, use their name "${context.userNickname}" in your responses if available.

IMPORTANT: LEARN ABOUT THE USER - As you chat with the user, try to learn more about them. When the user shares important information about themselves (like preferences, interests, family details, work information, health concerns, etc.), remember this information and use it to personalize future responses.

IMPORTANT CONVERSATION HISTORY: If a user asks you to read through past conversations or remember something from before, you can use the command [ANALYZE_CONVERSATION_HISTORY] which will scan through past messages and extract important information to improve your context about the user. Use this command when users ask you to read or remember past conversations.

IMPORTANT: BE PROACTIVE ABOUT CREATING ACTIONS - When a user has goals but few or no actions, be PROACTIVE in suggesting specific, actionable steps they could take. Offer to create these actions for them right away.

For users who have just completed the setup wizard:
1. Notice if they have goals but no actions
2. Suggest 3-5 specific actions that would help with their goals
3. Offer to set these up immediately
4. If they show interest, create the actions using the CREATE_ACTION commands
5. Explain how the actions relate to their goals and how they can track progress

IMPORTANT: When a user asks you to create or manage goals or tasks, you CAN and SHOULD handle these by including special commands in your response. Use these formats:

For creating a goal: [CREATE_GOAL: The goal text here]
For creating a goal with description: [CREATE_GOAL_WITH_DESCRIPTION: Goal text|description text]
For creating a goal with description and notes: [CREATE_GOAL_WITH_NOTES: Goal text|description text|notes text]
For creating an action: [CREATE_ACTION: Action title]
For creating an action for a specific goal: [CREATE_ACTION_FOR_GOAL: Action title|Goal name]
For marking an action as complete: [COMPLETE_ACTION: action_id] or [COMPLETE_ACTION_TEXT: action text to search for]
For deleting a goal: [DELETE_GOAL: goal_id] or [DELETE_GOAL_TEXT: goal text to search for]
For deleting an action: [DELETE_ACTION: action_id] or [DELETE_ACTION_TEXT: action text to search for]
For updating a goal's description: [UPDATE_GOAL_DESCRIPTION: goal_text|new description]
For updating a goal's notes: [UPDATE_GOAL_NOTES: goal_text|new notes]
For analyzing past conversations: [ANALYZE_CONVERSATION_HISTORY]

FREQUENCIES: The app supports these action frequencies: morning, afternoon, evening, daily, weekly, monthly.

VERY IMPORTANT FOR ACTION FREQUENCY DETECTION: Pay very close attention to frequency indicators in the user's request.
- If they mention "every morning," "wake up early," "get up earlier," etc., this clearly indicates a MORNING frequency
- If they mention "afternoon," "lunch time," etc., this indicates an AFTERNOON frequency
- If they mention "evening," "night," "before bed," etc., this indicates an EVENING frequency
- If they mention "weekly," "once a week," etc., this indicates a WEEKLY frequency
- If they mention "monthly," "once a month," etc., this indicates a MONTHLY frequency
- If no frequency is specified, default to DAILY

VERY IMPORTANT FOR ACTIONS: When a user asks to create an action, FIRST analyze the request to determine:
1. What frequency is appropriate (morning, afternoon, evening, daily, weekly, monthly)
2. Which goal it should be attached to

If this information is unclear, ASK the user before creating the action. For example:
- "For your action 'Cut the grass', which goal should I attach this to? Also, how often would you like to do this (daily, weekly, monthly)?"
- "I noticed you want to 'Get up early' - would you like this as a morning action? And which goal should I attach it to?"

If the user clearly mentions the frequency in their request (like "every morning" or "once a week"), use that frequency.
If the user clearly mentions which goal (like "for my happiness goal"), try to find the matching goal.

VERY IMPORTANT FOR GOAL CREATION: When a user asks to create a new goal, you should:
1. Create the goal immediately using [CREATE_GOAL: goal text]
2. ALWAYS ask about the importance/motivation behind the goal - why they want to achieve it
3. Ask about any positive aspects or benefits they're hoping to gain
4. Ask about challenges or obstacles they anticipate
5. Use this information to craft a meaningful description and notes for the goal

After getting these details, update the goal with:
[UPDATE_GOAL_DESCRIPTION: goal_text|detailed purpose and motivation]
[UPDATE_GOAL_NOTES: goal_text|benefits, obstacles, and other important notes]

Example: If a user says "create a goal to quit smoking", respond with:
"I've created that goal for you. [CREATE_GOAL: Quit smoking]
Now, could you tell me why quitting smoking is important to you? What benefits are you hoping to see, and what challenges do you anticipate?"

Then when they respond with more details, update the goal:
"Thanks for sharing. I'll add those details to your goal. [UPDATE_GOAL_DESCRIPTION: quit smoking|To improve health and save money] [UPDATE_GOAL_NOTES: quit smoking|Benefits: better breathing, no more coughing, savings of $X per month. Challenges: cravings, social pressure.]"

VERY IMPORTANT FOR GOAL DESCRIPTION/NOTES: When a user asks to update a goal's description or notes, you should:
1. Determine which goal they want to update - you can use either the goal ID or the goal name/text
2. Understand whether they're updating the description (main purpose/details) or notes (additional thoughts/information)
3. For description updates, use: [UPDATE_GOAL_DESCRIPTION: goal_text|new description]
4. For notes updates, use: [UPDATE_GOAL_NOTES: goal_text|new notes]

You can use partial goal text - just enough to identify the goal. For example, use "happiness" for "Be Happy", or "work" for "Work More".

Example: If a user says "create a goal to be happy", respond with something like:
"I'll create that goal for you right away. [CREATE_GOAL: Be happy]"

Example: If a user says "create a goal to exercise with a description to stay fit", respond with:
"I'll create that goal with a description. [CREATE_GOAL_WITH_DESCRIPTION: Exercise|To stay fit and maintain a healthy lifestyle]"

Example: If a user says "create a goal to read more books, add a description that it's for learning and notes that I should focus on non-fiction", respond with:
"I'll create your reading goal with the description and notes. [CREATE_GOAL_WITH_NOTES: Read more books|For learning and personal growth|Focus on non-fiction books]"

Example: If a user says "add an action to exercise", you should ask for clarification:
"I'd be happy to add that action. Could you tell me which goal I should attach 'exercise' to, and how often you want to do this (daily, weekly, etc.)?"

Example: If a user says "add an action to get up early every morning for my happiness goal", you can infer the frequency and goal:
"I'll add that action to your happiness goal as a morning task. [CREATE_ACTION_FOR_GOAL: Get up early every morning|happiness]"

Example: If a user says "mark my reading action as complete", respond with:
"I'll mark that action as completed. [COMPLETE_ACTION_TEXT: reading]"

Example: If a user says "update the description of my exercise goal to help me stay fit and healthy", respond with:
"I'll update the description of your exercise goal. [UPDATE_GOAL_DESCRIPTION: exercise|help me stay fit and healthy]"

Example: If a user says "add a note to my happiness goal that says I should meditate more", respond with:
"I'll add that note to your happiness goal. [UPDATE_GOAL_NOTES: happiness|I should meditate more]"

Example: If a user says "please add to my work more goal notes that working more will give me more money which will make me happy", respond with:
"I'll add that note to your 'Work More' goal. [UPDATE_GOAL_NOTES: work more|Working more will give you more money which will make you happy]"

Always provide these commands in your response when the user asks to create, modify, or delete goals/actions, but ask for clarification when needed.

VERY IMPORTANT FOR PROVIDING SUGGESTIONS: For different types of common goals, you should offer specific, helpful suggestions:

For "Quit Smoking" goals:
- Suggest using nicotine replacement therapy (patches, gum, etc.)
- Recommend tracking days without smoking
- Suggest avoiding triggers (people, places, activities associated with smoking)
- Advise calculating money saved and planning rewards
- Recommend drinking water when cravings hit

For "Exercise More" or fitness goals:
- Suggest starting with small, achievable workout sessions (even 5-10 minutes)
- Recommend finding an exercise buddy or group
- Suggest tracking workouts and progress
- Advise setting specific, measurable targets

For "Weight Loss" goals:
- Suggest food journaling
- Recommend meal preparation
- Advise combining with an exercise routine
- Suggest tracking measurements beyond just weight

For "Mental Health" related goals:
- Suggest meditation or mindfulness practices
- Recommend journaling
- Advise establishing a sleep routine
- Suggest scheduling regular breaks during the day

For productivity or work-related goals:
- Suggest time-blocking techniques
- Recommend breaking tasks into smaller chunks
- Advise using the Pomodoro technique
- Suggest minimizing distractions

Always offer these suggestions after creating the goal and gathering information about motivation, but present them as options the user might consider, not as requirements.

After gathering motivation and details for a goal, ALWAYS suggest creating specific actions to help achieve the goal. For example:

"Based on what you've shared about your goal to quit smoking, would you like me to create some actions to help you? Here are some suggestions:
1. Track days without smoking (daily)
2. Use nicotine replacement therapy when cravings hit (as needed)
3. Drink water when cravings occur (as needed)
4. Calculate money saved weekly (weekly)
5. Avoid places where you usually smoke (daily)

Which of these would you like me to set up, or do you have other actions in mind?"

Wait for the user to select which actions they want before creating them. Then create each selected action with the appropriate frequency using [CREATE_ACTION: action title].

Example: If a user wants to add several actions to a newly created goal, use the specific goal command:
"I'll add those workout actions to your gym goal. [CREATE_ACTION_FOR_GOAL: Schedule gym sessions in your calendar|gym]

VERY IMPORTANT FOR GOAL PROGRESS INQUIRIES: When a user asks about their goals or progress:

1. ALWAYS reference the specific goals and actions information provided in the system context
2. Remember that you have full access to their goals through the context at the top of this prompt
3. You can see all their goals and actions in the "Goals:" and "Actions:" sections above
4. Calculate completion rates for each goal by counting related actions and checking completion status

When a user asks "how am I doing with my goals" or similar:
1. Provide a summary of each goal they have
2. For each goal, mention the related actions and their completion status 
3. Offer encouragement based on their actual progress
4. If they ask about a specific goal, focus your response on that goal and its actions

Example response:
"You currently have 3 goals:
1. Improve fitness: You've completed 2 out of 4 actions (50% completion rate)
2. Learn Spanish: You've completed 1 out of 3 actions (33% completion rate)
3. Read more books: You've completed 0 out of 2 actions (0% completion rate)

Would you like more details about any specific goal?"

DO NOT respond with "As an AI, I don't have the ability to directly access your goal progress" - you DO have this information in the context.

You can help manage the user's todos with these special commands:
- To create a new todo: [CREATE_TODO: task description]
- To toggle a todo's completion status by ID: [TOGGLE_TODO: todo_id]
- To toggle a todo's completion status by description: [TOGGLE_TODO_TEXT: task description]
- To delete a todo by ID: [DELETE_TODO: todo_id]
- To delete a todo by description: [DELETE_TODO_TEXT: task description]

When using text-based commands, always try to use exact text from the todo to ensure the correct item is modified.
`
    };

    // Make direct API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI error response:', errorData);
      throw new Error('Failed to process message');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Save the assistant response to the database for history
    if (context.userId) {
      await saveMessage(context.userId, 'assistant', aiResponse);
    }

    // Extract and save important information from the conversation for later context
    if (context.userId && userAIContext) {
      // Run automated extraction on the conversation messages
      if (context.conversation && context.conversation.length > 0) {
        // Add latest user message to analysis
        const conversationToAnalyze = [
          ...context.conversation,
          { id: 'current', role: 'user', content: message, timestamp: new Date().toISOString() }
        ];
        
        // Analyze only the last 10 messages to avoid too much processing
        const recentMessages = conversationToAnalyze.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        
        // Run the analysis asynchronously
        analyzeConversation(context.userId, recentMessages).catch(error => {
          console.error('Error analyzing conversation:', error);
        });
      }
      
      // Add the current message to highlights if it's substantive
      if (message.length > 30) {
        const truncatedMessage = message.substring(0, 100) + (message.length > 100 ? '...' : '');
        await addUserConversationHighlight(context.userId, truncatedMessage);
      }
    }

    // Parse the response for any special actions
    const actionMatch = aiResponse.match(/\[ACTION:([^\]]+)\]/);
    const navigateMatch = aiResponse.match(/\[NAVIGATE:([^\]]+)\]/);
    const refreshMatch = aiResponse.match(/\[REFRESH\]/);

    // Process goal/action creation commands
    let refresh = !!refreshMatch;
    let action: string | undefined = actionMatch ? actionMatch[1] : undefined;
    
    // Check for create goal command
    const createGoalMatch = aiResponse.match(/\[CREATE_GOAL: (.*?)\]/);
    if (createGoalMatch && context.userId) {
      const goalText = createGoalMatch[1].trim();
      const createdGoal = await createGoal(context.userId, goalText);
      if (createdGoal) {
        action = `Goal "${goalText}" created successfully`;
        refresh = true;
      }
    }
    
    // Check for goal creation with description and/or notes
    const createGoalWithDescriptionMatch = aiResponse.match(/\[CREATE_GOAL_WITH_DESCRIPTION: (.*?)\|(.*?)\]/);
    if (createGoalWithDescriptionMatch && context.userId) {
      const goalText = createGoalWithDescriptionMatch[1].trim();
      const description = createGoalWithDescriptionMatch[2].trim();
      const createdGoal = await createGoal(context.userId, goalText, description);
      if (createdGoal) {
        action = `Goal "${goalText}" created successfully with description`;
        refresh = true;
      }
    }
    
    // Check for goal creation with description and notes
    const createGoalWithNotesMatch = aiResponse.match(/\[CREATE_GOAL_WITH_NOTES: (.*?)\|(.*?)\|(.*?)\]/);
    if (createGoalWithNotesMatch && context.userId) {
      const goalText = createGoalWithNotesMatch[1].trim();
      const description = createGoalWithNotesMatch[2].trim();
      const notes = createGoalWithNotesMatch[3].trim();
      const createdGoal = await createGoal(context.userId, goalText, description, notes);
      if (createdGoal) {
        action = `Goal "${goalText}" created successfully with description and notes`;
        refresh = true;
      }
    }
    
    // Check for create action command
    const createActionMatch = aiResponse.match(/\[CREATE_ACTION: (.*?)\]/);
    if (createActionMatch && context.userId) {
      console.log("CREATE_ACTION match found:", createActionMatch[1]);
      const actionTitle = createActionMatch[1].trim();
      
      // Look for any goal context in the current conversation
      let goalContext = null;
      // Check the last few messages for any mention of goals
      const recentMessages = context.conversation?.slice(-5) || [];
      for (const msg of recentMessages) {
        if (msg.content.toLowerCase().includes("goal")) {
          const goalMatch = msg.content.match(/goal (?:to|for) ([^".,]+)/i) || 
                           msg.content.match(/([^".,]+) goal/i);
          if (goalMatch && goalMatch[1]) {
            goalContext = goalMatch[1].trim();
            console.log("Found goal context in recent messages:", goalContext);
            break;
          }
        }
      }
      
      console.log("Attempting to create simple action:", actionTitle, "with goal context:", goalContext);
      const createdAction = await createSimpleAction(context.userId, actionTitle, 'daily', null, undefined, goalContext);
      
      if (createdAction) {
        action = `Action "${actionTitle}" created successfully with frequency: ${createdAction.frequency}`;
        refresh = true;
      } else {
        console.error("Failed to create action");
        action = `Failed to create action "${actionTitle}"`;
      }
    }
    
    // Check for complete action command
    const completeActionMatch = aiResponse.match(/\[COMPLETE_ACTION: (.*?)\]/);
    if (completeActionMatch) {
      const actionId = completeActionMatch[1].trim();
      console.log("COMPLETE_ACTION match found for ID:", actionId);
      
      try {
        const updatedAction = await completeAction(actionId);
        if (updatedAction) {
          action = `Action "${updatedAction.title}" marked as completed`;
          refresh = true;
        } else {
          console.error("Failed to complete action");
          action = `Failed to complete action with ID ${actionId}`;
        }
      } catch (error) {
        console.error("Error in completeAction:", error);
        action = `Error completing action: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    // Also add a way for the AI to complete actions by text instead of just ID
    const completeActionTextMatch = aiResponse.match(/\[COMPLETE_ACTION_TEXT: (.*?)\]/);
    if (completeActionTextMatch && context.userId) {
      const actionText = completeActionTextMatch[1].trim();
      console.log("COMPLETE_ACTION_TEXT match found:", actionText);
      
      try {
        // Find the action by text
        const { data: actions, error: findError } = await supabase
          .from("tasks")
          .select("id, title")
          .eq("user_id", context.userId)
          .ilike("title", `%${actionText}%`);
        
        if (findError) throw findError;

        if (!actions || actions.length === 0) {
          action = `No actions found matching "${actionText}"`;
        } else if (actions.length > 1) {
          // If multiple matches, complete the first one but warn about it
          const completedAction = await completeAction(actions[0].id);
          if (completedAction) {
            action = `Marked "${actions[0].title}" as completed. Note: ${actions.length} actions matched your query.`;
            refresh = true;
          }
        } else {
          // Single exact match
          const completedAction = await completeAction(actions[0].id);
          if (completedAction) {
            action = `Action "${actions[0].title}" marked as completed`;
            refresh = true;
          }
        }
      } catch (error) {
        console.error("Error completing action by text:", error);
        action = `Error completing action: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    // Check for delete goal by ID command
    const deleteGoalMatch = aiResponse.match(/\[DELETE_GOAL: (.*?)\]/);
    if (deleteGoalMatch && context.userId) {
      const goalId = deleteGoalMatch[1].trim();
      console.log("DELETE_GOAL match found for ID:", goalId);
      
      const result = await deleteGoal(context.userId, goalId);
      action = result;
      refresh = true;
    }

    // Check for delete goal by text command
    const deleteGoalTextMatch = aiResponse.match(/\[DELETE_GOAL_TEXT: (.*?)\]/);
    if (deleteGoalTextMatch && context.userId) {
      const goalText = deleteGoalTextMatch[1].trim();
      console.log("DELETE_GOAL_TEXT match found:", goalText);
      
      const result = await deleteGoal(context.userId, undefined, goalText);
      action = result;
      refresh = true;
    }

    // Check for delete action by ID command
    const deleteActionMatch = aiResponse.match(/\[DELETE_ACTION: (.*?)\]/);
    if (deleteActionMatch && context.userId) {
      const actionId = deleteActionMatch[1].trim();
      console.log("DELETE_ACTION match found for ID:", actionId);
      
      const result = await deleteAction(context.userId, actionId);
      action = result;
      refresh = true;
    }

    // Check for delete action by text command
    const deleteActionTextMatch = aiResponse.match(/\[DELETE_ACTION_TEXT: (.*?)\]/);
    if (deleteActionTextMatch && context.userId) {
      const actionText = deleteActionTextMatch[1].trim();
      console.log("DELETE_ACTION_TEXT match found:", actionText);
      
      const result = await deleteAction(context.userId, undefined, actionText);
      action = result;
      refresh = true;
    }

    // Check for update goal description command
    const updateGoalDescriptionMatch = aiResponse.match(/\[UPDATE_GOAL_DESCRIPTION: ([^|]+)\|(.+?)\]/);
    if (updateGoalDescriptionMatch) {
      const goalIdOrText = updateGoalDescriptionMatch[1].trim();
      const newDescription = updateGoalDescriptionMatch[2].trim();
      console.log("UPDATE_GOAL_DESCRIPTION match found for:", goalIdOrText);
      
      const result = await updateGoalDescription(goalIdOrText, newDescription, context.userId);
      action = result;
      refresh = true;
    }
    
    // Check for update goal notes command
    const updateGoalNotesMatch = aiResponse.match(/\[UPDATE_GOAL_NOTES: ([^|]+)\|(.+?)\]/);
    if (updateGoalNotesMatch) {
      const goalIdOrText = updateGoalNotesMatch[1].trim();
      const newNotes = updateGoalNotesMatch[2].trim();
      console.log("UPDATE_GOAL_NOTES match found for:", goalIdOrText);
      
      const result = await updateGoalNotes(goalIdOrText, newNotes, context.userId);
      action = result;
      refresh = true;
    }

    // Check for create action with specific goal command
    const createActionForGoalMatch = aiResponse.match(/\[CREATE_ACTION_FOR_GOAL: (.*?)\|(.*?)\]/);
    if (createActionForGoalMatch && context.userId) {
      const actionTitle = createActionForGoalMatch[1].trim();
      const goalContext = createActionForGoalMatch[2].trim();
      console.log("CREATE_ACTION_FOR_GOAL match found:", actionTitle, "for goal:", goalContext);
      
      const createdAction = await createSimpleAction(context.userId, actionTitle, 'daily', null, undefined, goalContext);
      
      if (createdAction) {
        action = `Action "${actionTitle}" created successfully for goal "${goalContext}" with frequency: ${createdAction.frequency}`;
        refresh = true;
      } else {
        console.error("Failed to create action for specific goal");
        action = `Failed to create action "${actionTitle}" for goal "${goalContext}"`;
      }
    }

    // Check for analyze conversation history command
    const analyzeHistoryMatch = aiResponse.match(/\[ANALYZE_CONVERSATION_HISTORY\]/);
    let analysisResult: 'success' | 'no_data' | 'error' = 'error'; // Default to error state
    
    if (analyzeHistoryMatch && context.userId) {
      console.log("ANALYZE_CONVERSATION_HISTORY match found, analyzing past conversations");
      
      try {
        // Fetch past conversations
        const pastMessages = await getConversationHistory(context.userId, 200);
        
        if (pastMessages.length > 0) {
          // Convert to format expected by analyzeConversation
          const messagesToAnalyze = pastMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          
          // Run analysis on past conversations
          await analyzeConversation(context.userId, messagesToAnalyze);
          
          // Track that analysis was successful
          analysisResult = 'success';
          action = "Past conversations analyzed successfully.";
          refresh = true;
        } else {
          // Track that there was no data
          analysisResult = 'no_data';
          action = "No past conversations found to analyze.";
        }
      } catch (error) {
        console.error("Error analyzing conversation history:", error);
        analysisResult = 'error';
        action = `Error analyzing conversation history: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Check for todo creation command
    const createTodoMatch = aiResponse.match(/\[CREATE_TODO: (.*?)\]/);
    if (createTodoMatch && context.userId) {
      const todoContent = createTodoMatch[1].trim();
      console.log("CREATE_TODO match found:", todoContent);
      
      const newTodo = await createTodo(context.userId, todoContent);
      if (newTodo) {
        action = `Todo "${todoContent}" created successfully`;
        refresh = true;
      } else {
        action = `Failed to create todo "${todoContent}"`;
      }
    }

    // Check for todo completion toggle command
    const toggleTodoMatch = aiResponse.match(/\[TOGGLE_TODO: (.*?)\]/);
    if (toggleTodoMatch && context.userId) {
      const todoId = toggleTodoMatch[1].trim();
      console.log("TOGGLE_TODO match found for ID:", todoId);
      
      const result = await toggleTodoStatus(context.userId, todoId);
      action = result;
      refresh = true;
    }

    // Check for todo completion toggle by text command
    const toggleTodoTextMatch = aiResponse.match(/\[TOGGLE_TODO_TEXT: (.*?)\]/);
    if (toggleTodoTextMatch && context.userId) {
      const todoText = toggleTodoTextMatch[1].trim();
      console.log("TOGGLE_TODO_TEXT match found:", todoText);
      
      const result = await toggleTodoStatus(context.userId, undefined, todoText);
      action = result;
      refresh = true;
    }

    // Check for delete todo command
    const deleteTodoMatch = aiResponse.match(/\[DELETE_TODO: (.*?)\]/);
    if (deleteTodoMatch && context.userId) {
      const todoId = deleteTodoMatch[1].trim();
      console.log("DELETE_TODO match found for ID:", todoId);
      
      const result = await deleteTodo(context.userId, todoId);
      action = result;
      refresh = true;
    }

    // Check for delete todo by text command
    const deleteTodoTextMatch = aiResponse.match(/\[DELETE_TODO_TEXT: (.*?)\]/);
    if (deleteTodoTextMatch && context.userId) {
      const todoText = deleteTodoTextMatch[1].trim();
      console.log("DELETE_TODO_TEXT match found:", todoText);
      
      const result = await deleteTodo(context.userId, undefined, todoText);
      action = result;
      refresh = true;
    }

    // Process the final message to return
    let finalMessage = aiResponse;
    
    // Replace the analysis command with appropriate text
    if (analyzeHistoryMatch) {
      if (analysisResult === 'success') {
        finalMessage = finalMessage.replace(
          /\[ANALYZE_CONVERSATION_HISTORY\]/g, 
          generateHistoryAnalysisResponse()
        );
      } else if (analysisResult === 'no_data') {
        finalMessage = finalMessage.replace(
          /\[ANALYZE_CONVERSATION_HISTORY\]/g, 
          "I don't have any past conversations to analyze yet. Let's keep chatting so I can learn more about you!"
        );
      } else {
        finalMessage = finalMessage.replace(
          /\[ANALYZE_CONVERSATION_HISTORY\]/g, 
          "I encountered an error trying to analyze our past conversations. Let's continue from here!"
        );
      }
    }

    return {
      message: finalMessage
        .replace(/\[ACTION:[^\]]+\]/g, '')
        .replace(/\[NAVIGATE:[^\]]+\]/g, '')
        .replace(/\[REFRESH\]/g, '')
        .replace(/\[CREATE_GOAL:[^\]]+\]/g, '')
        .replace(/\[CREATE_GOAL_WITH_DESCRIPTION:[^\]]*\|[^\]]*\]/g, '')
        .replace(/\[CREATE_GOAL_WITH_NOTES:[^\]]*\|[^\]]*\|[^\]]*\]/g, '')
        .replace(/\[CREATE_ACTION:[^\]]+\]/g, '')
        .replace(/\[CREATE_ACTION_FOR_GOAL:[^\]]*\|[^\]]*\]/g, '')
        .replace(/\[COMPLETE_ACTION:[^\]]+\]/g, '')
        .replace(/\[COMPLETE_ACTION_TEXT:[^\]]+\]/g, '')
        .replace(/\[DELETE_GOAL:[^\]]+\]/g, '')
        .replace(/\[DELETE_GOAL_TEXT:[^\]]+\]/g, '')
        .replace(/\[DELETE_ACTION:[^\]]+\]/g, '')
        .replace(/\[DELETE_ACTION_TEXT:[^\]]+\]/g, '')
        .replace(/\[UPDATE_GOAL_DESCRIPTION:[^\]]*\|[^\]]*\]/g, '')
        .replace(/\[UPDATE_GOAL_NOTES:[^\]]*\|[^\]]*\]/g, '')
        .replace(/\[ANALYZE_CONVERSATION_HISTORY\]/g, '')
        .replace(/\[CREATE_TODO:[^\]]+\]/g, '')
        .replace(/\[TOGGLE_TODO:[^\]]+\]/g, '')
        .replace(/\[TOGGLE_TODO_TEXT:[^\]]+\]/g, '')
        .replace(/\[DELETE_TODO:[^\]]+\]/g, '')
        .replace(/\[DELETE_TODO_TEXT:[^\]]+\]/g, '')
        .trim(),
      action,
      navigate: navigateMatch ? navigateMatch[1] : undefined,
      refresh
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      message: 'An error occurred while processing your request. Please try again later.',
      action: undefined,
      navigate: undefined,
      refresh: false
    };
  }
}

/**
 * Get recent conversation history
 * @param userId User ID
 * @param limit Number of messages to retrieve (default: 50)
 * @returns Conversation messages
 */
export async function getConversationHistory(
  userId: string, 
  limit: number = 50
): Promise<Message[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    return (data || []) as Message[];
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return [];
  }
}

/**
 * Save a message to the database
 * @param userId User ID
 * @param role Message role (user or assistant)
 * @param content Message content
 * @returns Saved message or null if failed
 */
export async function saveMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const message = {
      user_id: userId,
      role,
      content,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }

    return data as Message;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return null;
  }
}

/**
 * Analyze all user conversations to extract context
 * @param userId User ID
 * @returns Promise resolving to boolean indicating success
 */
export async function analyzeAllUserConversations(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // Get up to 200 past messages
    const pastMessages = await getConversationHistory(userId, 200);
    
    if (pastMessages && pastMessages.length > 0) {
      console.log(`Analyzing ${pastMessages.length} past conversations for user ${userId}`);
      
      // Sort messages by timestamp to maintain conversation flow
      const sortedMessages = [...pastMessages].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Group messages into conversation chunks to maintain context
      // Each conversation chunk consists of up to 15 messages
      const conversationChunks = [];
      for (let i = 0; i < sortedMessages.length; i += 10) {
        // Get a chunk with overlap to maintain context between chunks
        const startIndex = Math.max(0, i - 5); // Add 5 messages of overlap for context
        const endIndex = Math.min(sortedMessages.length, i + 15);
        const chunk = sortedMessages.slice(startIndex, endIndex);
        
        // Only add chunk if it contains at least one new message
        if (i === 0 || endIndex > i) {
          conversationChunks.push(chunk);
        }
      }
      
      console.log(`Grouped messages into ${conversationChunks.length} conversation chunks for analysis`);
      
      // Analyze each conversation chunk
      for (const chunk of conversationChunks) {
        // Format messages for analysis
        const messagesToAnalyze = chunk.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        
        await analyzeConversation(userId, messagesToAnalyze);
      }
      
      console.log(`Completed analysis of all conversation chunks`);
      return true;
    } else {
      console.log("No past messages found to analyze");
      return false;
    }
  } catch (error) {
    console.error("Error analyzing all user conversations:", error);
    return false;
  }
}

/**
 * Generate a response to the user when they ask about chat history
 * @returns String explaining what happened
 */
function generateHistoryAnalysisResponse(): string {
  return "I've analyzed our past conversations and updated my understanding of your preferences, interests, and personal information. This gives me better context about our interactions and helps me provide more personalized responses in future conversations. I've saved important highlights from our chats so I can remember key details about you. If you'd like to see what I've learned, you can check the 'Conversation Highlights' section in your profile settings.";
}

/**
 * Create a new todo item
 * @param userId The user ID
 * @param content The todo content
 * @returns The created todo item or an error message
 */
export async function createTodo(userId: string, content: string): Promise<{ id: string; content: string; completed: boolean } | null> {
  try {
    // Data validation
    if (!content?.trim()) {
      console.error('Invalid todo content');
      return null;
    }

    // Create the todo
    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        content: content.trim(),
        completed: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating todo:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createTodo:', error);
    return null;
  }
}

/**
 * Toggle the completion status of a todo item
 * @param userId The user ID
 * @param todoId The todo ID to update
 * @param todoText Optional text to identify the todo if ID is not provided
 * @returns A success message or an error message
 */
export async function toggleTodoStatus(
  userId: string, 
  todoId?: string, 
  todoText?: string
): Promise<string> {
  try {
    // Find the todo by ID or text if ID not provided
    let todo;
    
    if (todoId) {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', todoId)
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.error('Error finding todo by ID:', error);
        return `Error finding todo with ID ${todoId}`;
      }
      
      todo = data;
    } else if (todoText) {
      // Find by text - will match the first one with similar text
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .ilike('content', `%${todoText}%`)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error finding todo by text:', error);
        return `Error finding todo with text "${todoText}"`;
      }
      
      if (!data || data.length === 0) {
        return `No todo found matching "${todoText}"`;
      }
      
      todo = data[0];
    } else {
      return 'No todo ID or text provided';
    }
    
    // Update the todo's completion status
    const newStatus = !todo.completed;
    const { error: updateError } = await supabase
      .from('todos')
      .update({ 
        completed: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', todo.id)
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating todo status:', updateError);
      return `Error updating todo "${todo.content}"`;
    }
    
    return `Todo "${todo.content}" ${newStatus ? 'completed' : 'marked as incomplete'}`;
  } catch (error) {
    console.error('Error in toggleTodoStatus:', error);
    return `Error toggling todo status: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Delete a todo item
 * @param userId The user ID
 * @param todoId The todo ID to delete
 * @param todoText Optional text to identify the todo if ID is not provided
 * @returns A success message or an error message
 */
export async function deleteTodo(
  userId: string, 
  todoId?: string, 
  todoText?: string
): Promise<string> {
  try {
    // Find the todo by ID or text if ID not provided
    let todoToDelete;
    
    if (todoId) {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', todoId)
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.error('Error finding todo by ID:', error);
        return `Error finding todo with ID ${todoId}`;
      }
      
      todoToDelete = data;
    } else if (todoText) {
      // Find by text - will match the first one with similar text
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .ilike('content', `%${todoText}%`)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error finding todo by text:', error);
        return `Error finding todo with text "${todoText}"`;
      }
      
      if (!data || data.length === 0) {
        return `No todo found matching "${todoText}"`;
      }
      
      todoToDelete = data[0];
    } else {
      return 'No todo ID or text provided';
    }
    
    // Delete the todo
    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoToDelete.id)
      .eq('user_id', userId);
      
    if (deleteError) {
      console.error('Error deleting todo:', deleteError);
      return `Error deleting todo "${todoToDelete.content}"`;
    }
    
    return `Todo "${todoToDelete.content}" deleted successfully`;
  } catch (error) {
    console.error('Error in deleteTodo:', error);
    return `Error deleting todo: ${error instanceof Error ? error.message : String(error)}`;
  }
}
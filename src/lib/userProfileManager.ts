/**
 * User Profile Manager
 * Manages user profiles and AI assistant context
 */

import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

// Define interfaces for the profile data
export interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  theme: string | null;
  wizard_completed: boolean | null;
  selected_issues?: string[] | null;
  other_issue?: string | null;
  assistant_toughness?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreference {
  value: string | number | boolean | null;
  last_updated?: string;
}

export interface PersonalInfoItem {
  value: string | number | null;
  source: 'user' | 'assistant' | 'system';
  confidence?: number;
  last_updated?: string;
}

export interface UserAIContext {
  id?: string;
  user_id: string;
  preferences: Record<string, UserPreference>;
  interests: string[];
  dislikes: string[];
  personal_info: Record<string, PersonalInfoItem>;
  conversation_highlights: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user profile by ID
 * @param userId User ID
 * @returns User profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Get user AI context by user ID
 * @param userId User ID
 * @returns User AI context or null if not found
 */
export async function getUserAIContext(userId: string): Promise<UserAIContext | null> {
  try {
    const { data, error } = await supabase
      .from('user_ai_context')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // If error is because the record doesn't exist, create one
      if (error.code === 'PGRST116') {
        return await createUserAIContext(userId);
      }
      
      console.error('Error fetching user AI context:', error);
      return null;
    }
    
    console.log("Raw user AI context data from supabase:", data);
    
    // Ensure conversation_highlights is an array
    if (data.conversation_highlights && !Array.isArray(data.conversation_highlights)) {
      console.warn("conversation_highlights is not an array, converting:", data.conversation_highlights);
      try {
        if (typeof data.conversation_highlights === 'string') {
          // Try to parse if it's a JSON string
          data.conversation_highlights = JSON.parse(data.conversation_highlights);
        }
        // If it's still not an array after parsing, create an empty array
        if (!Array.isArray(data.conversation_highlights)) {
          console.warn("Could not convert conversation_highlights to array, using empty array");
          data.conversation_highlights = [];
        }
      } catch (e) {
        console.error("Error parsing conversation_highlights:", e);
        data.conversation_highlights = [];
      }
    }
    
    return data as UserAIContext;
  } catch (error) {
    console.error('Error in getUserAIContext:', error);
    return null;
  }
}

/**
 * Create user AI context
 * @param userId User ID
 * @returns Newly created user AI context
 */
export async function createUserAIContext(userId: string): Promise<UserAIContext | null> {
  try {
    // Create default AI context
    const defaultContext: Omit<UserAIContext, 'id'> = {
      user_id: userId,
      preferences: {},
      interests: [],
      dislikes: [],
      personal_info: {},
      conversation_highlights: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('user_ai_context')
      .insert(defaultContext)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user AI context:', error);
      return null;
    }
    
    return data as UserAIContext;
  } catch (error) {
    console.error('Error in createUserAIContext:', error);
    return null;
  }
}

/**
 * Update user AI context
 * @param userId User ID
 * @param contextData AI context data to update
 * @returns Updated user AI context
 */
export async function updateUserAIContext(
  userId: string,
  contextData: Partial<UserAIContext>
): Promise<UserAIContext | null> {
  try {
    // Remove user_id from update data to prevent changing ownership
    const { user_id, ...updateData } = contextData;
    
    // Add updated timestamp
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('user_ai_context')
      .update(dataToUpdate)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user AI context:', error);
      return null;
    }
    
    return data as UserAIContext;
  } catch (error) {
    console.error('Error in updateUserAIContext:', error);
    return null;
  }
}

/**
 * Add to user conversation highlights
 * @param userId User ID
 * @param highlight Highlight to add
 * @returns Updated user AI context
 */
export async function addUserConversationHighlight(
  userId: string,
  highlight: string
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Add the highlight to the array, ensuring we don't duplicate
    const highlights = [...(currentContext.conversation_highlights || [])];
    if (!highlights.includes(highlight)) {
      highlights.push(highlight);
    }
    
    // Keep only the most recent 20 highlights
    const trimmedHighlights = highlights.slice(-20);
    
    // Update the context
    return updateUserAIContext(userId, {
      conversation_highlights: trimmedHighlights
    });
  } catch (error) {
    console.error('Error in addUserConversationHighlight:', error);
    return null;
  }
}

/**
 * Update user preferences
 * @param userId User ID
 * @param preferences Preferences to update
 * @returns Updated user AI context
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Record<string, UserPreference>
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Merge the new preferences with existing ones
    const updatedPreferences = {
      ...(currentContext.preferences || {}),
      ...preferences
    };
    
    // Update the context
    return updateUserAIContext(userId, {
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    return null;
  }
}

/**
 * Update user personal info
 * @param userId User ID
 * @param personalInfo Personal info to update
 * @returns Updated user AI context
 */
export async function updateUserPersonalInfo(
  userId: string,
  personalInfo: Record<string, PersonalInfoItem>
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Merge the new personal info with existing data
    const updatedPersonalInfo = {
      ...(currentContext.personal_info || {}),
      ...personalInfo
    };
    
    // Update the context
    return updateUserAIContext(userId, {
      personal_info: updatedPersonalInfo
    });
  } catch (error) {
    console.error('Error in updateUserPersonalInfo:', error);
    return null;
  }
}

/**
 * Add user interest
 * @param userId User ID
 * @param interest Interest to add
 * @returns Updated user AI context
 */
export async function addUserInterest(
  userId: string,
  interest: string
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Add the interest to the array, ensuring we don't duplicate
    const interests = [...(currentContext.interests || [])];
    if (!interests.includes(interest)) {
      interests.push(interest);
    }
    
    // Update the context
    return updateUserAIContext(userId, {
      interests
    });
  } catch (error) {
    console.error('Error in addUserInterest:', error);
    return null;
  }
}

/**
 * Add user dislike
 * @param userId User ID
 * @param dislike Dislike to add
 * @returns Updated user AI context
 */
export async function addUserDislike(
  userId: string,
  dislike: string
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Add the dislike to the array, ensuring we don't duplicate
    const dislikes = [...(currentContext.dislikes || [])];
    if (!dislikes.includes(dislike)) {
      dislikes.push(dislike);
    }
    
    // Update the context
    return updateUserAIContext(userId, {
      dislikes
    });
  } catch (error) {
    console.error('Error in addUserDislike:', error);
    return null;
  }
}

/**
 * Remove user interest
 * @param userId User ID
 * @param interest Interest to remove
 * @returns Updated user AI context
 */
export async function removeUserInterest(
  userId: string,
  interest: string
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Remove the interest from the array
    const interests = (currentContext.interests || []).filter(i => i !== interest);
    
    // Update the context
    return updateUserAIContext(userId, {
      interests
    });
  } catch (error) {
    console.error('Error in removeUserInterest:', error);
    return null;
  }
}

/**
 * Remove user dislike
 * @param userId User ID
 * @param dislike Dislike to remove
 * @returns Updated user AI context
 */
export async function removeUserDislike(
  userId: string,
  dislike: string
): Promise<UserAIContext | null> {
  try {
    // First get the current context
    const currentContext = await getUserAIContext(userId);
    
    if (!currentContext) {
      console.error('No AI context found for user');
      return null;
    }
    
    // Remove the dislike from the array
    const dislikes = (currentContext.dislikes || []).filter(d => d !== dislike);
    
    // Update the context
    return updateUserAIContext(userId, {
      dislikes
    });
  } catch (error) {
    console.error('Error in removeUserDislike:', error);
    return null;
  }
} 
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

/**
 * Delete a specific goal by ID or text match
 * @param options Options for deletion (either id or text is required)
 * @returns Promise with success status and message
 */
export const deleteGoal = async (options: { 
  id?: string; 
  text?: string;
  userId: string;
  exactMatch?: boolean;
}) => {
  try {
    if (!options.userId) {
      throw new Error("User ID is required to delete a goal");
    }

    // First find the goals to delete
    let query = supabase
      .from("goals")
      .select("id, goal_text")
      .eq("user_id", options.userId);

    // Filter by ID if provided
    if (options.id) {
      query = query.eq("id", options.id);
    } 
    // Or filter by text if provided
    else if (options.text) {
      if (options.exactMatch) {
        query = query.eq("goal_text", options.text);
      } else {
        query = query.ilike("goal_text", `%${options.text}%`);
      }
    } else {
      throw new Error("Either goal ID or text must be provided");
    }

    const { data: goals, error: findError } = await query;
    
    if (findError) {
      throw findError;
    }

    if (!goals || goals.length === 0) {
      return { 
        success: false, 
        message: "No goals found matching the criteria" 
      };
    }

    // Get IDs of the goals to delete
    const goalIds = goals.map(goal => goal.id);
    
    // First delete related actions (due to foreign key constraint)
    for (const goalId of goalIds) {
      const { error: actionDeleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("goal_id", goalId);
        
      if (actionDeleteError) {
        console.error(`Failed to delete actions for goal ${goalId}:`, actionDeleteError);
      }
    }
    
    // Then delete the goals
    const { error: goalDeleteError } = await supabase
      .from("goals")
      .delete()
      .in("id", goalIds);
      
    if (goalDeleteError) {
      throw goalDeleteError;
    }
    
    return { 
      success: true, 
      message: `Successfully deleted ${goals.length} goal(s)`,
      deletedGoals: goals
    };
  } catch (error) {
    console.error("Error deleting goal(s):", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to delete goal(s)" 
    };
  }
};

/**
 * Delete a specific action by ID or text match
 * @param options Options for deletion (either id or text is required)
 * @returns Promise with success status and message
 */
export const deleteAction = async (options: { 
  id?: string; 
  text?: string;
  userId: string;
  exactMatch?: boolean;
}) => {
  try {
    if (!options.userId) {
      throw new Error("User ID is required to delete an action");
    }

    // Find the actions to delete
    let query = supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", options.userId);

    // Filter by ID if provided
    if (options.id) {
      query = query.eq("id", options.id);
    } 
    // Or filter by text if provided
    else if (options.text) {
      if (options.exactMatch) {
        query = query.eq("title", options.text);
      } else {
        query = query.ilike("title", `%${options.text}%`);
      }
    } else {
      throw new Error("Either action ID or text must be provided");
    }

    const { data: actions, error: findError } = await query;
    
    if (findError) {
      throw findError;
    }

    if (!actions || actions.length === 0) {
      return { 
        success: false, 
        message: "No actions found matching the criteria" 
      };
    }

    // Delete the actions
    const actionIds = actions.map(action => action.id);
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .in("id", actionIds);
      
    if (deleteError) {
      throw deleteError;
    }
    
    return { 
      success: true, 
      message: `Successfully deleted ${actions.length} action(s)`,
      deletedActions: actions
    };
  } catch (error) {
    console.error("Error deleting action(s):", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to delete action(s)" 
    };
  }
}; 
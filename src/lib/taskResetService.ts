import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

/**
 * Checks if tasks should be reset based on:
 * - daily, morning, evening: reset at midnight
 * - weekly: reset 7 days after completion
 */
export async function checkAndResetTasks(userId: string): Promise<void> {
  try {
    console.log('Checking if tasks need to be reset for user:', userId);
    
    // Get all completed tasks
    const { data: completedTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, frequency, updated_at, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('frequency', ['morning', 'afternoon', 'evening', 'daily', 'weekly']);
    
    if (fetchError) {
      console.error('Error fetching completed tasks:', fetchError);
      return;
    }

    if (!completedTasks || completedTasks.length === 0) {
      console.log('No completed tasks to check for reset');
      return;
    }

    console.log(`Found ${completedTasks.length} completed tasks to check for reset`);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Identify tasks that need to be reset
    const tasksToReset = completedTasks.filter(task => {
      const lastUpdated = new Date(task.updated_at);
      const lastUpdatedDay = new Date(lastUpdated.getFullYear(), lastUpdated.getMonth(), lastUpdated.getDate());
      
      // For daily/morning/evening tasks: reset if completed before today (midnight reset)
      if (['daily', 'morning', 'evening', 'afternoon'].includes(task.frequency)) {
        return lastUpdatedDay < today;
      }
      
      // For weekly tasks: reset if it's been 7 or more days since completion
      if (task.frequency === 'weekly') {
        const daysSinceLastUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceLastUpdate >= 7;
      }
      
      return false;
    });
    
    if (tasksToReset.length === 0) {
      console.log('No tasks need resetting');
      return;
    }
    
    console.log(`Resetting ${tasksToReset.length} tasks to uncompleted status`);
    
    // Get the IDs of tasks to reset
    const taskIds = tasksToReset.map(task => task.id);
    
    // Update all the tasks in a batch operation
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        completed: false,
        updated_at: new Date().toISOString()
      })
      .in('id', taskIds);
    
    if (updateError) {
      console.error('Error resetting tasks:', updateError);
      return;
    }
    
    console.log(`Successfully reset ${tasksToReset.length} tasks`);
    
    // Only show toast notification if any tasks were actually reset
    if (tasksToReset.length > 0) {
      toast.info(`Reset ${tasksToReset.length} tasks for today`);
    }
  } catch (error) {
    console.error('Error in checkAndResetTasks:', error);
  }
} 
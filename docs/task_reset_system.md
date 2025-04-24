# Task Reset System

This document explains how the automatic task reset system works in MyM8. The system is designed to reset completed tasks based on their frequency, allowing users to track recurring habits and tasks.

## Overview

Tasks in MyM8 can have different frequencies:
- **Daily Tasks**: Morning, afternoon, evening, and daily tasks
- **Weekly Tasks**: Tasks that occur once per week
- **Monthly Tasks**: Tasks that occur once per month

When users complete a task, it stays marked as completed until its reset period elapses. The system then automatically resets the task to be uncompleted, allowing users to tackle it again.

## How Tasks Reset

### Daily Tasks

- Tasks with frequency of "morning", "afternoon", "evening", or "daily" reset 24 hours after they were last completed
- This typically means they reset at midnight of the following day
- Example: If you complete a daily meditation task on Monday at 10am, it will reset Tuesday at 10am

### Weekly Tasks

- Tasks with frequency of "weekly" reset 7 days after they were last completed
- This creates a personalized weekly cycle for each task based on when you complete it
- Example: If you complete a weekly meal planning task on Sunday, it will reset the following Sunday

### Monthly Tasks

- Tasks with frequency of "monthly" reset 30 days after they were last completed
- This creates a personalized monthly cycle for each task
- Example: If you complete a monthly budget review on the 15th, it will reset on the 15th of the next month

## Skipped Tasks

The system also tracks tasks that weren't completed before their reset period:

- If a daily task hasn't been completed for over 24 hours, it gets marked as "skipped"
- If a weekly task hasn't been completed for over 7 days, it gets marked as "skipped"
- If a monthly task hasn't been completed for over 30 days, it gets marked as "skipped"

This helps users track their adherence to their habits and tasks over time.

## Technical Implementation

The reset system is implemented in two key SQL migration files:

### Base Implementation (`20250430000000_create_reset_actions.sql`)

This file creates:
1. The `reset_completed_actions()` function that resets tasks based on their frequency and last update time
2. A trigger function `check_and_reset_actions()` that runs when tasks are updated
3. A trigger on the tasks table that executes the check function

```sql
-- Reset daily actions completed more than 24 hours ago
UPDATE tasks 
SET completed = false 
WHERE 
  completed = true AND 
  frequency IN ('morning', 'afternoon', 'evening', 'daily') AND 
  updated_at < NOW() - INTERVAL '1 day';
  
-- Reset weekly actions completed more than 7 days ago
UPDATE tasks 
SET completed = false 
WHERE 
  completed = true AND 
  frequency = 'weekly' AND 
  updated_at < NOW() - INTERVAL '7 days';
  
-- Reset monthly actions completed more than 30 days ago
UPDATE tasks 
SET completed = false 
WHERE 
  completed = true AND 
  frequency = 'monthly' AND 
  updated_at < NOW() - INTERVAL '30 days';
```

### Enhanced Implementation (`20250501000000_add_action_skipped_status.sql`)

This file enhances the system by:
1. Adding a "skipped" field to the tasks table
2. Updating the reset function to mark tasks as skipped if they weren't completed before their reset period
3. Adding the skipped field to activity logs

## How the Trigger Works

Since Supabase may not support scheduled cron jobs in all plans, we use a trigger-based approach:

1. Every time a task is inserted or updated, the trigger activates
2. The trigger checks if any tasks have `updated_at` less than the current date
3. If so, it calls the reset function once per day
4. This ensures tasks are reset without needing a scheduled job

## Manual Testing

For testing purposes, you can manually run the reset function:

```sql
SELECT reset_completed_actions();
```

This will immediately reset any tasks that meet the time criteria.

## Future Enhancements

Possible improvements to consider:

1. **Calendar-based resets**: Option to reset weekly tasks on a specific day (e.g., Sunday) rather than 7 days after completion
2. **Monthly end-of-month resets**: Option to reset monthly tasks on the last day of each month
3. **Custom reset periods**: Allow users to define custom reset periods
4. **Visual indicators**: Show users when a task will reset next
5. **Batch notifications**: Notify users when multiple tasks reset

## Related Components

The task reset system integrates with:

1. `src/pages/Goals/GoalDetail.tsx` - Displays actions grouped by frequency
2. `src/pages/Dashboard/Dashboard.tsx` - Shows progress for daily, weekly, and monthly tasks
3. `src/config/frequency.ts` - Defines frequency types and groupings
4. `src/pages/Logs/ActivityLog.tsx` - Logs completed or skipped tasks 
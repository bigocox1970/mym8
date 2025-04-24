import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Plus } from "lucide-react";

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
  user_id: string;
}

interface Task {
  id: string;
  task_text: string;
  completed: boolean;
  goal_id: string;
}

const GoalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoalAndTasks = async () => {
      try {
        if (!id) throw new Error("Goal ID is required");

        // Fetch goal
        const { data: goalData, error: goalError } = await supabase
          .from("goals")
          .select("*")
          .eq("id", id)
          .single();

        if (goalError) throw goalError;
        setGoal(goalData as Goal);

        // Fetch tasks related to the goal
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("goal_id", id)
          .order("created_at", { ascending: false });

        if (tasksError) throw tasksError;
        setTasks(tasksData as Task[]);
      } catch (error) {
        console.error("Error fetching goal and tasks:", error);
        toast.error("Failed to load goal details");
      } finally {
        setLoading(false);
      }
    };

    fetchGoalAndTasks();
  }, [id]);

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: completed }) // Fixed: Ensuring completed is always boolean
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, completed: completed } : task
        )
      );
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleAddTask = async () => {
    try {
      if (!newTaskText.trim()) return;
      if (!id) throw new Error("Goal ID is required to add a task.");

      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert([{ task_text: newTaskText, goal_id: id, completed: false }])
        .select("*")
        .single();

      if (error) throw error;

      setTasks((prevTasks) => [...prevTasks, newTask as Task]);
      setNewTaskText("");
      toast.success("Task added successfully!");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  if (loading) {
    return <Layout>Loading goal details...</Layout>;
  }

  if (!goal) {
    return (
      <Layout>
        <h2>Goal Not Found</h2>
        <p>The goal you're looking for doesn't exist.</p>
        <Link to="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{goal.goal_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Created at: {new Date(goal.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleTaskComplete(task.id, !!checked)}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {task.task_text}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="New Task"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="border p-2 rounded flex-1"
              />
              <Button onClick={handleAddTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>

        <Link to="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    </Layout>
  );
};

export default GoalDetail;

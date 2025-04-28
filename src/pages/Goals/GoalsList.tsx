import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ListPlus, Edit, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Goal = {
  id: string;
  goal_text: string;
  description: string | null;
  created_at: string;
  user_id: string;
};

const GoalsList = () => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: goals, isLoading, isError, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Error fetching goals: " + error.message);
        throw error;
      }

      return data as Goal[];
    },
    enabled: !!user,
  });

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setSelectedGoals([]);
    }
  };

  const handleToggleSelection = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(id => id !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedGoals.length === 0) return;

    try {
      // First delete all actions for these goals (due to foreign key constraints)
      for (const goalId of selectedGoals) {
        await supabase
          .from('tasks')
          .delete()
          .eq('goal_id', goalId);
      }

      // Then delete the goals
      const { error } = await supabase
        .from('goals')
        .delete()
        .in('id', selectedGoals);

      if (error) throw error;

      toast.success(`Successfully deleted ${selectedGoals.length} goal(s)`);
      setIsEditMode(false);
      setSelectedGoals([]);
      setShowDeleteDialog(false);
      refetch();
    } catch (error) {
      console.error('Error deleting goals:', error);
      toast.error("Failed to delete goals");
    }
  };

  return (
    <Layout>
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Goals</h1>
            <p className="text-muted-foreground">
              Set and track your personal goals
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button 
                  onClick={handleToggleEditMode}
                  variant="outline"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Done
                </Button>
                {selectedGoals.length > 0 && (
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedGoals.length})
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={handleToggleEditMode}
                  variant="outline"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Link to="/goals/new">
                  <Button>
                    <ListPlus className="mr-2 h-4 w-4" />
                    New Goal
                  </Button>
                </Link>
              </>
            )}
            <MenuToggleButton />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading your goals...</div>
        ) : isError ? (
          <div className="text-center py-8 text-red-500">
            Error loading goals. Please try again.
          </div>
        ) : goals && goals.length > 0 ? (
          <div className="space-y-6">
            {goals.map((goal) => (
              <Card key={goal.id} className="w-full">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-start gap-2">
                    {isEditMode && (
                      <Checkbox 
                        className="mt-1"
                        checked={selectedGoals.includes(goal.id)}
                        onCheckedChange={() => handleToggleSelection(goal.id)}
                      />
                    )}
                    <div>
                      <CardTitle className="text-xl">{goal.goal_text}</CardTitle>
                      <CardDescription>
                        Created on {new Date(goal.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link to={`/goals/${goal.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                  {!isEditMode && (
                    <Link to={`/goals/${goal.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No goals yet</CardTitle>
              <CardDescription>
                Create your first goal to get started on your journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/goals/new">
                <Button>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Create Your First Goal
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goals</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedGoals.length} goal{selectedGoals.length > 1 ? 's' : ''}? This action cannot be undone and will also delete all actions associated with {selectedGoals.length > 1 ? 'these goals' : 'this goal'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default GoalsList;

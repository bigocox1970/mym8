import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, Check } from "lucide-react";
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
import { PageHeader } from "@/components/PageHeader";
import AIAssistantButton from "@/components/AIAssistantButton";

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
      <div className="space-y-6">
        <PageHeader title="Goals">
          {isEditMode ? (
            <>
              <Button 
                onClick={handleToggleEditMode}
                variant="outline"
                size="sm"
              >
                <Check className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Done</span>
              </Button>
              {selectedGoals.length > 0 && (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                  {selectedGoals.length > 0 && <span className="ml-1">({selectedGoals.length})</span>}
                </Button>
              )}
            </>
          ) : (
            <>
              <div 
                className="p-2 cursor-pointer hover:bg-primary/10 rounded-md"
                onClick={handleToggleEditMode}
              >
                <Edit className="h-5 w-5" />
              </div>
              <Link to="/goals/new" className="p-2 cursor-pointer hover:bg-primary/10 rounded-md">
                <Plus className="h-5 w-5" />
              </Link>
              <AIAssistantButton question="I'd like help creating or managing my goals. Can you assist me?" />
              <MenuToggleButton />
            </>
          )}
        </PageHeader>

        {isLoading ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-center">Loading your goals...</p>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-center text-red-500">Error loading goals. Please try again.</p>
            </CardContent>
          </Card>
        ) : goals && goals.length > 0 ? (
          <div className="space-y-6">
            {goals.map((goal) => (
              <Card key={goal.id} className="w-full">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-start gap-2">
                    {isEditMode && (
                      <Checkbox 
                        className="mt-1"
                        checked={selectedGoals.includes(goal.id)}
                        onCheckedChange={() => handleToggleSelection(goal.id)}
                      />
                    )}
                    <div>
                      <CardTitle className="text-lg sm:text-xl">{goal.goal_text}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Created on {new Date(goal.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  {goal.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">{goal.description}</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <Link to={`/goals/${goal.id}`}>
                    <Button variant="outline" size="sm">
                      <span className="hidden sm:inline">View Details</span>
                      <span className="inline sm:hidden">View</span>
                    </Button>
                  </Link>
                  {!isEditMode && (
                    <Link to={`/goals/${goal.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  <Plus className="mr-2 h-4 w-4" />
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

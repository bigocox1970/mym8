import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Filter, ListPlus, Plus, X, Edit, Save, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type FrequencyFilter = "all" | "morning" | "afternoon" | "evening" | "daily" | "weekly" | "monthly";

interface Action {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  skipped: boolean;
  goal_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  frequency: "morning" | "afternoon" | "evening" | "daily" | "weekly" | "monthly";
  goal_text?: string; // May be added during data processing
}

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
  user_id: string;
}

interface EditingAction {
  id: string;
  title: string;
  description: string;
  frequency: Action["frequency"];
}

const ActionsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>("all");
  const [actionsWithGoals, setActionsWithGoals] = useState<Action[]>([]);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [editingAction, setEditingAction] = useState<EditingAction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Add these new state variables for multi-select functionality
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: actions, isLoading, isError, refetch } = useQuery({
    queryKey: ['actions'],
    queryFn: async () => {
      if (!user) throw new Error("User must be logged in to view actions");
      
      const { data: actionsData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Error fetching actions: " + error.message);
        throw error;
      }

      return actionsData as Action[];
    },
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      if (!user) throw new Error("User must be logged in to view goals");
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        toast.error("Error fetching goals: " + error.message);
        throw error;
      }

      return data as Goal[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (actions && goals) {
      // Combine actions with their respective goal information
      const goalsMap = new Map<string, string>();
      goals.forEach(goal => goalsMap.set(goal.id, goal.goal_text));
      
      const enrichedActions = actions.map(action => ({
        ...action,
        goal_text: goalsMap.get(action.goal_id) || 'Unknown Goal'
      }));
      
      setActionsWithGoals(enrichedActions);
    }
  }, [actions, goals]);

  const handleActionComplete = async (actionId: string, completed: boolean) => {
    try {
      const currentTime = new Date().toISOString();
      
      // Update the task
      const { error } = await supabase
        .from("tasks")
        .update({ 
          completed: completed,
          skipped: false, // Reset skipped status when manually completed
          updated_at: currentTime
        })
        .eq("id", actionId);

      if (error) throw error;

      // Update local state
      setActionsWithGoals((prevActions) =>
        prevActions.map((action) =>
          action.id === actionId ? { 
            ...action, 
            completed: completed,
            skipped: false,
            updated_at: currentTime
          } : action
        )
      );

      // Log the activity
      try {
        console.log("Logging activity:", {
          user_id: user?.id,
          task_id: actionId,
          completed: completed,
          timestamp: currentTime
        });
        
        const { error: logError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: user?.id,
            task_id: actionId,
            completed: completed,
            timestamp: currentTime
          });
          
        if (logError) {
          console.error("Error logging activity:", logError);
        } else {
          console.log("Activity logged successfully");
        }
      } catch (error) {
        console.error("Error logging activity:", error);
      }
      
      toast.success("Action updated successfully!");
    } catch (error) {
      console.error("Error updating action:", error);
      toast.error("Failed to update action");
    }
  };

  const handleEditAction = (action: Action) => {
    setEditingAction({
      id: action.id,
      title: action.title,
      description: action.description || '',
      frequency: action.frequency
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAction) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editingAction.title,
          description: editingAction.description,
          frequency: editingAction.frequency,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingAction.id);

      if (error) throw error;

      // Update the local state
      setActionsWithGoals((prevActions) =>
        prevActions.map((action) =>
          action.id === editingAction.id 
            ? { 
                ...action, 
                title: editingAction.title,
                description: editingAction.description,
                frequency: editingAction.frequency,
                updated_at: new Date().toISOString()
              } 
            : action
        )
      );

      setShowEditDialog(false);
      setEditingAction(null);
      toast.success("Action updated successfully!");
      
      // Refresh the data
      refetch();
    } catch (error) {
      console.error("Error saving action:", error);
      toast.error("Failed to save action");
    }
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoalId(goalId);
  };

  const handleNewActionClick = () => {
    setShowGoalDialog(true);
  };

  const handleAddActionToGoal = () => {
    if (selectedGoalId) {
      navigate(`/goals/${selectedGoalId}`);
      setShowGoalDialog(false);
    } else {
      toast.error("Please select a goal first");
    }
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setSelectedActions([]);
    }
  };

  const handleToggleSelection = (actionId: string) => {
    if (selectedActions.includes(actionId)) {
      setSelectedActions(selectedActions.filter(id => id !== actionId));
    } else {
      setSelectedActions([...selectedActions, actionId]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedActions.length === 0) return;

    try {
      // Delete the selected actions
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', selectedActions);

      if (error) throw error;

      toast.success(`Successfully deleted ${selectedActions.length} action(s)`);
      setIsEditMode(false);
      setSelectedActions([]);
      setShowDeleteDialog(false);
      refetch();
    } catch (error) {
      console.error('Error deleting actions:', error);
      toast.error("Failed to delete actions");
    }
  };

  const filteredActions = frequencyFilter === "all" 
    ? actionsWithGoals 
    : actionsWithGoals.filter(action => action.frequency === frequencyFilter);

  return (
    <Layout>
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Actions</h1>
          </div>
          <div className="flex items-center gap-2">
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
                {selectedActions.length > 0 && (
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                    {selectedActions.length > 0 && <span className="ml-1">({selectedActions.length})</span>}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Select
                  value={frequencyFilter}
                  onValueChange={(value) => setFrequencyFilter(value as FrequencyFilter)}
                >
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleToggleEditMode}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button 
                  onClick={handleNewActionClick}
                  size="sm"
                >
                  <ListPlus className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Action</span>
                </Button>
              </>
            )}
            <MenuToggleButton />
          </div>
        </div>

        {/* Goal Selection Dialog */}
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Choose a Goal</DialogTitle>
              <DialogDescription>
                Select a goal to add your new action to
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-60 overflow-y-auto py-4">
              {isLoading ? (
                <div className="text-center py-2">Loading goals...</div>
              ) : goals && goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map((goal) => (
                    <div 
                      key={goal.id} 
                      className={`p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors ${selectedGoalId === goal.id ? 'bg-accent border-primary' : ''}`}
                      onClick={() => handleGoalSelect(goal.id)}
                    >
                      <p className="font-medium">{goal.goal_text}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(goal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="mb-2">You don't have any goals yet</p>
                  <Link to="/goals/new">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-3 w-3" />
                      Create Your First Goal
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setShowGoalDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddActionToGoal} 
                disabled={!selectedGoalId || goals?.length === 0}
                variant="default"
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Action Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Action</DialogTitle>
              <DialogDescription>
                Update your action details
              </DialogDescription>
            </DialogHeader>
            
            {editingAction && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="action-title">Title</Label>
                  <Input 
                    id="action-title"
                    value={editingAction.title} 
                    onChange={(e) => setEditingAction({...editingAction, title: e.target.value})} 
                    placeholder="Action title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="action-description">Description</Label>
                  <Textarea 
                    id="action-description"
                    value={editingAction.description} 
                    onChange={(e) => setEditingAction({...editingAction, description: e.target.value})}
                    placeholder="Add details about this action"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="action-frequency">Frequency</Label>
                  <Select
                    value={editingAction.frequency}
                    onValueChange={(value) => setEditingAction({...editingAction, frequency: value as Action["frequency"]})}
                  >
                    <SelectTrigger id="action-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} variant="default">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add new Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Actions</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedActions.length} action{selectedActions.length > 1 ? 's' : ''}? This action cannot be undone.
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

        {isLoading ? (
          <div className="text-center py-8">Loading your actions...</div>
        ) : isError ? (
          <div className="text-center py-8 text-red-500">
            Error loading actions. Please try again.
          </div>
        ) : filteredActions.length > 0 ? (
          <div className="space-y-8">
            {/* Daily Actions */}
            {(frequencyFilter === "all" || 
              frequencyFilter === "morning" || 
              frequencyFilter === "afternoon" || 
              frequencyFilter === "evening" || 
              frequencyFilter === "daily") && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Daily Actions</h2>
                <div className="space-y-4">
                  {filteredActions.filter(action => 
                    action.frequency === "morning" || 
                    action.frequency === "afternoon" || 
                    action.frequency === "evening" || 
                    action.frequency === "daily"
                  ).length > 0 ? (
                    filteredActions.filter(action => 
                      action.frequency === "morning" || 
                      action.frequency === "afternoon" || 
                      action.frequency === "evening" || 
                      action.frequency === "daily"
                    ).map((action) => (
                      <Card 
                        key={action.id} 
                        className={`w-full transition-colors ${action.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <CardContent className="pt-6 pb-4">
                          <div className="flex items-start space-x-4">
                            {isEditMode ? (
                              <Checkbox 
                                className="mt-1"
                                checked={selectedActions.includes(action.id)}
                                onCheckedChange={() => handleToggleSelection(action.id)}
                              />
                            ) : (
                              <Checkbox
                                checked={action.completed}
                                onCheckedChange={(checked) => handleActionComplete(action.id, checked === true)}
                                className={`mt-0.5 ${action.completed ? 'text-green-600 dark:text-green-400' : ''}`}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <label
                                    htmlFor={`action-${action.id}`}
                                    className={`text-lg font-medium leading-none ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
                                  >
                                    {action.title}
                                    {action.completed && (
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 font-medium">
                                        Completed
                                      </span>
                                    )}
                                    {action.skipped && (
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100 font-medium">
                                        Skipped
                                      </span>
                                    )}
                                  </label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {action.frequency.charAt(0).toUpperCase() + action.frequency.slice(1)} action
                                  </p>
                                  {action.description && (
                                    <p className="mt-2 text-sm">{action.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link to={`/goals/${action.goal_id}`} className="text-sm text-primary hover:underline">
                                    {action.goal_text}
                                  </Link>
                                  {!isEditMode && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditAction(action)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                Created on {new Date(action.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="w-full">
                      <CardContent className="py-6 text-center text-muted-foreground">
                        {frequencyFilter === "all" 
                          ? "No daily actions found" 
                          : `No ${frequencyFilter} actions found`}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Weekly Actions */}
            {(frequencyFilter === "all" || frequencyFilter === "weekly") && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Weekly Actions</h2>
                <div className="space-y-4">
                  {filteredActions.filter(action => action.frequency === "weekly").length > 0 ? (
                    filteredActions.filter(action => action.frequency === "weekly").map((action) => (
                      <Card 
                        key={action.id} 
                        className={`w-full transition-colors ${action.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <CardContent className="pt-6 pb-4">
                          <div className="flex items-start space-x-4">
                            {isEditMode ? (
                              <Checkbox 
                                className="mt-1"
                                checked={selectedActions.includes(action.id)}
                                onCheckedChange={() => handleToggleSelection(action.id)}
                              />
                            ) : (
                              <Checkbox
                                checked={action.completed}
                                onCheckedChange={(checked) => handleActionComplete(action.id, checked === true)}
                                className={`mt-0.5 ${action.completed ? 'text-green-600 dark:text-green-400' : ''}`}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <label
                                    htmlFor={`action-${action.id}`}
                                    className={`text-lg font-medium leading-none ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
                                  >
                                    {action.title}
                                    {action.completed && (
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 font-medium">
                                        Completed
                                      </span>
                                    )}
                                    {action.skipped && (
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100 font-medium">
                                        Skipped
                                      </span>
                                    )}
                                  </label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Weekly action
                                  </p>
                                  {action.description && (
                                    <p className="mt-2 text-sm">{action.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link to={`/goals/${action.goal_id}`} className="text-sm text-primary hover:underline">
                                    {action.goal_text}
                                  </Link>
                                  {!isEditMode && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditAction(action)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                Created on {new Date(action.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="w-full">
                      <CardContent className="py-6 text-center text-muted-foreground">
                        No weekly actions found
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Actions */}
            {(frequencyFilter === "all" || frequencyFilter === "monthly") && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Monthly Actions</h2>
                <div className="space-y-4">
                  {filteredActions.filter(action => action.frequency === "monthly").length > 0 ? (
                    filteredActions.filter(action => action.frequency === "monthly").map((action) => (
                      <Card 
                        key={action.id} 
                        className={`w-full transition-colors ${action.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <CardContent className="pt-6 pb-4">
                          <div className="flex items-start space-x-4">
                            {isEditMode ? (
                              <Checkbox 
                                className="mt-1"
                                checked={selectedActions.includes(action.id)}
                                onCheckedChange={() => handleToggleSelection(action.id)}
                              />
                            ) : (
                              <Checkbox
                                checked={action.completed}
                                onCheckedChange={(checked) => handleActionComplete(action.id, checked === true)}
                                className={`mt-0.5 ${action.completed ? 'text-green-600 dark:text-green-400' : ''}`}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <label
                                    htmlFor={`action-${action.id}`}
                                    className={`text-lg font-medium leading-none ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
                                  >
                                    {action.title}
                                    {action.completed && (
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 font-medium">
                                        Completed
                                      </span>
                                    )}
                                    {action.skipped && (
                                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100 font-medium">
                                        Skipped
                                      </span>
                                    )}
                                  </label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Monthly action
                                  </p>
                                  {action.description && (
                                    <p className="mt-2 text-sm">{action.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link to={`/goals/${action.goal_id}`} className="text-sm text-primary hover:underline">
                                    {action.goal_text}
                                  </Link>
                                  {!isEditMode && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleEditAction(action)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                Created on {new Date(action.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="w-full">
                      <CardContent className="py-6 text-center text-muted-foreground">
                        No monthly actions found
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No actions found</CardTitle>
              <CardDescription>
                {frequencyFilter === "all" 
                  ? "You haven't created any actions yet" 
                  : `You don't have any ${frequencyFilter} actions`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" onClick={handleNewActionClick}>
                <ListPlus className="mr-2 h-4 w-4" />
                Add Your First Action
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ActionsList; 
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Plus, Edit, Save, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
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
import AIAssistantButton from "@/components/AIAssistantButton";

interface Goal {
  id: string;
  goal_text: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
}

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
}

interface EditingAction {
  id: string;
  title: string;
  description: string;
  frequency: Action["frequency"];
}

const GoalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [newActionText, setNewActionText] = useState("");
  const [loading, setLoading] = useState(true);
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | Action["frequency"]>("all");
  const [selectedFrequency, setSelectedFrequency] = useState<Action["frequency"]>("daily");
  const [newActionDescription, setNewActionDescription] = useState("");
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [editingAction, setEditingAction] = useState<EditingAction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDailyActions, setShowDailyActions] = useState(true);
  const [showWeeklyActions, setShowWeeklyActions] = useState(false);
  const [showMonthlyActions, setShowMonthlyActions] = useState(false);

  useEffect(() => {
    const fetchGoalAndActions = async () => {
      try {
        if (!id) throw new Error("Goal ID is required");

        // Fetch goal
        const { data: goalData, error: goalError } = await supabase
          .from("goals")
          .select("*")
          .eq("id", id)
          .single();

        if (goalError) throw goalError;
        console.log("Goal data fetched:", goalData);
        setGoal(goalData as Goal);

        // Fetch actions related to the goal
        const { data: actionsData, error: actionsError } = await supabase
          .from("tasks")
          .select("*")
          .eq("goal_id", id)
          .order("created_at", { ascending: false });

        if (actionsError) throw actionsError;
        setActions(actionsData as Action[]);
      } catch (error) {
        console.error("Error fetching goal and actions:", error);
        toast.error("Failed to load goal details");
      } finally {
        setLoading(false);
      }
    };

    fetchGoalAndActions();
  }, [id]);

  const handleActionComplete = async (actionId: string, completed: boolean) => {
    try {
      const currentTime = new Date().toISOString();
      
      if (!user) {
        console.error("User not logged in or user ID not available");
        toast.error("User authentication error");
        return;
      }
      
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
      setActions((prevActions) =>
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
          user_id: user.id, // Use user.id directly since we check above
          task_id: actionId,
          completed: completed,
          timestamp: currentTime
        });
        
        const { error: logError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: user.id, // Use user.id directly
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
      setActions((prevActions) =>
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
    } catch (error) {
      console.error("Error saving action:", error);
      toast.error("Failed to save action");
    }
  };

  const handleAddAction = async () => {
    try {
      if (!newActionText.trim()) return;
      if (!id) throw new Error("Goal ID is required to add an action.");
      if (!user) throw new Error("User must be logged in to add an action.");

      const { data: newAction, error } = await supabase
        .from("tasks")
        .insert([{ 
          title: newActionText, 
          description: newActionDescription.trim() || null,
          goal_id: id, 
          completed: false,
          frequency: selectedFrequency,
          user_id: user.id
        }])
        .select("*")
        .single();

      if (error) throw error;

      setActions((prevActions) => [...prevActions, newAction as unknown as Action]);
      setNewActionText("");
      setNewActionDescription("");
      setShowDescriptionInput(false);
      toast.success("Action added successfully!");
    } catch (error) {
      console.error("Error adding action:", error);
      toast.error("Failed to add action");
    }
  };

  const filteredActions = frequencyFilter === "all" 
    ? actions.sort((a, b) => {
        // Define priority order for frequencies
        const frequencyOrder = {
          'morning': 1,
          'afternoon': 2,
          'evening': 3,
          'daily': 4,
          'weekly': 5,
          'monthly': 6
        };
        
        // Sort by frequency first
        return frequencyOrder[a.frequency] - frequencyOrder[b.frequency];
      })
    : actions.filter(action => action.frequency === frequencyFilter);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p>Loading goal details...</p>
        </div>
      </Layout>
    );
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
      <div className="w-full">
        {/* Title and Details in a card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <h1 className="text-3xl font-bold">{goal.goal_text}</h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Description section - ALWAYS show if exists */}
            {goal.description && (
              <div className="mt-2">
                <h3 className="text-md font-semibold mb-2">Description</h3>
                <p>{goal.description}</p>
              </div>
            )}
            
            {/* Notes section - ALWAYS show if exists */}
            {'notes' in goal && goal.notes && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-md font-semibold mb-2">Notes</h3>
                <p className={`${!showFullDescription && goal.notes.length > 100 ? 'line-clamp-2' : ''}`}>
                  {goal.notes}
                </p>
                {goal.notes.length > 100 && (
                  <Button 
                    variant="link" 
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="p-0 h-auto mt-1"
                  >
                    {showFullDescription ? 'Show Less' : 'Show More'}
                  </Button>
                )}
              </div>
            )}
            
            {/* Show message if neither exists */}
            {!goal.description && !('notes' in goal && goal.notes) && (
              <div className="text-center py-4 text-muted-foreground mt-4">
                No additional details for this goal. <Link to={`/goals/${id}/edit`} className="underline hover:text-foreground">Edit goal</Link> to add description or notes.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation row */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Actions</h2>
          <div className="flex items-center gap-2">
            <Link to="/goals" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Goals
            </Link>
            <Link to={`/goals/${id}/edit`} className="p-2 cursor-pointer hover:bg-primary/10 rounded-md">
              <Edit className="h-5 w-5" />
            </Link>
            <AIAssistantButton question="Can you help me organize the actions for this goal?" />
            <MenuToggleButton />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily Actions Section */}
            <div className="border-b pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer py-2" 
                onClick={() => setShowDailyActions(!showDailyActions)}
              >
                <h3 className="text-md font-semibold">Daily Actions</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {showDailyActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {showDailyActions && (
              <div className="py-2">
                {filteredActions.filter(action => 
                  action.frequency === "morning" || 
                  action.frequency === "afternoon" || 
                  action.frequency === "evening" || 
                  action.frequency === "daily"
                ).length > 0 ? (
                  <div className="space-y-2">
                    {filteredActions.filter(action => 
                      action.frequency === "morning" || 
                      action.frequency === "afternoon" || 
                      action.frequency === "evening" || 
                      action.frequency === "daily"
                    ).map((action) => (
                      <div 
                        key={action.id} 
                        className={`flex items-start space-x-2 p-3 border rounded-md transition-colors ${action.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <Checkbox
                          id={`action-${action.id}`}
                          checked={action.completed}
                          onCheckedChange={(checked) => handleActionComplete(action.id, !!checked)}
                          className={`mt-0.5 ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <label
                                htmlFor={`action-${action.id}`}
                                className={`text-sm font-medium leading-none ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
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
                              <p className="text-xs text-muted-foreground mt-1">
                                {action.frequency.charAt(0).toUpperCase() + action.frequency.slice(1)} action
                              </p>
                              {action.description && (
                                <p className="mt-2 text-sm text-slate-700 dark:text-white">{action.description}</p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditAction(action)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {frequencyFilter === "all" 
                      ? "No daily actions created yet" 
                      : `No ${frequencyFilter} actions found`}
                  </div>
                )}
              </div>
            )}
            
            {/* Weekly Actions Section */}
            <div className="border-b pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer py-2" 
                onClick={() => setShowWeeklyActions(!showWeeklyActions)}
              >
                <h3 className="text-md font-semibold">Weekly Actions</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {showWeeklyActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {showWeeklyActions && (
              <div className="py-2">
                {filteredActions.filter(action => action.frequency === "weekly").length > 0 ? (
                  <div className="space-y-2">
                    {filteredActions.filter(action => action.frequency === "weekly").map((action) => (
                      <div 
                        key={action.id} 
                        className={`flex items-start space-x-2 p-3 border rounded-md transition-colors ${action.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <Checkbox
                          id={`action-${action.id}`}
                          checked={action.completed}
                          onCheckedChange={(checked) => handleActionComplete(action.id, !!checked)}
                          className={`mt-0.5 ${action.completed ? 'text-green-600 dark:text-green-400' : ''}`}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <label
                                htmlFor={`action-${action.id}`}
                                className={`text-sm font-medium leading-none ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
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
                              <p className="text-xs text-muted-foreground mt-1">
                                Weekly action
                              </p>
                              {action.description && (
                                <p className="mt-2 text-sm text-slate-700 dark:text-white">{action.description}</p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditAction(action)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No weekly actions created yet
                  </div>
                )}
              </div>
            )}
            
            {/* Monthly Actions Section */}
            <div className="border-b pb-2">
              <div 
                className="flex justify-between items-center cursor-pointer py-2" 
                onClick={() => setShowMonthlyActions(!showMonthlyActions)}
              >
                <h3 className="text-md font-semibold">Monthly Actions</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {showMonthlyActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {showMonthlyActions && (
              <div className="py-2">
                {filteredActions.filter(action => action.frequency === "monthly").length > 0 ? (
                  <div className="space-y-2">
                    {filteredActions.filter(action => action.frequency === "monthly").map((action) => (
                      <div 
                        key={action.id} 
                        className={`flex items-start space-x-2 p-3 border rounded-md transition-colors ${action.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}
                      >
                        <Checkbox
                          id={`action-${action.id}`}
                          checked={action.completed}
                          onCheckedChange={(checked) => handleActionComplete(action.id, !!checked)}
                          className={`mt-0.5 ${action.completed ? 'text-green-600 dark:text-green-400' : ''}`}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <label
                                htmlFor={`action-${action.id}`}
                                className={`text-sm font-medium leading-none ${action.completed ? 'text-green-600 dark:text-green-400' : ''}${action.skipped ? 'text-amber-600 dark:text-amber-400' : ''}`}
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
                              <p className="text-xs text-muted-foreground mt-1">
                                Monthly action
                              </p>
                              {action.description && (
                                <p className="mt-2 text-sm text-slate-700 dark:text-white">{action.description}</p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditAction(action)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No monthly actions created yet
                  </div>
                )}
              </div>
            )}

            {/* Add New Action Section */}
            <div className="pt-4">
              <h3 className="text-md font-semibold mb-4">Add New Action</h3>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Select
                    value={selectedFrequency}
                    onValueChange={(value) => setSelectedFrequency(value as Action["frequency"])}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Frequency" />
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
                  <Input
                    type="text"
                    placeholder="Enter a new action"
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    className="flex-1"
                  />
                </div>
                
                {showDescriptionInput && (
                  <Textarea
                    placeholder="Add details about this action"
                    value={newActionDescription}
                    onChange={(e) => setNewActionDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                )}
                
                <div className="flex justify-between mt-2">
                  {!showDescriptionInput ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDescriptionInput(true)}
                    >
                      Add Description
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  
                  <Button 
                    onClick={handleAddAction} 
                    disabled={!newActionText.trim()}
                    className="ml-auto"
                  >
                    Add Action
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Action Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-foreground dark:text-white">Edit Action</DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-slate-300">
                Update your action details
              </DialogDescription>
            </DialogHeader>
            
            {editingAction && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="action-title" className="text-foreground">Title</Label>
                  <Input 
                    id="action-title"
                    value={editingAction.title} 
                    onChange={(e) => setEditingAction({...editingAction, title: e.target.value})} 
                    placeholder="Action title"
                    className="text-foreground dark:text-white bg-background dark:bg-slate-900 border-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="action-description" className="text-foreground">
                    <span className="font-medium">Action Notes</span>
                    <p className="text-xs text-muted-foreground mt-1">Add details, steps, or any other notes about this action</p>
                  </Label>
                  <Textarea 
                    id="action-description"
                    value={editingAction.description} 
                    onChange={(e) => setEditingAction({...editingAction, description: e.target.value})}
                    placeholder="Examples: Required materials, specific instructions, motivation, etc."
                    rows={4}
                    className="text-foreground dark:text-white bg-background dark:bg-slate-900 border-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="action-frequency" className="text-foreground">Frequency</Label>
                  <Select
                    value={editingAction.frequency}
                    onValueChange={(value) => setEditingAction({...editingAction, frequency: value as Action["frequency"]})}
                  >
                    <SelectTrigger id="action-frequency" className="text-foreground dark:text-white bg-background dark:bg-slate-900">
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
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="dark:text-white dark:border-slate-500">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="dark:bg-blue-600 dark:text-white">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-between mt-6">
          <Link to="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default GoalDetail;

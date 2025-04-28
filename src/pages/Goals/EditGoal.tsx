import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Goal {
  id: string;
  goal_text: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
}

const EditGoal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        if (!id) throw new Error("Goal ID is required");

        const { data, error } = await supabase
          .from("goals")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        
        const goal = data as Goal;
        setTitle(goal.goal_text || "");
        setDescription(goal.description || "");
        setNotes(goal.notes || "");
        
      } catch (error) {
        console.error("Error fetching goal:", error);
        toast.error("Failed to load goal details");
        navigate("/goals");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoal();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a title for your goal");
      return;
    }
    
    if (!user) {
      toast.error("You must be logged in to update a goal");
      return;
    }
    
    setIsSaving(true);
    
    try {
      try {
        // Try to update all fields
        const { error } = await supabase
          .from("goals")
          .update({
            goal_text: title.trim(),
            description: description.trim() || null,
            notes: notes.trim() || null
          })
          .eq("id", id);
        
        if (error) throw error;
        
      } catch (error: unknown) {
        // If the error is about the notes column not existing
        const err = error as { message?: string };
        if (err.message && err.message.includes("notes")) {
          console.log("Notes column might be missing, trying fallback");
          
          // Try updating just title and description
          const { error: descError } = await supabase
            .from("goals")
            .update({
              goal_text: title.trim(),
              description: description.trim() || null
            })
            .eq("id", id);
            
          if (descError) throw descError;
        } else {
          // Rethrow if it's a different error
          throw error;
        }
      }
      
      toast.success("Goal updated successfully!");
      navigate(`/goals/${id}`);
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Failed to update goal");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p>Loading goal...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Goal</h1>
            <p className="text-muted-foreground">
              Update your goal details
            </p>
          </div>
          <MenuToggleButton />
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Goal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="What is your goal?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="dark:text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief overview of your goal"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none dark:text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">
                  <span className="font-medium">Notes (optional)</span>
                  <p className="text-xs text-muted-foreground mt-1">Add detailed notes, motivation, or any other information about your goal</p>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Examples: Why is this goal important? What steps will you take? Resources you'll need..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="resize-none dark:text-white"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/goals/${id}`)}
                  disabled={isSaving}
                  className="dark:text-white dark:border-slate-500"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving} 
                  className="dark:bg-blue-600 dark:text-white"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EditGoal; 
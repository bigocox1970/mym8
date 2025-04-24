
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const NewGoal = () => {
  const [goalText, setGoalText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalText.trim()) {
      toast.error("Please enter a goal description");
      return;
    }
    
    if (!user) {
      toast.error("You must be logged in to create a goal");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from("goals")
        .insert([
          { 
            goal_text: goalText,
            user_id: user.id 
          }
        ])
        .select();
        
      if (error) throw error;
      
      toast.success("Goal created successfully!");
      navigate("/goals");
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="goal" className="block text-sm font-medium mb-2">
                  What's your goal?
                </label>
                <Textarea
                  id="goal"
                  placeholder="e.g., Reduce anxiety, Improve sleep, Exercise more regularly..."
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/goals")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NewGoal;

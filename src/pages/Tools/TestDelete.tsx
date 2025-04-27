import React, { useState } from "react";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { deleteGoal, deleteAction } from "@/lib/goalActionManager";

// Define types for goals and actions
interface Goal {
  id: string;
  goal_text: string;
}

interface Action {
  id: string;
  title: string;
}

// Define type for the deletion result
interface DeletionResult {
  success: boolean;
  message: string;
  deletedGoals?: Goal[];
  deletedActions?: Action[];
}

const TestDelete = () => {
  const { user } = useAuth();
  const [goalText, setGoalText] = useState("Test");
  const [actionText, setActionText] = useState("Test");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DeletionResult | null>(null);

  const handleDeleteGoalByText = async () => {
    if (!user) {
      toast.error("You must be logged in to delete goals");
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteGoal({
        text: goalText,
        userId: user.id,
        exactMatch: false
      });

      setResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteActionByText = async () => {
    if (!user) {
      toast.error("You must be logged in to delete actions");
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteAction({
        text: actionText,
        userId: user.id,
        exactMatch: false
      });

      setResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-full space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Delete Testing Tool</h1>
          <MenuToggleButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Delete Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="Goal text to search for"
                className="flex-1"
              />
              <Button 
                onClick={handleDeleteGoalByText}
                disabled={isLoading || !goalText.trim()}
              >
                Delete Goals
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Action text to search for"
                className="flex-1"
              />
              <Button 
                onClick={handleDeleteActionByText}
                disabled={isLoading || !actionText.trim()}
              >
                Delete Actions
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TestDelete; 
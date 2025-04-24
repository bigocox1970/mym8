import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ListPlus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Layout, MenuToggleButton } from "@/components/Layout";

type Goal = {
  id: string;
  goal_text: string;
  description: string | null;
  created_at: string;
  user_id: string;
};

const GoalsList = () => {
  const { toast } = useToast();

  const { data: goals, isLoading, isError, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching goals",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      return data as Goal[];
    },
  });

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
            <Link to="/goals/new">
              <Button>
                <ListPlus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </Link>
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
                <CardHeader>
                  <CardTitle className="text-xl">{goal.goal_text}</CardTitle>
                  <CardDescription>
                    Created on {new Date(goal.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {goal.description && (
                    <p className="text-sm text-slate-700 dark:text-white">{goal.description}</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link to={`/goals/${goal.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                  <Link to={`/goals/${goal.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
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
    </Layout>
  );
};

export default GoalsList;

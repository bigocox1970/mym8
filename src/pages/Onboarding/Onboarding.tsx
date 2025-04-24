
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";

const goalOptions = [
  "Feel less depressed",
  "Reduce anxiety",
  "Improve relationships",
  "Get more clients",
  "Better work-life balance",
  "Sleep better",
  "Other (please specify)",
];

const formSchema = z.object({
  goals: z.array(z.string()).min(1, { message: "Please select at least one goal" }),
  customGoal: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goals: [],
      customGoal: "",
    },
  });

  const toggleGoal = (goal: string) => {
    if (goal === "Other (please specify)") {
      setShowCustomGoal(!showCustomGoal);
      if (selectedGoals.includes(goal)) {
        setSelectedGoals(selectedGoals.filter(g => g !== goal));
      } else {
        setSelectedGoals([...selectedGoals, goal]);
      }
      return;
    }

    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error("You must be logged in to continue");
      return;
    }
    
    setIsLoading(true);
    
    // Prepare goals to save
    const goalsToSave = [...selectedGoals];
    if (showCustomGoal && values.customGoal) {
      goalsToSave.push(values.customGoal);
    }
    
    try {
      // Save each goal to the database
      for (const goal of goalsToSave) {
        if (goal === "Other (please specify)") continue;
        
        const { error } = await supabase
          .from("goals")
          .insert({
            user_id: user.id,
            goal_text: goal,
          });
          
        if (error) throw error;
      }
      
      toast.success("Onboarding completed successfully");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Failed to save your goals");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to MyM8.app</h1>
          <p className="mt-2 text-gray-600">Let's set some personal goals to get started</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">What are your personal goals?</h2>
              <p className="text-gray-600">Select all that apply:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goalOptions.map((goal) => (
                  <Button
                    key={goal}
                    type="button"
                    variant={selectedGoals.includes(goal) ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => toggleGoal(goal)}
                  >
                    {goal}
                  </Button>
                ))}
              </div>
              
              {showCustomGoal && (
                <FormField
                  control={form.control}
                  name="customGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tell us about your goal</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your personal goal..." 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || selectedGoals.length === 0}
            >
              {isLoading ? "Saving..." : "Continue"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Onboarding;

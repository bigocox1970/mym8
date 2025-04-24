
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";
import { Save } from "lucide-react";

interface LLMConfig {
  id: string;
  function_name: string;
  llm_provider: string;
  api_key: string;
  pre_prompt: string;
  created_at: string;
}

interface LLMConfigFormProps {
  functionName: string;
  existingConfig: LLMConfig | null;
  onConfigSaved: () => void;
}

const llmOptions = [
  { value: "gpt-4o", label: "OpenAI GPT-4o" },
  { value: "gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "OpenAI GPT-3.5 Turbo" },
  { value: "claude-3-opus", label: "Anthropic Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Anthropic Claude 3 Sonnet" },
  { value: "claude-3-haiku", label: "Anthropic Claude 3 Haiku" },
  { value: "mistral-large", label: "Mistral Large" },
  { value: "mixtral-8x7b", label: "Mixtral 8x7B" },
  { value: "llama-3-70b", label: "Llama 3 70B" },
];

const formSchema = z.object({
  llm_provider: z.string().min(1, { message: "Please select an LLM provider" }),
  api_key: z.string().min(1, { message: "API key is required" }),
  pre_prompt: z.string().min(10, { message: "Pre-prompt should be at least 10 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

const LLMConfigForm = ({ functionName, existingConfig, onConfigSaved }: LLMConfigFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      llm_provider: existingConfig?.llm_provider || "",
      api_key: existingConfig?.api_key || "",
      pre_prompt: existingConfig?.pre_prompt || getDefaultPrePrompt(functionName),
    },
  });

  function getDefaultPrePrompt(functionName: string) {
    switch (functionName) {
      case "journaling":
        return "You are a helpful and empathetic AI assistant for journaling. Help the user reflect on their day, thoughts, and feelings in a supportive way. Ask thoughtful follow-up questions and provide encouragement.";
      case "depression":
        return "You are a supportive AI companion focused on helping people with depression. While you're not a replacement for professional mental health care, provide compassionate support, encourage positive thinking, and suggest healthy coping strategies. If someone mentions self-harm or suicide, always emphasize the importance of reaching out to a mental health professional or crisis hotline immediately.";
      case "addiction":
        return "You are a supportive AI companion for people dealing with addiction. Provide encouragement, suggestions for healthy coping mechanisms, and celebrate recovery milestones. Remember to emphasize the importance of professional help and support groups. Never judge or shame the user for setbacks.";
      default:
        return "";
    }
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from("llm_configs")
          .update({
            llm_provider: values.llm_provider,
            api_key: values.api_key,
            pre_prompt: values.pre_prompt,
          })
          .eq("id", existingConfig.id);

        if (error) throw error;
        toast.success(`${functionName} configuration updated successfully`);
      } else {
        // Create new config
        const { error } = await supabase
          .from("llm_configs")
          .insert({
            function_name: functionName,
            llm_provider: values.llm_provider,
            api_key: values.api_key,
            pre_prompt: values.pre_prompt,
          });

        if (error) throw error;
        toast.success(`${functionName} configuration created successfully`);
      }
      
      // Callback to refresh the configs
      onConfigSaved();
    } catch (error) {
      console.error("Error saving LLM config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="llm_provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LLM Provider</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select LLM provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {llmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose which language model to use for {functionName}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your API key" 
                  type="password" 
                  {...field} 
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                API key for the selected LLM provider (stored securely)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pre_prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pre-prompt</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter pre-prompt instructions" 
                  className="min-h-[200px]"
                  {...field} 
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Custom instructions that define how the AI should behave for {functionName}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </Button>
      </form>
    </Form>
  );
};

export default LLMConfigForm;

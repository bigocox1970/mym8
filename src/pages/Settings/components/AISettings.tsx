import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Bot, Key, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AIConfig {
  id: string;
  api_key: string;
  function_name: string;
  llm_provider: string;
  pre_prompt: string;
}

const AISettings = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [modelProvider, setModelProvider] = useState("anthropic/claude-3-opus:beta");
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // Fetch existing OpenRouter configuration
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("llm_configs")
          .select("*")
          .eq("function_name", "openrouter")
          .maybeSingle();

        if (error) {
          console.error("Error fetching AI config:", error);
          toast.error("Failed to load AI settings");
          return;
        }

        if (data) {
          setApiKey(data.api_key || "");
          setModelProvider(data.llm_provider || "anthropic/claude-3-opus:beta");
          setConfigId(data.id);
        }
      } catch (error) {
        console.error("Error in fetchConfig:", error);
        toast.error("Failed to load AI settings");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user]);

  const handleSaveConfig = async () => {
    if (!user) return;
    
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    try {
      setLoading(true);

      // If config exists, update it
      if (configId) {
        const { error } = await supabase
          .from("llm_configs")
          .update({
            api_key: apiKey,
            llm_provider: modelProvider,
            updated_at: new Date().toISOString()
          })
          .eq("id", configId);

        if (error) throw error;
        toast.success("AI settings updated successfully");
      } 
      // Otherwise create new config
      else {
        const { error } = await supabase
          .from("llm_configs")
          .insert({
            api_key: apiKey,
            function_name: "openrouter",
            llm_provider: modelProvider,
            pre_prompt: "You are a helpful AI assistant for a goal-tracking application called 'My M8'. Your job is to help users manage their goals and actions, provide encouragement, and answer questions."
          });

        if (error) throw error;
        toast.success("AI settings saved successfully");
        
        // Fetch the new config to get its ID
        const { data: newConfig, error: fetchError } = await supabase
          .from("llm_configs")
          .select("id")
          .eq("function_name", "openrouter")
          .single();
          
        if (!fetchError && newConfig) {
          setConfigId(newConfig.id);
        }
      }
    } catch (error) {
      console.error("Error saving AI config:", error);
      toast.error("Failed to save AI settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant Settings
        </CardTitle>
        <CardDescription>
          Configure your AI assistant with OpenRouter API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key" className="flex items-center gap-1">
            <Key className="h-4 w-4" />
            OpenRouter API Key
          </Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenRouter API key"
          />
          <p className="text-xs text-muted-foreground">
            Get your API key at{" "}
            <a 
              href="https://openrouter.ai/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-provider">Model Provider</Label>
          <Input
            id="model-provider"
            value={modelProvider}
            onChange={(e) => setModelProvider(e.target.value)}
            placeholder="Model provider (e.g., anthropic/claude-3-opus:beta)"
          />
          <p className="text-xs text-muted-foreground">
            For the best experience, we recommend using Claude 3 Opus.
          </p>
        </div>

        <Button 
          onClick={handleSaveConfig} 
          disabled={loading}
          className="mt-4"
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save AI Settings
            </>
          )}
        </Button>

        <div className="border-t pt-4 mt-4">
          <p className="text-sm text-muted-foreground">
            The AI assistant allows you to:
          </p>
          <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground space-y-1">
            <li>Ask questions about your goals and actions</li>
            <li>Get recommendations and encouragement</li>
            <li>Create new goals through conversation</li>
            <li>Add actions to your existing goals</li>
            <li>Mark actions as complete</li>
          </ul>
          
          <p className="mt-4 text-sm">
            <a 
              href="/assistant" 
              className="text-blue-500 hover:underline flex items-center gap-1"
            >
              <Bot className="h-4 w-4" />
              Try the AI Assistant
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISettings; 
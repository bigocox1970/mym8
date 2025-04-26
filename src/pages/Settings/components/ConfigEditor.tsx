import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { getConfig, updateConfig, AppConfig } from "@/lib/configManager";

const ConfigEditor = () => {
  const [configText, setConfigText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load current config
    try {
      const config = getConfig();
      setConfigText(JSON.stringify(config, null, 2));
      setError(null);
    } catch (err) {
      console.error("Error loading config:", err);
      setError("Failed to load configuration");
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse the JSON text
      const newConfig = JSON.parse(configText) as AppConfig;
      
      // Update the config
      await updateConfig(newConfig);
      
      toast.success("Configuration saved successfully");
      setError(null);
    } catch (err) {
      console.error("Error saving config:", err);
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your syntax.");
        toast.error("Invalid JSON format");
      } else {
        setError("Failed to save configuration");
        toast.error("Failed to save configuration");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfigText(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration Editor</CardTitle>
        <CardDescription>
          Directly edit your application configuration in JSON format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={configText}
          onChange={handleConfigChange}
          className="font-mono min-h-[300px]"
          placeholder="Loading configuration..."
        />
        
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConfigEditor; 
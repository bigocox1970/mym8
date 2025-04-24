
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader } from "lucide-react";

interface AppearanceSettingsProps {
  user: any;
  darkMode: boolean;
  onAppearanceUpdate: () => Promise<void>;
}

export const AppearanceSettings = ({ user, darkMode, onAppearanceUpdate }: AppearanceSettingsProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const toggleDarkMode = async () => {
    try {
      setIsSaving(true);
      const newDarkMode = !darkMode;
      
      const { error } = await supabase
        .from("profiles")
        .update({ dark_mode: newDarkMode })
        .eq("id", user.id);

      if (error) throw error;
      
      if (newDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      toast.success(`${newDarkMode ? "Dark" : "Light"} mode enabled`);
      await onAppearanceUpdate();
    } catch (error) {
      console.error("Error toggling dark mode:", error);
      toast.error("Failed to update theme");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={toggleDarkMode}
            disabled={isSaving}
          />
          <Label htmlFor="dark-mode">Dark Mode</Label>
          {isSaving && (
            <span className="text-sm text-muted-foreground ml-2 flex items-center">
              <Loader className="h-3 w-3 animate-spin mr-1" />
              Saving...
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

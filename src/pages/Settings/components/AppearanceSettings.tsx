import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface AppearanceSettingsProps {
  user: User | null;
  theme: string | null;
  onAppearanceUpdate: () => Promise<void>;
}

export const AppearanceSettings = ({ user, theme, onAppearanceUpdate }: AppearanceSettingsProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const toggleDarkMode = async () => {
    try {
      if (!user) return;
      
      setIsSaving(true);
      const isDarkMode = theme === 'dark';
      const newTheme = isDarkMode ? 'light' : 'dark';
      
      const { error } = await supabase
        .from("profiles")
        .update({ theme: newTheme })
        .eq("id", user.id);

      if (error) {
        console.error("Error toggling theme:", error);
        toast.error("Failed to update theme");
        return;
      }
      
      // Apply theme immediately
      document.documentElement.classList.remove("dark", "light");
      if (newTheme === 'dark') {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.add("light");
      }
      
      toast.success(`${newTheme === 'dark' ? "Dark" : "Light"} mode enabled`);
      await onAppearanceUpdate();
    } catch (error) {
      console.error("Error toggling theme:", error);
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
            checked={theme === 'dark'}
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

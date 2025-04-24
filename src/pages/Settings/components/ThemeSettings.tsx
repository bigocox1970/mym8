import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";

const ThemeSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [theme, setTheme] = useState<string | null>("light");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setTheme(profile.theme || "light");
    }
  }, [profile]);

  const updateTheme = async (newTheme: string) => {
    if (!user) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ theme: newTheme })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating theme:", error);
        toast.error("Failed to update theme");
        return;
      }

      setTheme(newTheme);
      
      // Apply theme immediately
      document.documentElement.classList.remove("dark", "light");
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (newTheme === "light") {
        document.documentElement.classList.add("light");
      } else if (newTheme === "system") {
        // Check system preference
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (systemPrefersDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.add("light");
        }
      }
      
      await refreshProfile();
      toast.success("Theme updated successfully");
    } catch (error) {
      console.error("Error in updateTheme:", error);
      toast.error("Failed to update theme");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sun className="h-6 w-6" />
          Theme Settings
        </CardTitle>
        <CardDescription>Customize the appearance of the app</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => updateTheme("light")}
              variant={theme === "light" ? "default" : "outline"}
              className="flex flex-col items-center justify-center py-6"
              disabled={loading}
            >
              <Sun className="h-6 w-6 mb-2" />
              <span>Light</span>
            </Button>
            <Button
              onClick={() => updateTheme("dark")}
              variant={theme === "dark" ? "default" : "outline"}
              className="flex flex-col items-center justify-center py-6"
              disabled={loading}
            >
              <Moon className="h-6 w-6 mb-2" />
              <span>Dark</span>
            </Button>
            <Button
              onClick={() => updateTheme("system")}
              variant={theme === "system" ? "default" : "outline"}
              className="flex flex-col items-center justify-center py-6"
              disabled={loading}
            >
              <MonitorSmartphone className="h-6 w-6 mb-2" />
              <span>System</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSettings; 
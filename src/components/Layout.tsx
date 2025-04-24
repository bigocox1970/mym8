
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home, FileText, Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    nickname: string | null;
    avatar_url: string | null;
    dark_mode: boolean;
  } | null>(null);

  useEffect(() => {
    if (user) {
      // Load profile data when the layout mounts
      const loadProfileData = async () => {
        try {
          setLoading(true);
          console.log("Layout fetching profile for user ID:", user.id);
          const { data, error } = await supabase
            .from("profiles")
            .select("dark_mode, nickname, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
            
          if (error) {
            console.error("Error loading profile:", error);
            return;
          }
          
          console.log("Layout loaded profile data:", data);
          
          if (data) {
            setProfileData(data);
            
            // Apply dark mode setting
            if (data.dark_mode) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          } else if (user) {
            // If no profile exists, create one with default settings
            console.log("No profile found, creating default profile");
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({ 
                id: user.id,
                dark_mode: false
              });
              
            if (insertError) {
              console.error("Error creating profile:", insertError);
            }
          }
        } catch (error) {
          console.error("Error loading profile data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadProfileData();
    }
  }, [user, location.pathname]); // Re-fetch when user changes or pathname changes

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex dark:bg-gray-900">
      {user && (
        <aside className="w-16 md:w-64 bg-white border-r shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 flex flex-col h-full">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-center hidden md:block dark:text-white">MyM8.app</h1>
              <h1 className="text-2xl font-bold text-center md:hidden dark:text-white">M8</h1>
            </div>
            <nav className="space-y-2 flex-1">
              <Link to="/dashboard">
                <Button 
                  variant={isActive("/dashboard") ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </Button>
              </Link>
              <Link to="/journal">
                <Button 
                  variant={isActive("/journal") ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Journal</span>
                </Button>
              </Link>
              <Link to="/settings">
                <Button 
                  variant={isActive("/settings") ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
              </Link>
              {/* Admin link only visible to admin users */}
              {user?.email === "admin@mym8.app" && (
                <Link to="/admin">
                  <Button 
                    variant={isActive("/admin") ? "default" : "ghost"} 
                    className="w-full justify-start"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Admin</span>
                  </Button>
                </Link>
              )}
            </nav>
            <div>
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </aside>
      )}
      <main className="flex-1 p-4 md:p-8 dark:bg-gray-900 dark:text-white">{children}</main>
    </div>
  );
};

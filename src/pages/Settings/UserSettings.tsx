import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "lucide-react";
import { ProfileSettings } from "./components/ProfileSettings";
import { PasswordSettings } from "./components/PasswordSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import AISettings from "./components/AISettings";
import { toast } from "@/components/ui/sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const UserSettings = () => {
  const { user, loading: authLoading, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !profile && !authLoading) {
      const loadProfile = async () => {
        try {
          setIsLoading(true);
          await refreshProfile();
        } catch (error) {
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile settings");
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProfile();
    }
  }, [user, profile, authLoading, refreshProfile]);

  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true);
      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error refreshing profile:", error);
      toast.error("Failed to refresh profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading || !profile) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex items-center">
            <Loader className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Loading profile...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <MenuToggleButton />
        </div>
        
        <ProfileSettings 
          user={user} 
          profile={profile} 
          onProfileUpdate={handleProfileUpdate}
        />
        
        <PasswordSettings />
        
        <AppearanceSettings 
          user={user} 
          theme={profile?.theme || 'light'} 
          onAppearanceUpdate={handleProfileUpdate}
        />
        
        <AISettings />
        
        <Card>
          <CardHeader>
            <CardTitle>Setup Wizard</CardTitle>
            <CardDescription>Run the setup wizard again to reconfigure your preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Reset your wizard data and go through the setup process again</p>
              </div>
              <Button 
                variant="outline" 
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const { error } = await supabase
                      .from("profiles")
                      .update({ wizard_completed: false })
                      .eq("id", user?.id);
                      
                    if (error) throw error;
                    
                    toast.success("Wizard reset successful");
                    navigate("/wizard");
                  } catch (error) {
                    console.error("Error resetting wizard:", error);
                    toast.error("Failed to reset wizard");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Run Wizard Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UserSettings;

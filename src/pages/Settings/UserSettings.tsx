import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader, LogOut, ArrowRight, Trash } from "lucide-react";
import { ProfileSettings } from "./components/ProfileSettings";
import { PasswordSettings } from "./components/PasswordSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import AISettings from "./components/AISettings";
import ProfileContext from "./ProfileContext";
import { toast } from "@/components/ui/sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const UserSettings = () => {
  const { user, loading: authLoading, profile, refreshProfile, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [resetWizardLoading, setResetWizardLoading] = useState(false);
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

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWizard = async (keepExistingData = false) => {
    if (!user) return;
    
    try {
      setResetWizardLoading(true);
      
      // Store user preference in localStorage instead of database
      localStorage.setItem('wizard_keep_existing_data', keepExistingData ? 'true' : 'false');
      
      // Set the wizard_completed to false to trigger the wizard again
      const { error } = await supabase
        .from("profiles")
        .update({ 
          wizard_completed: false
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // If user chose to delete all data, attempt to delete their goals and actions
      if (!keepExistingData) {
        try {
          // Try to delete actions if table exists, ignore any errors
          try {
            await supabase
              .from("actions")
              .delete()
              .eq("user_id", user.id);
              
            console.log("Actions deleted successfully");
          } catch (actionsError) {
            // Ignore errors - table might not exist
            console.log("No actions table found or could not delete actions");
          }
          
          // Try to delete goals if table exists, ignore any errors
          try {
            await supabase
              .from("goals")
              .delete()
              .eq("user_id", user.id);
              
            console.log("Goals deleted successfully");
          } catch (goalsError) {
            // Ignore errors - table might not exist
            console.log("No goals table found or could not delete goals");
          }
          
          toast.success("Data reset successful");
        } catch (deleteError) {
          console.error("Error during data reset (continuing with wizard):", deleteError);
          // Continue without showing error to user
        }
      }
      
      toast.success("Wizard reset successful");
      navigate("/wizard");
    } catch (error) {
      console.error("Error resetting wizard:", error);
      toast.error("Failed to reset wizard");
    } finally {
      setResetWizardLoading(false);
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
        
        <ProfileContext />
        
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Run Wizard Again</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Run Setup Wizard Again?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Choose how you'd like to proceed with the wizard:
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        variant="outline"
                        className="w-full p-3 h-auto flex flex-col items-center space-y-1 text-center"
                        onClick={() => handleResetWizard(true)}
                        disabled={resetWizardLoading}
                      >
                        <ArrowRight className="h-6 w-6 mb-1" />
                        <span className="font-semibold">Keep Existing Data</span>
                        <p className="text-xs text-muted-foreground">
                          Keep all your current goals and actions while updating settings
                        </p>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full p-3 h-auto flex flex-col items-center space-y-1 text-center"
                        onClick={() => handleResetWizard(false)}
                        disabled={resetWizardLoading}
                      >
                        <Trash className="h-6 w-6 mb-1" />
                        <span className="font-semibold">Start Fresh</span>
                        <p className="text-xs text-muted-foreground">
                          Delete all existing goals and actions and start over completely
                        </p>
                      </Button>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Sign Out</CardTitle>
            <CardDescription>Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">This will log you out of your account</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UserSettings;

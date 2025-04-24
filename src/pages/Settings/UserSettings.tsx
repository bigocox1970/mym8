import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "lucide-react";
import { ProfileSettings } from "./components/ProfileSettings";
import { PasswordSettings } from "./components/PasswordSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { toast } from "@/components/ui/sonner";

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
          darkMode={profile?.dark_mode || false} 
          onAppearanceUpdate={handleProfileUpdate}
        />
      </div>
    </Layout>
  );
};

export default UserSettings;

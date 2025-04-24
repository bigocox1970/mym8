
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "lucide-react";
import { ProfileSettings } from "./components/ProfileSettings";
import { PasswordSettings } from "./components/PasswordSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const UserSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    nickname: string | null;
    avatar_url: string | null;
    dark_mode: boolean;
  } | null>(null);

  const fetchProfile = async () => {
    try {
      if (!user) return null;
      
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, dark_mode")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile data");
        return null;
      }

      // Apply dark mode setting
      if (data && data.dark_mode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      setProfile(data);
      return data;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      toast.error("An error occurred while loading profile data");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/login");
      return;
    }

    if (!authLoading && user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        
        <ProfileSettings 
          user={user} 
          profile={profile} 
          onProfileUpdate={refreshProfile} 
        />
        
        <PasswordSettings />
        
        <AppearanceSettings 
          user={user} 
          darkMode={profile?.dark_mode || false} 
          onAppearanceUpdate={refreshProfile} 
        />
      </div>
    </Layout>
  );
};

export default UserSettings;

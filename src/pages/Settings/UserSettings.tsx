
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader } from "lucide-react";
import { ProfileSettings } from "./components/ProfileSettings";
import { PasswordSettings } from "./components/PasswordSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { toast } from "@/components/ui/sonner";

interface Profile {
  nickname: string | null;
  avatar_url: string | null;
  dark_mode: boolean;
}

const UserSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    nickname: "",
    avatar_url: null,
    dark_mode: false,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, dark_mode")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        
        // Only create a new profile if error code indicates no profile found
        if (error.code === "PGRST116") {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({ 
              id: user.id,
              dark_mode: false,
              nickname: ""
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
            toast.error("Failed to create profile");
          } else {
            // Fetch again after creating
            fetchProfile();
          }
        } else {
          toast.error("Failed to load profile data");
        }
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      toast.error("An error occurred while loading your profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          onProfileUpdate={fetchProfile} 
        />
        
        <PasswordSettings />
        
        <AppearanceSettings 
          user={user} 
          darkMode={profile.dark_mode} 
          onAppearanceUpdate={fetchProfile} 
        />
      </div>
    </Layout>
  );
};

export default UserSettings;

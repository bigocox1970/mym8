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
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    nickname: "",
    avatar_url: null,
    dark_mode: false,
  });

  useEffect(() => {
    if (!user) {
      toast.error("Please login to access settings");
      navigate("/login");
      return;
    }

    // Use the profile from auth context if available
    if (authProfile) {
      setProfile({
        nickname: authProfile.nickname,
        avatar_url: authProfile.avatar_url,
        dark_mode: authProfile.dark_mode,
      });
      setLoading(false);
      return;
    }

    // Otherwise fetch directly
    fetchProfile();
  }, [user, navigate, authProfile]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log("Fetching profile for user ID:", user.id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, dark_mode")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Error loading profile data");
        return;
      }
      
      if (data) {
        console.log("Fetched profile data:", data);
        setProfile(data);
      } else {
        // If no profile exists, create one
        try {
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({ 
              id: user.id,
              dark_mode: false,
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
            toast.error("Failed to create user profile");
          } else {
            setProfile({
              nickname: "",
              avatar_url: null,
              dark_mode: false,
            });
          }
        } catch (e) {
          console.error("Error in profile creation:", e);
          toast.error("An unexpected error occurred");
        }
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
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

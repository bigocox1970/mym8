
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Loader } from "lucide-react";
import { ProfileSettings } from "./components/ProfileSettings";
import { PasswordSettings } from "./components/PasswordSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";

const UserSettings = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/login");
      return;
    }

    if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, navigate]);

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

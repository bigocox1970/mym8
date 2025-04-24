
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import { Loader } from "lucide-react";

interface Profile {
  nickname: string | null;
  avatar_url: string | null;
  dark_mode: boolean;
}

const UserSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({
    nickname: "",
    avatar_url: null,
    dark_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
      console.log("Fetching profile for user ID:", user.id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, dark_mode")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
        return;
      }
      
      if (data) {
        console.log("Fetched profile data:", data);
        setProfile({
          nickname: data.nickname || "",
          avatar_url: data.avatar_url,
          dark_mode: !!data.dark_mode
        });
        
        // Set avatar preview
        setAvatarPreview(data.avatar_url);
        
        // Update dark mode
        if (data.dark_mode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        console.log("No profile data found, creating new profile");
        
        // If no profile exists yet, create one
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
        }
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsSaving(true);
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Set preview immediately for better UX
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      console.log("Avatar uploaded, public URL:", publicUrl);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
      
      // Refetch profile to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      // Reset preview on error
      await fetchProfile();
    } finally {
      setIsSaving(false);
    }
  };

  const handleNicknameUpdate = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      console.log("Updating nickname to:", profile.nickname);
      
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: profile.nickname })
        .eq("id", user.id);

      if (error) throw error;
      
      toast.success("Nickname updated successfully");
      
      // Refetch profile to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      console.error("Error updating nickname:", error);
      toast.error("Failed to update nickname");
      // Reset to the last known good state
      await fetchProfile();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setNewPassword("");
      toast.success("Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDarkMode = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      const newDarkMode = !profile.dark_mode;
      console.log("Toggling dark mode to:", newDarkMode);
      
      const { error } = await supabase
        .from("profiles")
        .update({ dark_mode: newDarkMode })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update local state
      setProfile(prev => ({ ...prev, dark_mode: newDarkMode }));
      
      // Apply dark mode toggle
      if (newDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      toast.success(`${newDarkMode ? "Dark" : "Light"} mode enabled`);
      
      // Refetch profile
      await fetchProfile();
    } catch (error) {
      console.error("Error toggling dark mode:", error);
      toast.error("Failed to update theme");
      // Reset to the last known good state
      await fetchProfile();
    } finally {
      setIsSaving(false);
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
        
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 relative">
                {isSaving && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                    <Loader className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                <AvatarImage src={avatarPreview || ""} />
                <AvatarFallback>{profile.nickname?.[0] || user?.email?.[0]}</AvatarFallback>
              </Avatar>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="max-w-xs"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <div className="flex space-x-2">
                <Input
                  id="nickname"
                  value={profile.nickname || ""}
                  onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                  placeholder="Enter nickname"
                  disabled={isSaving}
                />
                <Button onClick={handleNicknameUpdate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : 'Save'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="flex space-x-2">
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isSaving}
                />
                <Button 
                  onClick={handlePasswordReset} 
                  disabled={isSaving || !newPassword}
                >
                  {isSaving ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : 'Update'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="dark-mode"
                checked={profile.dark_mode}
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
      </div>
    </Layout>
  );
};

export default UserSettings;

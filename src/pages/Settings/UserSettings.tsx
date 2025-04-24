
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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, dark_mode")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
        if (data.dark_mode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Avatar updated successfully");
      
      // Refresh the profile to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    }
  };

  const handleNicknameUpdate = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ nickname: profile.nickname })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Nickname updated successfully");
      
      // Refresh the profile to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      console.error("Error updating nickname:", error);
      toast.error("Failed to update nickname");
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setNewPassword("");
      toast.success("Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newDarkMode = !profile.dark_mode;
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ dark_mode: newDarkMode })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({ ...profile, dark_mode: newDarkMode });
      
      if (newDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      toast.success(`${newDarkMode ? "Dark" : "Light"} mode enabled`);
      
      // Refresh the profile to ensure we have the latest data
      await fetchProfile();
    } catch (error) {
      console.error("Error toggling dark mode:", error);
      toast.error("Failed to update theme");
    }
  };

  if (loading) {
    return <Layout><div className="flex justify-center items-center h-screen">Loading...</div></Layout>;
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
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback>{profile.nickname?.[0] || user?.email?.[0]}</AvatarFallback>
              </Avatar>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="max-w-xs"
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
                />
                <Button onClick={handleNicknameUpdate}>Save</Button>
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
                />
                <Button onClick={handlePasswordReset}>Update</Button>
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
              />
              <Label htmlFor="dark-mode">Dark Mode</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UserSettings;

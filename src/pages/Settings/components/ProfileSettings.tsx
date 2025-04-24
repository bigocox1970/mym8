
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import { Loader } from "lucide-react";

interface ProfileSettingsProps {
  user: any;
  profile: {
    nickname: string | null;
    avatar_url: string | null;
  };
  onProfileUpdate: () => Promise<void>;
}

export const ProfileSettings = ({ user, profile, onProfileUpdate }: ProfileSettingsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [nickname, setNickname] = useState(profile.nickname || "");

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

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
      await onProfileUpdate();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      setAvatarPreview(profile.avatar_url);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNicknameUpdate = async () => {
    try {
      setIsSaving(true);
      
      console.log("Updating nickname for user:", user.id, "to:", nickname);
      
      const { error } = await supabase
        .from("profiles")
        .update({ nickname })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating nickname:", error);
        throw error;
      }
      
      toast.success("Nickname updated successfully");
      await onProfileUpdate();
    } catch (error) {
      console.error("Error updating nickname:", error);
      toast.error("Failed to update nickname");
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
            <AvatarFallback>{nickname?.[0] || user?.email?.[0]}</AvatarFallback>
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
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
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
  );
};

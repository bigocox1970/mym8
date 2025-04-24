
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader } from "lucide-react";

export const PasswordSettings = () => {
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  return (
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
  );
};

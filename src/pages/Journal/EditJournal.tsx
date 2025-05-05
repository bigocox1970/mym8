import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export const EditJournal = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!user || !id) return;

      try {
        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setContent(data.content || "");
      } catch (error) {
        console.error("Error fetching journal entry:", error);
        toast.error("Failed to load journal entry");
        navigate("/journal");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [id, user, navigate]);

  const saveEntry = async () => {
    if (!user || !id) return;
    
    if (!content.trim()) {
      toast.error("Entry cannot be empty");
      return;
    }
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          content: content.trim(),
        })
        .eq("id", id)
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      toast.success("Journal entry updated successfully");
      navigate(`/journal/${id}`);
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to update your journal entry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Loading journal entry...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to={`/journal/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Edit Journal Entry</h1>
          </div>
          <Button 
            onClick={saveEntry} 
            disabled={!content.trim() || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
        
        <div className="border rounded-md p-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start typing your thoughts..."
            className="min-h-[300px] resize-none border-0 focus-visible:ring-0"
          />
        </div>
      </div>
    </Layout>
  );
};

export default EditJournal;

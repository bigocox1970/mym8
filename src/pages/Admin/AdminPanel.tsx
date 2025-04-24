
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { Plus, Save, Settings } from "lucide-react";
import LLMConfigForm from "./LLMConfigForm";

interface LLMConfig {
  id: string;
  function_name: string;
  llm_provider: string;
  api_key: string;
  pre_prompt: string;
  created_at: string;
}

const AdminPanel = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("journaling");

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        toast.error("Please login to access this page");
        navigate("/login");
        return;
      }

      // First check if profile is loaded from context
      if (profile && !profile.is_admin) {
        toast.error("Unauthorized: Admin access only");
        navigate("/dashboard");
        return;
      }

      // Double check with database query in case profile isn't loaded properly
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error checking admin status:", error);
          toast.error("An error occurred while checking admin status");
          navigate("/dashboard");
          return;
        }

        if (!data || !data.is_admin) {
          toast.error("Unauthorized: Admin access only");
          navigate("/dashboard");
          return;
        }

        fetchConfigs();
      } catch (error) {
        console.error("Error in admin access check:", error);
        toast.error("An error occurred. Please try again later.");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, navigate, profile]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("llm_configs")
        .select("*")
        .order("function_name", { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Error fetching LLM configs:", error);
      toast.error("Failed to load LLM configurations");
    }
  };

  const getConfigForFunction = (functionName: string) => {
    return configs.find(config => config.function_name === functionName) || null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Loading admin panel...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Button onClick={fetchConfigs} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Refresh Configs
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Assistant Configuration</CardTitle>
            <CardDescription>
              Configure LLM providers and customize pre-prompts for different functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="journaling" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="journaling">Journaling</TabsTrigger>
                <TabsTrigger value="depression">Depression</TabsTrigger>
                <TabsTrigger value="addiction">Addiction</TabsTrigger>
              </TabsList>

              <TabsContent value="journaling" className="mt-6">
                <LLMConfigForm 
                  functionName="journaling"
                  existingConfig={getConfigForFunction("journaling")}
                  onConfigSaved={fetchConfigs}
                />
              </TabsContent>

              <TabsContent value="depression" className="mt-6">
                <LLMConfigForm 
                  functionName="depression"
                  existingConfig={getConfigForFunction("depression")}
                  onConfigSaved={fetchConfigs}
                />
              </TabsContent>

              <TabsContent value="addiction" className="mt-6">
                <LLMConfigForm 
                  functionName="addiction"
                  existingConfig={getConfigForFunction("addiction")}
                  onConfigSaved={fetchConfigs}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPanel;

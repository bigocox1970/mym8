
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
    // Check if user is admin
    if (!profile?.is_admin) {
      toast.error("Unauthorized: Admin access only");
      navigate("/dashboard");
      return;
    }

    fetchConfigs();
  }, [user, navigate, profile]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("llm_configs")
        .select("*")
        .order("function_name", { ascending: true });

      if (error) throw error;
      setConfigs(data as LLMConfig[]);
    } catch (error) {
      console.error("Error fetching LLM configs:", error);
      toast.error("Failed to load LLM configurations");
    } finally {
      setLoading(false);
    }
  };

  const getConfigForFunction = (functionName: string) => {
    return configs.find(config => config.function_name === functionName) || null;
  };

  // If still loading or missing user/profile data, show loading state
  if (loading || !user || !profile) {
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

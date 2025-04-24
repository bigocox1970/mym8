
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("journaling");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        toast.error("Please login to access this page");
        navigate("/login");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        
        if (!data || !data.is_admin) {
          toast.error("Unauthorized: Admin access only");
          navigate("/dashboard");
          return;
        }
        
        setIsAdmin(true);
        fetchConfigs();
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast.error("An error occurred while checking admin status");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, navigate]);

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
    }
  };

  const getConfigForFunction = (functionName: string) => {
    return configs.find(config => config.function_name === functionName) || null;
  };

  // If still loading or user not logged in, show loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Loading admin panel...</p>
        </div>
      </Layout>
    );
  }

  // If not admin, this should be caught in the useEffect, but adding an extra check
  if (!isAdmin) {
    return null;
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

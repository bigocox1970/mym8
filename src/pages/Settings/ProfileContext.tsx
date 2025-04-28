import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getUserAIContext, 
  updateUserPreferences,
  addUserInterest,
  removeUserInterest,
  addUserDislike,
  removeUserDislike,
  updateUserPersonalInfo,
  updateUserAIContext,
  UserAIContext,
  UserPreference,
  PersonalInfoItem 
} from "@/lib/userProfileManager";
import { analyzeAllUserConversations } from '@/lib/api';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { BotIcon, UserIcon } from "lucide-react";

const ProfileContext = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<UserAIContext | null>(null);
  const [newInterest, setNewInterest] = useState("");
  const [newDislike, setNewDislike] = useState("");
  const [newPersonalInfo, setNewPersonalInfo] = useState({
    key: "",
    value: ""
  });
  const [newPreference, setNewPreference] = useState({
    key: "",
    value: ""
  });
  const [expandedHighlights, setExpandedHighlights] = useState<Set<number>>(new Set());

  // Load user context on component mount
  useEffect(() => {
    const loadUserContext = async () => {
      if (user?.id) {
        setLoading(true);
        const context = await getUserAIContext(user.id);
        console.log("Loaded user context:", context);
        if (context?.conversation_highlights) {
          console.log("Conversation highlights:", context.conversation_highlights, "Length:", context.conversation_highlights.length);
        }
        setUserContext(context);
        setLoading(false);
      }
    };

    loadUserContext();
  }, [user]);

  const handleAddInterest = async () => {
    if (!user?.id || !newInterest.trim()) return;

    try {
      const updatedContext = await addUserInterest(user.id, newInterest.trim());
      if (updatedContext) {
        setUserContext(updatedContext);
        setNewInterest("");
        toast.success("Interest added successfully!");
      }
    } catch (error) {
      console.error("Error adding interest:", error);
      toast.error("Failed to add interest");
    }
  };

  const handleRemoveInterest = async (interest: string) => {
    if (!user?.id) return;

    try {
      const updatedContext = await removeUserInterest(user.id, interest);
      if (updatedContext) {
        setUserContext(updatedContext);
        toast.success("Interest removed successfully!");
      }
    } catch (error) {
      console.error("Error removing interest:", error);
      toast.error("Failed to remove interest");
    }
  };

  const handleAddDislike = async () => {
    if (!user?.id || !newDislike.trim()) return;

    try {
      const updatedContext = await addUserDislike(user.id, newDislike.trim());
      if (updatedContext) {
        setUserContext(updatedContext);
        setNewDislike("");
        toast.success("Dislike added successfully!");
      }
    } catch (error) {
      console.error("Error adding dislike:", error);
      toast.error("Failed to add dislike");
    }
  };

  const handleRemoveDislike = async (dislike: string) => {
    if (!user?.id) return;

    try {
      const updatedContext = await removeUserDislike(user.id, dislike);
      if (updatedContext) {
        setUserContext(updatedContext);
        toast.success("Dislike removed successfully!");
      }
    } catch (error) {
      console.error("Error removing dislike:", error);
      toast.error("Failed to remove dislike");
    }
  };

  const handleAddPersonalInfo = async () => {
    if (!user?.id || !newPersonalInfo.key.trim() || !newPersonalInfo.value.trim()) return;

    try {
      const key = newPersonalInfo.key.trim();
      const infoItem: PersonalInfoItem = {
        value: newPersonalInfo.value.trim(),
        source: 'user',
        confidence: 1.0,
        last_updated: new Date().toISOString()
      };

      const personalInfoUpdate = {
        [key]: infoItem
      };

      const updatedContext = await updateUserPersonalInfo(user.id, personalInfoUpdate);
      if (updatedContext) {
        setUserContext(updatedContext);
        setNewPersonalInfo({ key: "", value: "" });
        toast.success("Personal information added successfully!");
      }
    } catch (error) {
      console.error("Error adding personal info:", error);
      toast.error("Failed to add personal information");
    }
  };

  const handleAddPreference = async () => {
    if (!user?.id || !newPreference.key.trim() || !newPreference.value.trim()) return;

    try {
      const key = newPreference.key.trim();
      const prefItem: UserPreference = {
        value: newPreference.value.trim(),
        last_updated: new Date().toISOString()
      };

      const preferenceUpdate = {
        [key]: prefItem
      };

      const updatedContext = await updateUserPreferences(user.id, preferenceUpdate);
      if (updatedContext) {
        setUserContext(updatedContext);
        setNewPreference({ key: "", value: "" });
        toast.success("Preference added successfully!");
      }
    } catch (error) {
      console.error("Error adding preference:", error);
      toast.error("Failed to add preference");
    }
  };

  const toggleHighlight = (index: number) => {
    setExpandedHighlights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">AI Assistant Profile</h1>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">AI Assistant Profile</h1>
      <p className="mb-6 text-muted-foreground">
        Manage your AI assistant's understanding of your preferences, interests, and personal information.
        This information helps the assistant provide more personalized responses.
      </p>

      <Tabs defaultValue="interests" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="interests">Interests & Dislikes</TabsTrigger>
          <TabsTrigger value="personalInfo">Personal Information</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="highlights">Conversation Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="interests">
          <Card>
            <CardHeader>
              <CardTitle>Interests & Dislikes</CardTitle>
              <CardDescription>
                Add things you're interested in or dislike to help the assistant understand your preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Your Interests</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {userContext?.interests && userContext.interests.length > 0 ? (
                    userContext.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {interest}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveInterest(interest)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No interests added yet.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add a new interest"
                  />
                  <Button onClick={handleAddInterest}>Add</Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Your Dislikes</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {userContext?.dislikes && userContext.dislikes.length > 0 ? (
                    userContext.dislikes.map((dislike, index) => (
                      <Badge key={index} variant="destructive" className="flex items-center gap-1">
                        {dislike}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveDislike(dislike)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No dislikes added yet.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newDislike}
                    onChange={(e) => setNewDislike(e.target.value)}
                    placeholder="Add a new dislike"
                  />
                  <Button onClick={handleAddDislike} variant="destructive">Add</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personalInfo">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Add personal information that can help the assistant provide tailored responses.
                This information is only used to personalize the assistant's responses to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Current Information</h3>
                {userContext?.personal_info && Object.keys(userContext.personal_info).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(userContext.personal_info).map(([key, info]) => (
                      <div key={key} className="border p-3 rounded-md">
                        <h4 className="font-medium">{key}</h4>
                        <p className="text-sm text-muted-foreground">{(info as PersonalInfoItem).value}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Source: {(info as PersonalInfoItem).source}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No personal information added yet.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Add Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="infoKey">Type of Information</Label>
                    <Input
                      id="infoKey"
                      value={newPersonalInfo.key}
                      onChange={(e) => setNewPersonalInfo({ ...newPersonalInfo, key: e.target.value })}
                      placeholder="e.g., Job, Children, Location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="infoValue">Value</Label>
                    <Input
                      id="infoValue"
                      value={newPersonalInfo.value}
                      onChange={(e) => setNewPersonalInfo({ ...newPersonalInfo, value: e.target.value })}
                      placeholder="e.g., Software Developer, 2 kids, New York"
                    />
                  </div>
                </div>
                <Button onClick={handleAddPersonalInfo}>Add Information</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Set your preferences to customize how the assistant interacts with you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Current Preferences</h3>
                {userContext?.preferences && Object.keys(userContext.preferences).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(userContext.preferences).map(([key, pref]) => (
                      <div key={key} className="border p-3 rounded-md">
                        <h4 className="font-medium">{key}</h4>
                        <p className="text-sm text-muted-foreground">{(pref as UserPreference).value.toString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No preferences added yet.</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Add Preference</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="prefKey">Preference Type</Label>
                    <Input
                      id="prefKey"
                      value={newPreference.key}
                      onChange={(e) => setNewPreference({ ...newPreference, key: e.target.value })}
                      placeholder="e.g., communication_style, response_length"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prefValue">Value</Label>
                    <Input
                      id="prefValue"
                      value={newPreference.value}
                      onChange={(e) => setNewPreference({ ...newPreference, value: e.target.value })}
                      placeholder="e.g., casual, concise"
                    />
                  </div>
                </div>
                <Button onClick={handleAddPreference}>Add Preference</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Conversation Highlights</CardTitle>
                <CardDescription>
                  Important points from your conversations with the assistant.
                  These help the assistant maintain context across conversations.
                </CardDescription>
              </div>
              <Button 
                onClick={async () => {
                  if (user?.id) {
                    setLoading(true);
                    // Analyze past conversations to extract more context
                    const analyzed = await analyzeAllUserConversations(user.id);
                    
                    // Force reload data from server
                    const freshContext = await getUserAIContext(user.id);
                    console.log("Refreshed data:", freshContext);
                    if (freshContext?.conversation_highlights) {
                      console.log("Fresh conversation highlights:", 
                        freshContext.conversation_highlights, 
                        "Length:", freshContext.conversation_highlights.length,
                        "Type:", Array.isArray(freshContext.conversation_highlights) ? "Array" : typeof freshContext.conversation_highlights
                      );
                    }
                    setUserContext(freshContext);
                    setLoading(false);
                    
                    if (analyzed) {
                      toast.success("Successfully analyzed past conversations and refreshed highlights");
                    } else {
                      toast.success("Refreshed conversation highlights");
                    }
                  }
                }}
                variant="outline"
                size="sm"
              >
                Refresh Data
              </Button>
            </CardHeader>
            <CardContent>
              {userContext?.conversation_highlights && Array.isArray(userContext.conversation_highlights) && userContext.conversation_highlights.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-end mb-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={async () => {
                        if (user?.id && window.confirm("Are you sure you want to clear all conversation highlights?")) {
                          setLoading(true);
                          try {
                            // Update context with empty highlights array
                            const updated = await updateUserAIContext(user.id, {
                              conversation_highlights: []
                            });
                            
                            if (updated) {
                              setUserContext(updated);
                              toast.success("Cleared all conversation highlights");
                            }
                          } catch (error) {
                            console.error("Error clearing highlights:", error);
                            toast.error("Failed to clear highlights");
                          }
                          setLoading(false);
                        }
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                  {userContext.conversation_highlights.map((highlight, index) => {
                    const isExpanded = expandedHighlights.has(index);
                    const isLong = highlight.length > 150;
                    const displayText = isLong && !isExpanded 
                      ? highlight.substring(0, 150) + "..." 
                      : highlight;
                    
                    return (
                      <div key={index} className={`p-3 rounded-md ${highlight.startsWith('Assistant:') ? 'bg-muted border-l-4 border-primary ml-4' : 'border'}`}>
                        <div className="flex items-start gap-2">
                          {highlight.startsWith('Assistant:') ? (
                            <BotIcon className="h-4 w-4 mt-1 text-primary" />
                          ) : (
                            <UserIcon className="h-4 w-4 mt-1" />
                          )}
                          <div className="w-full">
                            <p className="text-sm whitespace-pre-wrap">{displayText}</p>
                            {isLong && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="px-0 h-5 text-xs"
                                onClick={() => toggleHighlight(index)}
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </Button>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(Date.now() - (index * 86400000)).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No conversation highlights recorded yet.</p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                Highlights are automatically saved from your conversations with the assistant.
                Click "Refresh Data" to analyze your conversation history and extract more highlights.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileContext; 
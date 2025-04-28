import React from "react";
import { Layout, MenuToggleButton } from "@/components/Layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Bot, 
  Calendar, 
  CheckSquare, 
  ClipboardList, 
  Globe, 
  Lightbulb, 
  ListTodo, 
  MessageSquare, 
  Mic, 
  VolumeX, Volume2
} from "lucide-react";

const HelpPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">AI Assistant Help</h1>
          <div className="flex items-center gap-2">
            <MenuToggleButton />
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>About Your AI Assistant</CardTitle>
            <CardDescription>
              MyM8 is a goal-tracking assistant designed to help you manage your goals and actions, provide encouragement, and answer questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Capabilities Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">What Your AI Assistant Can Do</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Goals Management */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <ListTodo className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Goals Management</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ask the AI to help you create, track, and refine your goals. You can ask for suggestions, clarification, or refinement of your existing goals.
                      </p>
                      <p className="text-sm mt-2 italic">
                        "Can you help me create a goal for improving my fitness?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Planning */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <CheckSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Action Planning</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get help breaking down your goals into actionable steps. The AI can suggest specific actions with appropriate frequencies.
                      </p>
                      <p className="text-sm mt-2 italic">
                        "What daily actions should I take to learn Spanish?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Tracking */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Progress Tracking</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Discuss your progress with the AI. Get insights on your completed actions, skipped tasks, and overall goal advancement.
                      </p>
                      <p className="text-sm mt-2 italic">
                        "How am I doing with my coding practice goal?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Motivation & Encouragement */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Motivation & Encouragement</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        The AI can provide encouragement, motivational tips, and celebrate your wins with you.
                      </p>
                      <p className="text-sm mt-2 italic">
                        "I'm feeling unmotivated today, can you help me get back on track?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scheduling & Reminders */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Scheduling Advice</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get suggestions on how to schedule your actions based on their frequency and your lifestyle.
                      </p>
                      <p className="text-sm mt-2 italic">
                        "When should I schedule my weekly review session?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* General Questions */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">General Knowledge</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ask questions about topics related to your goals, personal development, productivity, or general knowledge.
                      </p>
                      <p className="text-sm mt-2 italic">
                        "What are some effective study techniques?"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interaction Features */}
            <div className="space-y-4 pt-4">
              <h2 className="text-2xl font-semibold">Interaction Features</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Voice Input */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Mic className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Voice Input</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Talk to your assistant using your microphone. Click the microphone icon in the chat interface to start voice input.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Voice Output */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Volume2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Voice Output</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Have the AI speak responses aloud. Toggle the speaker icon to enable or disable voice output.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat History */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Chat History</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your conversations are saved automatically. Access previous conversations from the sidebar in the assistant view.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal AI */}
                <div className="border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Personalized Assistant</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your AI has access to your goals and actions, making it personally tailored to your needs and progress.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="space-y-4 pt-4">
              <h2 className="text-2xl font-semibold">Tips for Effective AI Interaction</h2>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>Be specific in your questions and requests</li>
                <li>Provide context when asking about specific goals or actions</li>
                <li>Use clear language when asking the AI to help create new goals or actions</li>
                <li>Try different phrasings if you don't get the response you're looking for</li>
                <li>For complex requests, break them down into smaller questions</li>
                <li>Remember that the AI can see your goals and actions, so you can reference them directly</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default HelpPage; 
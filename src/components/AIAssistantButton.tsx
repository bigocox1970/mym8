import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

interface AIAssistantButtonProps {
  question?: string;
  title?: string;
}

/**
 * A button component that navigates to the AI Assistant page
 * Optionally can pre-populate a question for the assistant
 */
const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ 
  question,
  title = "Ask AI assistant for help"
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // If a question is provided, store it in localStorage for the Assistant page to pick up
    if (question) {
      localStorage.setItem('assistantQuestion', question);
    }
    
    // Navigate to the assistant page
    navigate('/assistant');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      title={title}
    >
      <Bot className="h-4 w-4 text-primary" />
    </Button>
  );
};

export default AIAssistantButton; 
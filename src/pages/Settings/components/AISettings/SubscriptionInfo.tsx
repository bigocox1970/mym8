import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { VOICE_SERVICES } from "@/config/voice";

interface SubscriptionInfoProps {
  subscription: {
    level: string;
    services: string[];
    maxTokens: number;
    models: string[];
  };
  availableServices: string[];
}

export const SubscriptionInfo: React.FC<SubscriptionInfoProps> = ({
  subscription,
  availableServices
}) => {
  return (
    <div className="bg-muted/50 p-4 rounded-lg mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Current Subscription</h3>
        <Badge variant={subscription.level === 'free' ? "outline" : "default"}>
          {subscription.level.charAt(0).toUpperCase() + subscription.level.slice(1)}
        </Badge>
      </div>
      <p className="text-sm mb-2">Available voice services:</p>
      <div className="flex flex-wrap gap-2">
        {availableServices.map(service => {
          const serviceName = VOICE_SERVICES.find(s => s.value === service)?.label || service;
          return (
            <Badge key={service} variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {serviceName}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}; 
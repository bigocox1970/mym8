import React from "react";
import { Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Calendar, Users, CreditCard } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "@/components/ui/sonner";

interface SubscriptionSettingsProps {
  user: User | null;
}

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ user }) => {
  const { subscription, loading, isFree, isBasic, isPro, refresh } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading subscription information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getTierBadge = () => {
    if (isPro) {
      return <Badge className="ml-2 bg-primary text-primary-foreground">PRO</Badge>;
    }
    if (isBasic) {
      return <Badge className="ml-2 bg-blue-500 text-white">BASIC</Badge>;
    }
    return <Badge className="ml-2" variant="outline">FREE</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate AI messages usage
  const messagesUsed = subscription?.ai_messages_used || 0;
  const messagesLimit = subscription?.features.ai_messages_per_month || 10;
  const messagePercentage = Math.min(Math.round((messagesUsed / messagesLimit) * 100), 100);
  const messagesRemaining = Math.max(messagesLimit - messagesUsed, 0);

  const handleCancelSubscription = async () => {
    // This would be a real implementation in production
    toast.info("This would cancel your subscription in a real app");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Subscription {getTierBadge()}</CardTitle>
            <CardDescription>Manage your subscription plan</CardDescription>
          </div>
          <Link to="/pricing">
            <Button variant="outline" size="sm">
              View Plans
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Info */}
        <div className="rounded-md border p-4">
          <h3 className="font-medium mb-2">Current Plan</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">
                {isFree ? "Free Tier" : isBasic ? "Basic Plan" : "Pro Plan"}
              </span>
            </div>
            {!isFree && subscription?.expires_at && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  Renews on {formatDate(subscription.expires_at)}
                </span>
              </div>
            )}
            {!isFree && (
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  {isBasic ? "£3.99/month" : "£9.99/month"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AI Messages Usage */}
        <div>
          <h3 className="font-medium mb-2">AI Assistant Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {messagesUsed} of {messagesLimit} messages used
              </span>
              <span className="text-muted-foreground">
                {messagesRemaining} remaining
              </span>
            </div>
            <Progress value={messagePercentage} className="h-2" />
            {messagePercentage >= 80 && (
              <div className="flex items-start gap-2 mt-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>
                  You're approaching your monthly limit. 
                  {!isPro && (
                    <Link to="/pricing" className="text-primary hover:underline ml-1">
                      Upgrade for more messages
                    </Link>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div>
          <h3 className="font-medium mb-2">Features Included</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {subscription?.features.max_goals === -1 
                  ? "Unlimited goals" 
                  : `${subscription?.features.max_goals} goals`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {subscription?.features.max_todos === -1 
                  ? "Unlimited todos" 
                  : `${subscription?.features.max_todos} todos`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {subscription?.features.max_journals === -1 
                  ? "Unlimited journal entries" 
                  : `${subscription?.features.max_journals} journal entries`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {subscription?.features.premium_voices 
                  ? "Premium voice models" 
                  : "Basic voice models"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {subscription?.features.ads_disabled 
                  ? "No advertisements" 
                  : "Ad-supported"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t">
          {!isFree ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="text-destructive"
                onClick={handleCancelSubscription}
              >
                Cancel Subscription
              </Button>
              <Link to="/pricing" className="inline-flex">
                <Button variant="outline">Change Plan</Button>
              </Link>
            </div>
          ) : (
            <Link to="/pricing">
              <Button>Upgrade Now</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionSettings; 
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getSubscriptionPlans, createCheckoutSession, SubscriptionPlan, SubscriptionFeatures } from "@/lib/subscriptionService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const PricingFeature: React.FC<{ included: boolean; feature: string }> = ({ included, feature }) => (
  <div className="flex items-center gap-2 mb-2">
    {included ? (
      <CheckCircle className="h-4 w-4 text-primary" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    )}
    <span className={included ? "" : "text-muted-foreground"}>{feature}</span>
  </div>
);

const Pricing: React.FC = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);
  const [subscribing, setSubscribing] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        console.log("Fetching subscription plans...");
        const planData = await getSubscriptionPlans();
        console.log("Received subscription plans:", planData);
        
        if (planData.length === 0) {
          console.warn("No subscription plans returned from the database");
          setError("No subscription plans available");
        }
        
        setPlans(planData);
      } catch (error) {
        console.error("Error loading subscription plans:", error);
        setError("Failed to load subscription plans");
        toast.error("Failed to load subscription plans");
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      navigate("/login");
      return;
    }

    setSubscribing(planId);
    try {
      const checkoutUrl = await createCheckoutSession(user.id, planId, yearly);
      
      if (checkoutUrl) {
        // In a real implementation, this would redirect to Stripe
        toast.success(`Successfully subscribed to ${planId} plan!`);
        // Navigate to success page or dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error("Failed to process subscription");
    } finally {
      setSubscribing("");
    }
  };

  const renderFeatureValue = (feature: keyof SubscriptionFeatures | boolean | number, plan: SubscriptionPlan) => {
    if (typeof feature === 'boolean') {
      return <PricingFeature included={feature} feature="" />;
    }
    
    if (typeof feature === 'number') {
      if (feature === -1) {
        return "Unlimited";
      }
      return feature;
    }
    
    return feature.toString();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading subscription plans...</p>
      </div>
    );
  }

  // If there's an error or no plans, show an error message
  if (error || plans.length === 0) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto py-12 px-4">
          <div className="flex items-center mb-8">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center text-sm text-muted-foreground hover:text-foreground mr-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {user ? "Back to Dashboard" : "Back to Home"}
            </Link>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track your goals with MyM8 and get access to powerful features to help you succeed.
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-muted/20 max-w-md mx-auto">
            <h3 className="text-lg font-medium mb-2">
              {error || "No subscription plans available"}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              We're experiencing technical difficulties loading our subscription plans. Please try again later.
            </p>
            <Button variant="default" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log("Rendering plans:", plans);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center mb-8">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center text-sm text-muted-foreground hover:text-foreground mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {user ? "Back to Dashboard" : "Back to Home"}
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track your goals with MyM8 and get access to powerful features to help you succeed.
          </p>
          
          <div className="flex items-center justify-center mt-8 space-x-2">
            <span className={`text-sm ${!yearly ? "font-medium" : ""}`}>Monthly</span>
            <Switch
              checked={yearly}
              onCheckedChange={setYearly}
              className="mx-2"
            />
            <span className={`text-sm ${yearly ? "font-medium" : ""}`}>
              Yearly
              <Badge variant="outline" className="ml-2 bg-primary/10">Save 20%</Badge>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            console.log("Rendering plan:", plan.id, plan);
            const price = yearly ? plan.price_yearly : plan.price_monthly;
            const features = plan.features;
            const currentPlan = subscription?.tier === plan.id;

            return (
              <Card 
                key={plan.id} 
                className={`${plan.id === 'pro' ? 'border-primary shadow-lg' : ''} relative`}
              >
                {plan.id === 'pro' && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    MOST POPULAR
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {price === 0 ? "Free" : `£${price.toFixed(2)}`}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground text-sm ml-1">
                        /{yearly ? "year" : "month"}
                      </span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-medium">What's included:</h4>
                    
                    <div>
                      <PricingFeature
                        included={features.max_goals === -1}
                        feature={features.max_goals === -1 ? "Unlimited goals" : `${features.max_goals} goals`}
                      />
                      <PricingFeature
                        included={features.max_actions_per_goal === -1}
                        feature={features.max_actions_per_goal === -1 ? "Unlimited actions per goal" : `${features.max_actions_per_goal} actions per goal`}
                      />
                      <PricingFeature
                        included={features.max_todos === -1}
                        feature={features.max_todos === -1 ? "Unlimited todos" : `${features.max_todos} todos`}
                      />
                      <PricingFeature
                        included={features.max_journals === -1}
                        feature={features.max_journals === -1 ? "Unlimited journal entries" : `${features.max_journals} journal entries`}
                      />
                      <PricingFeature
                        included={true}
                        feature={`${features.ai_messages_per_month} AI assistant messages per month`}
                      />
                      <PricingFeature
                        included={features.ads_disabled}
                        feature="No advertisements"
                      />
                      <PricingFeature
                        included={features.tts_enabled}
                        feature="Text-to-Speech"
                      />
                      <PricingFeature
                        included={features.stt_enabled}
                        feature="Speech-to-Text"
                      />
                      <PricingFeature
                        included={features.premium_voices}
                        feature="Premium voice models"
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.id === 'free' ? "outline" : plan.id === 'pro' ? "default" : "secondary"}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={currentPlan || subscribing === plan.id}
                  >
                    {subscribing === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : currentPlan ? (
                      "Current Plan"
                    ) : plan.id === 'free' ? (
                      "Get Started"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            By subscribing, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="mt-2">
            Have questions?{" "}
            <Link to="/help" className="underline hover:text-foreground">
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 
import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionFeatures } from '@/lib/subscriptionService';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureCheckProps {
  feature: keyof SubscriptionFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A component that conditionally renders content based on subscription feature access
 * 
 * @example
 * <FeatureCheck feature="premium_voices">
 *   <PremiumVoicesComponent />
 * </FeatureCheck>
 */
export const FeatureCheck: React.FC<FeatureCheckProps> = ({
  feature,
  children,
  fallback
}) => {
  const { hasAccess, loading } = useSubscription();
  
  // If still loading subscription data, don't render anything
  if (loading) return null;
  
  // If the user has access to the feature, render the children
  if (hasAccess(feature)) {
    return <>{children}</>;
  }
  
  // If a fallback is provided, render it
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default fallback is an upgrade prompt
  return (
    <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-muted/20">
      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
      <h3 className="text-lg font-medium mb-1">Upgrade Required</h3>
      <p className="text-sm text-muted-foreground text-center mb-4">
        This feature requires a higher subscription tier.
      </p>
      <Link to="/pricing">
        <Button variant="default" size="sm">
          View Plans
        </Button>
      </Link>
    </div>
  );
};

export default FeatureCheck; 
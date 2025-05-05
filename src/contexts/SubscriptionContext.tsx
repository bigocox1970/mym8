import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserSubscription, 
  hasFeatureAccess,
  SubscriptionFeatures,
  UserSubscription
} from '@/lib/subscriptionService';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  hasAccess: (feature: keyof SubscriptionFeatures) => boolean;
  refresh: () => Promise<void>;
  isFree: boolean;
  isBasic: boolean;
  isPro: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [featureAccessCache, setFeatureAccessCache] = useState<Record<string, boolean>>({});

  // Load subscription data on mount or when user changes
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getUserSubscription(user.id);
        setSubscription(data);
        // Clear cache when subscription changes
        setFeatureAccessCache({});
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user]);

  // Check if user has access to a feature
  const hasAccess = (feature: keyof SubscriptionFeatures): boolean => {
    // If no subscription data or loading, deny access
    if (loading || !subscription || !user) return false;

    // Check cache first for faster response
    const cacheKey = `${feature}`;
    if (featureAccessCache[cacheKey] !== undefined) {
      return featureAccessCache[cacheKey];
    }

    // For boolean features, return directly
    if (typeof subscription.features[feature] === 'boolean') {
      const hasAccess = subscription.features[feature] as boolean;
      setFeatureAccessCache(prev => ({ ...prev, [cacheKey]: hasAccess }));
      return hasAccess;
    }

    // For numeric features, -1 means unlimited
    if (typeof subscription.features[feature] === 'number') {
      const limit = subscription.features[feature] as number;
      if (limit === -1) {
        setFeatureAccessCache(prev => ({ ...prev, [cacheKey]: true }));
        return true;
      }

      // For message limit, we can check directly
      if (feature === 'ai_messages_per_month') {
        const hasAccess = subscription.ai_messages_used < limit;
        setFeatureAccessCache(prev => ({ ...prev, [cacheKey]: hasAccess }));
        return hasAccess;
      }

      // For other limits, we need to check against the database
      // This should be handled by the component making the request
      return true;
    }

    return false;
  };

  // Refresh subscription data
  const refresh = async () => {
    if (!user) return;

    try {
      const data = await getUserSubscription(user.id);
      setSubscription(data);
      // Clear cache when refreshing
      setFeatureAccessCache({});
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  // Helper properties
  const isFree = subscription?.tier === 'free';
  const isBasic = subscription?.tier === 'basic';
  const isPro = subscription?.tier === 'pro';

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        hasAccess,
        refresh,
        isFree,
        isBasic,
        isPro
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}; 
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { PRODUCT_IDS } from './stripeService';

/**
 * Types for subscription-related data
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number | null;
  features: SubscriptionFeatures;
  stripe_price_id: string | null;
  stripe_yearly_price_id: string | null;
  is_active: boolean;
}

export interface SubscriptionFeatures {
  max_goals: number;  // -1 means unlimited
  max_actions_per_goal: number;  // -1 means unlimited
  max_todos: number;  // -1 means unlimited
  max_journals: number;  // -1 means unlimited
  ai_messages_per_month: number;
  tts_enabled: boolean;
  stt_enabled: boolean;
  premium_voices: boolean;
  ads_disabled: boolean;
}

export interface UserSubscription {
  tier: string;
  expires_at: string | null;
  ai_messages_used: number;
  features: SubscriptionFeatures;
}

// Interface for database error handling
interface DbError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Retrieves subscription plans from the database
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });
    
    if (error) {
      console.error('Error fetching subscription plans:', error);
      return [];
    }
    
    return data as SubscriptionPlan[];
  } catch (error) {
    console.error('Error in getSubscriptionPlans:', error);
    return [];
  }
}

/**
 * Gets the user's current subscription information
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    // Get the user's profile with subscription information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at, ai_messages_used')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return null;
    }
    
    // Get the features for this subscription tier
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('features')
      .eq('id', profile.subscription_tier)
      .single();
    
    if (planError) {
      console.error('Error fetching subscription plan:', planError);
      return null;
    }
    
    return {
      tier: profile.subscription_tier,
      expires_at: profile.subscription_expires_at,
      ai_messages_used: profile.ai_messages_used,
      features: plan.features as SubscriptionFeatures
    };
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Checks if a user has access to a specific feature
 */
export async function hasFeatureAccess(
  userId: string, 
  feature: keyof SubscriptionFeatures
): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) return false;
    
    // For boolean features, just return the value
    if (typeof subscription.features[feature] === 'boolean') {
      return subscription.features[feature] as boolean;
    }
    
    // For numeric features, -1 means unlimited, otherwise check the limit
    if (typeof subscription.features[feature] === 'number') {
      const limit = subscription.features[feature] as number;
      if (limit === -1) return true;
      
      // Check current usage against limits
      let count: number = 0;
      let error: DbError | null = null;
      
      switch (feature) {
        case 'ai_messages_per_month':
          return subscription.ai_messages_used < limit;
          
        case 'max_goals':
          ({ count, error } = await supabase
            .from('goals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId));
          
          if (error) {
            console.error('Error counting goals:', error);
            return false;
          }
          
          return count < limit;
          
        case 'max_todos':
          ({ count, error } = await supabase
            .from('todos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId));
          
          if (error) {
            console.error('Error counting todos:', error);
            return false;
          }
          
          return count < limit;
          
        case 'max_journals':
          ({ count, error } = await supabase
            .from('journals')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId));
          
          if (error) {
            console.error('Error counting journals:', error);
            return false;
          }
          
          return count < limit;
          
        default:
          return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking feature access for ${feature}:`, error);
    return false;
  }
}

/**
 * Increments the AI message usage counter for a user
 */
export async function incrementAIMessageUsage(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('increment_ai_messages', { user_id_param: userId });
    
    if (error) {
      console.error('Error updating AI message usage:', error);
      return false;
    }
    
    // Get the updated profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ai_messages_used, subscription_tier')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile after update:', profileError);
      return false;
    }
    
    // Check if user hit their limit and notify them
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('features')
      .eq('id', profile.subscription_tier)
      .single();
      
    if (planError) {
      console.error('Error fetching subscription plan:', planError);
      return false;
    }
      
    const limit = plan.features.ai_messages_per_month;
    if (profile.ai_messages_used >= limit) {
      toast.warning(`You've used all your ${limit} AI messages for this month. Upgrade to get more!`);
    } else if (profile.ai_messages_used >= limit * 0.8) {
      toast.info(`You've used ${profile.ai_messages_used} of your ${limit} AI messages for this month.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in incrementAIMessageUsage:', error);
    return false;
  }
}

/**
 * Creates a Stripe checkout session for a subscription
 */
export async function createCheckoutSession(
  userId: string,
  planId: string,
  isYearly: boolean = false
): Promise<string | null> {
  try {
    // In production, this would call a serverless function that creates a Stripe checkout session
    // For this mock implementation, we'll log details and return a fake session

    // Get the Stripe product ID
    const productId = PRODUCT_IDS[planId as keyof typeof PRODUCT_IDS];
    
    if (!productId && planId !== 'free') {
      console.error(`No Stripe product ID found for plan: ${planId}`);
      toast.error('Invalid subscription plan');
      return null;
    }
    
    console.log(`Creating checkout session for user ${userId}, plan ${planId}, yearly: ${isYearly}`);
    console.log(`Using Stripe product ID: ${productId}`);
    
    toast.info('This would redirect to Stripe in production');
    
    // Return a mock session URL
    return 'https://checkout.stripe.com/mock-session';
  } catch (error) {
    console.error('Error creating checkout session:', error);
    toast.error('Failed to create checkout session');
    return null;
  }
}

/**
 * Handles a successful subscription from Stripe
 */
export async function handleSubscriptionSuccess(
  userId: string,
  planId: string,
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  expiresAt: string
): Promise<boolean> {
  try {
    // Update the user's profile with subscription information
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: planId,
        subscription_expires_at: expiresAt,
        stripe_customer_id: stripeCustomerId
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating user profile:', profileError);
      return false;
    }
    
    // Record subscription in history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        plan_id: planId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: expiresAt,
        is_active: true,
        payment_status: 'paid',
        renewal_status: 'scheduled'
      });
    
    if (historyError) {
      console.error('Error recording subscription history:', historyError);
      return false;
    }
    
    toast.success('Subscription activated successfully!');
    return true;
  } catch (error) {
    console.error('Error in handleSubscriptionSuccess:', error);
    return false;
  }
} 
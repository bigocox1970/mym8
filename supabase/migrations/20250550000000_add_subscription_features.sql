-- Add subscription fields to profiles table
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS ai_messages_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_messages_reset_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create function to increment AI message count
CREATE OR REPLACE FUNCTION increment_ai_messages(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles
    SET ai_messages_used = ai_messages_used + 1
    WHERE id = user_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    features JSONB NOT NULL,
    stripe_price_id TEXT,
    stripe_yearly_price_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create subscription_history table for tracking user subscriptions
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT,
    stripe_checkout_session_id TEXT,
    status TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    payment_status TEXT,
    renewal_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, stripe_price_id, stripe_yearly_price_id)
VALUES
(
    'free',
    'Free',
    'Basic goal tracking features',
    0.00,
    0.00,
    '{
        "max_goals": 1,
        "max_actions_per_goal": 3,
        "max_todos": 3,
        "max_journals": 5,
        "ai_messages_per_month": 10,
        "tts_enabled": true,
        "stt_enabled": true,
        "premium_voices": false,
        "ads_disabled": false
    }'::jsonb,
    NULL,
    NULL
),
(
    'basic',
    'Basic',
    'Unlimited goals and actions',
    3.99,
    39.90,
    '{
        "max_goals": -1,
        "max_actions_per_goal": -1,
        "max_todos": -1,
        "max_journals": -1,
        "ai_messages_per_month": 50,
        "tts_enabled": true,
        "stt_enabled": true,
        "premium_voices": false,
        "ads_disabled": true
    }'::jsonb,
    'prod_SFvhsQuTWnp2wN',
    'prod_SFvhsQuTWnp2wN'
),
(
    'pro',
    'Pro',
    'Premium features with advanced AI assistant',
    9.99,
    99.90,
    '{
        "max_goals": -1,
        "max_actions_per_goal": -1,
        "max_todos": -1,
        "max_journals": -1,
        "ai_messages_per_month": 300,
        "tts_enabled": true,
        "stt_enabled": true,
        "premium_voices": true,
        "ads_disabled": true
    }'::jsonb,
    'prod_SFvnfy8EKruh7M',
    'prod_SFvnfy8EKruh7M'
);

-- Add row level security for subscription tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Subscription plans policies (everyone can view, only admins can modify)
CREATE POLICY "Anyone can view subscription plans" 
ON subscription_plans FOR SELECT USING (true);

CREATE POLICY "Only admins can insert subscription plans" 
ON subscription_plans FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'admin@mym8.app'
));

CREATE POLICY "Only admins can update subscription plans" 
ON subscription_plans FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'admin@mym8.app'
));

-- Subscription history policies
CREATE POLICY "Users can view their own subscription history" 
ON subscription_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert subscription history" 
ON subscription_history FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@mym8.app')
);

CREATE POLICY "Only admins can update subscription history" 
ON subscription_history FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@mym8.app')
);

-- Comments on columns
COMMENT ON COLUMN profiles.subscription_tier IS 'Current subscription tier (free, basic, pro)';
COMMENT ON COLUMN profiles.subscription_expires_at IS 'When the current subscription expires';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for the user';
COMMENT ON COLUMN profiles.ai_messages_used IS 'Number of AI messages used in the current period';
COMMENT ON COLUMN profiles.ai_messages_reset_at IS 'When the AI message count was last reset';

-- Function to reset AI message counts monthly
CREATE OR REPLACE FUNCTION reset_ai_message_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's been a month since the last reset
    IF NEW.ai_messages_used > 0 AND (NEW.ai_messages_reset_at IS NULL OR NEW.ai_messages_reset_at < NOW() - INTERVAL '1 month') THEN
        NEW.ai_messages_used := 0;
        NEW.ai_messages_reset_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset message counts monthly
CREATE TRIGGER trigger_reset_ai_message_counts
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION reset_ai_message_counts();

-- Function to check subscription expiration and downgrade to free if expired
CREATE OR REPLACE FUNCTION check_subscription_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- If subscription is expired, downgrade to free
    IF NEW.subscription_tier != 'free' AND (NEW.subscription_expires_at IS NULL OR NEW.subscription_expires_at < NOW()) THEN
        NEW.subscription_tier := 'free';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check subscription expiration on profile update
CREATE TRIGGER trigger_check_subscription_expiration
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_subscription_expiration(); 
-- Add subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT '30_days',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_activated_at TIMESTAMPTZ;

-- Add index for expiry date for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON users(subscription_expires_at);

-- Update existing paid users to have 30 days subscription from created date
UPDATE users
SET
  subscription_plan = '30_days',
  subscription_activated_at = created_at,
  subscription_expires_at = created_at + INTERVAL '30 days'
WHERE has_paid = true AND subscription_expires_at IS NULL AND is_admin = false;

-- Admin accounts have no expiry
UPDATE users
SET
  subscription_plan = 'unlimited',
  subscription_activated_at = created_at,
  subscription_expires_at = NULL
WHERE is_admin = true;

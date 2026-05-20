-- Fix subscription dates - standardize to only 30 and 90 day plans
-- Run this in Supabase SQL Editor

-- 1. First fix any invalid dates that show 395+ days
UPDATE users
SET 
  subscription_expires_at = CASE 
    WHEN subscription_plan = '90' THEN (payment_date::timestamp + INTERVAL '90 days')
    ELSE (payment_date::timestamp + INTERVAL '30 days')
  END,
  has_paid = true,
  payment_status = 'completed'
WHERE 
  has_paid = true
  AND (
    subscription_expires_at IS NULL 
    OR subscription_expires_at < NOW()
    OR (NOW() + INTERVAL '365 days') < subscription_expires_at
  );

-- 2. Force correct subscription expiry for all active paid users
UPDATE users
SET subscription_expires_at = (payment_date::timestamp + INTERVAL '30 days')
WHERE 
  has_paid = true
  AND (subscription_plan IS NULL OR subscription_plan NOT IN ('30', '90'));

-- 3. Fix any users where payment_date is missing
UPDATE users
SET payment_date = created_at
WHERE 
  has_paid = true
  AND payment_date IS NULL;

-- 4. Recalculate expiry dates properly for everyone
UPDATE users
SET 
  subscription_expires_at = CASE 
    WHEN subscription_plan = '90' THEN (payment_date::timestamp + INTERVAL '90 days')
    ELSE (payment_date::timestamp + INTERVAL '30 days')
  END
WHERE has_paid = true;

-- 5. Clean up invalid plan values
UPDATE users
SET subscription_plan = '30'
WHERE subscription_plan NOT IN ('30', '90') AND has_paid = true;

-- Show summary after fix
SELECT 
  subscription_plan, 
  COUNT(*) as user_count,
  MIN(subscription_expires_at) as earliest_expiry,
  MAX(subscription_expires_at) as latest_expiry
FROM users 
WHERE has_paid = true
GROUP BY subscription_plan;

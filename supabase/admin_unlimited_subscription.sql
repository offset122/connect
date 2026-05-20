-- Set admin accounts to have unlimited subscription that never expires

UPDATE users
SET 
  has_paid = true,
  payment_status = 'completed',
  subscription_plan = '90',
  subscription_expires_at = '2099-12-31 23:59:59',
  payment_date = NOW()
WHERE is_admin = true;

-- Verify changes
SELECT 
  id,
  email,
  is_admin,
  subscription_expires_at
FROM users 
WHERE is_admin = true;

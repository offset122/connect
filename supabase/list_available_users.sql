-- Run this to see all existing valid users in your system
-- This will show you exactly which user ids actually exist

SELECT
  id,
  first_name,
  username,
  email,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 50;

-- Also check auth.users table (supabase internal users)
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 50;

-- Find orphaned auth users that don't exist in public users
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Find broken users in public table that don't exist in auth
SELECT pu.id, pu.first_name, pu.username
FROM users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

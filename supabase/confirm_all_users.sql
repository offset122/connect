-- This script will verify and confirm all users actually exist
-- Run this as superuser in Supabase SQL Editor

-- 1. Bypass RLS completely for this check
SET ROLE postgres;

-- 2. Show ALL users with no RLS filters
SELECT 
  id,
  first_name,
  username,
  email,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 100;

-- 3. Count total users
SELECT COUNT(*) as total_users_in_public_table FROM users;

-- 4. Show ALL auth users
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 100;

-- 5. Verify specific failing user exists
-- Replace with the user id you are testing with
SELECT * FROM users WHERE id = '80305e02-53e2-4b2e-ac2a-36461ecf79f0';

-- 6. Verify your current logged in user exists
SELECT * FROM users WHERE id = 'eb23eecd-a87a-402e-a599-1848c7ac2b9d';

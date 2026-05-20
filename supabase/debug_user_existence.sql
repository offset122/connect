-- Debug script to verify user existence and diagnose the 23503 false error
-- Run this in your Supabase SQL Editor

-- 1. First check if the target user ACTUALLY exists (replace with the user id from your logs)
SELECT id, first_name, username, email, created_at 
FROM users 
WHERE id = '80305e02-53e2-4b2e-ac2a-36461ecf79f0';

-- 2. Check if requester user exists
SELECT id, first_name, username, email, created_at 
FROM users 
WHERE id = 'eb23eecd-a87a-402e-a599-1848c7ac2b9d';

-- 3. Check existing phone request constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = rc.unique_constraint_name
  AND ccu.table_schema = rc.unique_constraint_schema
WHERE tc.table_name = 'phone_number_requests' AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Show RLS policies on phone_number_requests
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'phone_number_requests';

-- 5. Try manual insert as superuser (this will bypass RLS)
-- This will tell us if it's really a foreign key error or RLS error
INSERT INTO phone_number_requests (requester_id, target_user_id, request_status)
VALUES (
  'eb23eecd-a87a-402e-a599-1848c7ac2b9d',
  '80305e02-53e2-4b2e-ac2a-36461ecf79f0',
  'pending'
);

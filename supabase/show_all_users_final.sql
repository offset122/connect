-- FINAL SCRIPT - Shows 100% of users bypassing all RLS
-- Run this directly in Supabase SQL Editor

SET ROLE postgres;

SELECT 
  id,
  first_name,
  username,
  email,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;

-- Total count
SELECT COUNT(*) AS total_registered_users FROM users;

-- Fix script to restore all missing users from auth.users table
-- This will correctly handle missing metadata and not null constraints

INSERT INTO users (id, first_name, username, email, created_at, updated_at)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  email,
  created_at,
  now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM users)
ON CONFLICT (email) DO NOTHING;

-- Verify users were restored
SELECT COUNT(*) as total_users FROM users;

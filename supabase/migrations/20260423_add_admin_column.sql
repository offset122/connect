-- Add admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Whether the user is an administrator';
-- Add teeth_state column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS teeth_state TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.teeth_state IS 'User self reported dental condition';

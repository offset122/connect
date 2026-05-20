-- Add new profile fields for registration
ALTER TABLE users
ADD COLUMN IF NOT EXISTS height_feet TEXT,
ADD COLUMN IF NOT EXISTS height_inches TEXT,
ADD COLUMN IF NOT EXISTS weight TEXT,
ADD COLUMN IF NOT EXISTS complexion TEXT,
ADD COLUMN IF NOT EXISTS body_shape TEXT,
ADD COLUMN IF NOT EXISTS tribe TEXT,
ADD COLUMN IF NOT EXISTS teeth_state TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.height_feet IS 'User height feet component';
COMMENT ON COLUMN users.height_inches IS 'User height inches component';
COMMENT ON COLUMN users.weight IS 'User weight in kilograms';
COMMENT ON COLUMN users.complexion IS 'User skin complexion (Fair / Brown / Dark)';
COMMENT ON COLUMN users.body_shape IS 'User body shape (gender specific options)';
COMMENT ON COLUMN users.tribe IS 'User tribe / ethnicity';
COMMENT ON COLUMN users.teeth_state IS 'State / condition of user teeth';

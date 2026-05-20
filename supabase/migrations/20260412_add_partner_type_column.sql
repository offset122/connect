-- Add partner type column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_partner_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.relationship_partner_type IS 'What kind of partner are you in a relationship (free text input)';

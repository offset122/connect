-- Fix for phone_number_requests foreign key crash issues
-- This migration fixes the 23503 foreign key violation errors that crash the app

-- 1. First drop the existing strict foreign key constraints
ALTER TABLE phone_number_requests
DROP CONSTRAINT IF EXISTS phone_number_requests_requester_id_fkey;

ALTER TABLE phone_number_requests
DROP CONSTRAINT IF EXISTS phone_number_requests_target_user_id_fkey;

-- 2. Re-add foreign keys with ON DELETE SET NULL instead of RESTRICT
-- This allows requests to exist even if one user is deleted
ALTER TABLE phone_number_requests
ADD CONSTRAINT phone_number_requests_requester_id_fkey
FOREIGN KEY (requester_id) REFERENCES users(id)
ON DELETE SET NULL;

ALTER TABLE phone_number_requests
ADD CONSTRAINT phone_number_requests_target_user_id_fkey
FOREIGN KEY (target_user_id) REFERENCES users(id)
ON DELETE SET NULL;

-- 3. Add partial unique index instead of strict unique constraint
-- This prevents duplicates only when both users still exist
DROP INDEX IF EXISTS phone_number_requests_unique_pair;
CREATE UNIQUE INDEX phone_number_requests_unique_pair
ON phone_number_requests (requester_id, target_user_id)
WHERE requester_id IS NOT NULL AND target_user_id IS NOT NULL AND request_status = 'pending';

-- 4. Same fixes for photo_requests table
ALTER TABLE photo_requests
DROP CONSTRAINT IF EXISTS photo_requests_requester_id_fkey;

ALTER TABLE photo_requests
DROP CONSTRAINT IF EXISTS photo_requests_target_user_id_fkey;

ALTER TABLE photo_requests
ADD CONSTRAINT photo_requests_requester_id_fkey
FOREIGN KEY (requester_id) REFERENCES users(id)
ON DELETE SET NULL;

ALTER TABLE photo_requests
ADD CONSTRAINT photo_requests_target_user_id_fkey
FOREIGN KEY (target_user_id) REFERENCES users(id)
ON DELETE SET NULL;

-- 5. Same fixes for connections table (fixes 409 / 23505 errors)
ALTER TABLE connections
DROP CONSTRAINT IF EXISTS connections_requester_id_recipient_id_key;

ALTER TABLE connections
DROP CONSTRAINT IF EXISTS connections_requester_id_fkey;

ALTER TABLE connections
DROP CONSTRAINT IF EXISTS connections_recipient_id_fkey;

ALTER TABLE connections
ADD CONSTRAINT connections_requester_id_fkey
FOREIGN KEY (requester_id) REFERENCES users(id)
ON DELETE CASCADE;

ALTER TABLE connections
ADD CONSTRAINT connections_recipient_id_fkey
FOREIGN KEY (recipient_id) REFERENCES users(id)
ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_pair
ON connections (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))
WHERE requester_id IS NOT NULL AND recipient_id IS NOT NULL;

-- 6. Enable soft delete for orphaned requests
ALTER TABLE phone_number_requests ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT false;
ALTER TABLE photo_requests ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT false;

-- 7. Create function to cleanup orphaned requests
CREATE OR REPLACE FUNCTION cleanup_orphaned_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark requests as orphaned when user is deleted
  UPDATE phone_number_requests
  SET is_orphaned = true
  WHERE requester_id = OLD.id OR target_user_id = OLD.id;

  UPDATE photo_requests
  SET is_orphaned = true
  WHERE requester_id = OLD.id OR target_user_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Attach trigger to users table
DROP TRIGGER IF EXISTS on_user_delete_cleanup_requests ON users;
CREATE TRIGGER on_user_delete_cleanup_requests
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION cleanup_orphaned_requests();

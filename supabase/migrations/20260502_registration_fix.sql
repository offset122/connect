-- Registration Fix Migration
-- Adds the missing registration_complete column and fixes RLS policies

-- 1. Add registration_complete column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false;

-- 2. Add full_photo column if it doesn't exist (used in registration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_photo TEXT;

-- 3. Add passport_photo column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_photo TEXT;

-- 4. Fix RLS policies - remove duplicates and ensure proper access
-- First, let's drop any existing duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view other profiles" ON users;

-- Create consolidated RLS policies for users table
-- Allow authenticated users to read any profile
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Allow users to insert their own profile
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = auth_id);

-- Allow users to update their own profile
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    USING (auth.uid() = auth_id);

-- 5. Create index on auth_id for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- 6. Create index on registration_complete for filtering
CREATE INDEX IF NOT EXISTS idx_users_registration_complete ON users(registration_complete) WHERE registration_complete = false;

-- 7. Verify the fix - this will show current policies (run separately in SQL editor)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

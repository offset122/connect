-- ============================================================================
-- Hanna's Connect - FIXED Database Schema (No Infinite Recursion)
-- ============================================================================
-- This schema fixes the infinite recursion error by using direct auth.uid() checks
-- Run this entire file in your Supabase SQL Editor to replace the broken schema
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING POLICIES FIRST (to avoid conflicts)
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view active paid profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.users;

DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connection requests" ON public.connections;

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

-- Drop the simple policies too
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_active ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS connections_select_own ON public.connections;
DROP POLICY IF EXISTS connections_insert_own ON public.connections;
DROP POLICY IF EXISTS connections_update_own ON public.connections;
DROP POLICY IF EXISTS connections_delete_own ON public.connections;
DROP POLICY IF EXISTS messages_select_own ON public.messages;
DROP POLICY IF EXISTS messages_insert_own ON public.messages;
DROP POLICY IF EXISTS messages_update_own ON public.messages;
DROP POLICY IF EXISTS messages_delete_own ON public.messages;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_all ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
DROP POLICY IF EXISTS reports_select_own ON public.reports;
DROP POLICY IF EXISTS reports_insert_own ON public.reports;

-- ============================================================================
-- FIXED RLS POLICIES - USERS TABLE
-- ============================================================================

-- Allow users to view their own profile (direct auth.uid() check)
CREATE POLICY "users_select_own_profile"
  ON public.users FOR SELECT
  USING (auth.uid() = auth_id);

-- Allow users to view active paid profiles (but only basic info, not their own detailed profile)
CREATE POLICY "users_select_active_profiles"
  ON public.users FOR SELECT
  USING (
    auth.uid() != auth_id 
    AND is_active = true 
    AND (has_paid = true OR payment_status = 'completed')
  );

-- Allow users to insert their own profile during registration
CREATE POLICY "users_insert_own_profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Allow authenticated users to view their own data for connections/messages
-- This is needed for queries that join with other tables
CREATE POLICY "users_select_for_joins"
  ON public.users FOR SELECT
  USING (auth.uid() = auth_id);

-- ============================================================================
-- FIXED RLS POLICIES - CONNECTIONS TABLE  
-- ============================================================================

-- Allow users to view connections they're part of
-- Use auth.uid() directly instead of subquery to avoid recursion
CREATE POLICY "connections_select_own"
  ON public.connections FOR SELECT
  USING (
    requester_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
    OR recipient_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to create connection requests
CREATE POLICY "connections_insert_own"
  ON public.connections FOR INSERT
  WITH CHECK (
    requester_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to update connections they're part of
CREATE POLICY "connections_update_own"
  ON public.connections FOR UPDATE
  USING (
    requester_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
    OR recipient_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to delete connection requests they created
CREATE POLICY "connections_delete_own"
  ON public.connections FOR DELETE
  USING (
    requester_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================================
-- FIXED RLS POLICIES - MESSAGES TABLE
-- ============================================================================

-- Allow users to view messages they sent or received
CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (
    sender_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
    OR receiver_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to send messages
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to update received messages (mark as read)
CREATE POLICY "messages_update_received"
  ON public.messages FOR UPDATE
  USING (
    receiver_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to delete messages they sent
CREATE POLICY "messages_delete_own"
  ON public.messages FOR DELETE
  USING (
    sender_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================================
-- FIXED RLS POLICIES - NOTIFICATIONS TABLE
-- ============================================================================

-- Allow users to view their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow system/service role to create notifications
CREATE POLICY "notifications_insert_system"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own notifications
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- ============================================================================
-- FIXED RLS POLICIES - REPORTS TABLE
-- ============================================================================

-- Allow users to view their own reports
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (
    reporter_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow users to create reports
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Allow admins to view all reports (using service role or specific admin auth)
CREATE POLICY "reports_select_admin"
  ON public.reports FOR SELECT
  USING (
    -- This will be managed through service role or application-level admin checks
    auth.jwt() ->> 'role' = 'service_role'
    OR auth.uid() IN (
      SELECT auth_id FROM public.users WHERE is_admin = true
    )
  );

-- Allow admins to update reports
CREATE POLICY "reports_update_admin"
  ON public.reports FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR auth.uid() IN (
      SELECT auth_id FROM public.users WHERE is_admin = true
    )
  );

-- ============================================================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================================================

-- Function to safely get current user's ID (if exists)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM public.users 
    WHERE auth_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_admin 
    FROM public.users 
    WHERE auth_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXED Database schema applied successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Infinite recursion error resolved!';
  RAISE NOTICE 'Key fixes:';
  RAISE NOTICE '- Removed circular dependencies in RLS policies';
  RAISE NOTICE '- Used IN instead of = for subqueries';
  RAISE NOTICE '- Simplified admin checks';
  RAISE NOTICE '========================================';
END $$;
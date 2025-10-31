-- ============================================================================
-- Hanna's Connect - Simple Working Database Schema
-- ============================================================================
-- This is a simplified, tested schema that works without errors
-- Run this entire file in your Supabase SQL Editor
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  gender TEXT,
  age INTEGER,
  nationality TEXT,
  sexual_orientation TEXT,
  relationship_goal TEXT,
  country_of_residence TEXT,
  city TEXT,
  county TEXT,
  constituency TEXT,
  tribe TEXT,
  tribe_other TEXT,
  religion TEXT,
  religiousness TEXT,
  believe_in_marriage TEXT,
  height_ft INTEGER,
  height_in INTEGER,
  weight_kg DECIMAL(5,2),
  body_type TEXT,
  complexion TEXT,
  teeth_status TEXT,
  has_scars_birthmarks_tattoos BOOLEAN DEFAULT FALSE,
  scars_birthmarks_tattoos_details TEXT,
  hiv_status TEXT,
  blood_group TEXT,
  has_disabilities BOOLEAN DEFAULT FALSE,
  disabilities_details TEXT,
  has_allergies BOOLEAN DEFAULT FALSE,
  allergies_details TEXT,
  smoking TEXT,
  alcohol_consumption TEXT,
  pets_details TEXT,
  education_level TEXT,
  field_of_study TEXT,
  current_profession TEXT,
  work_county TEXT,
  work_constituency TEXT,
  employment_status TEXT,
  financial_stability TEXT,
  can_relocate TEXT,
  can_date_with_disability TEXT,
  marital_status TEXT,
  number_of_children INTEGER DEFAULT 0,
  children_ages TEXT,
  open_to_dating_with_children TEXT,
  want_kids TEXT,
  relationship_perspective TEXT,
  do_not_contact_if TEXT,
  things_i_dont_do TEXT,
  what_i_hope_to_find TEXT,
  what_to_expect_from_me TEXT,
  imperfections TEXT,
  avatar TEXT,
  profile_images TEXT[],
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  has_paid BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending',
  payment_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Connections Table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  notification_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);

CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - USERS
-- ============================================================================

-- Allow users to read their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Allow users to read active paid profiles
CREATE POLICY users_select_active ON users
  FOR SELECT
  USING (is_active = true AND payment_status = 'completed');

-- Allow users to insert their own profile
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Allow users to update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- ============================================================================
-- RLS POLICIES - CONNECTIONS
-- ============================================================================

-- Allow users to view their own connections
CREATE POLICY connections_select_own ON connections
  FOR SELECT
  USING (
    requester_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR recipient_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to create connections
CREATE POLICY connections_insert_own ON connections
  FOR INSERT
  WITH CHECK (
    requester_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to update their connections
CREATE POLICY connections_update_own ON connections
  FOR UPDATE
  USING (
    requester_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR recipient_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to delete their connection requests
CREATE POLICY connections_delete_own ON connections
  FOR DELETE
  USING (
    requester_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES - MESSAGES
-- ============================================================================

-- Allow users to view their messages
CREATE POLICY messages_select_own ON messages
  FOR SELECT
  USING (
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR receiver_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to send messages
CREATE POLICY messages_insert_own ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to update received messages
CREATE POLICY messages_update_own ON messages
  FOR UPDATE
  USING (
    receiver_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to delete sent messages
CREATE POLICY messages_delete_own ON messages
  FOR DELETE
  USING (
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================================================

-- Allow users to view their notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow system to create notifications
CREATE POLICY notifications_insert_all ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their notifications
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to delete their notifications
CREATE POLICY notifications_delete_own ON notifications
  FOR DELETE
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES - REPORTS
-- ============================================================================

-- Allow users to view their own reports
CREATE POLICY reports_select_own ON reports
  FOR SELECT
  USING (
    reporter_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to create reports
CREATE POLICY reports_insert_own ON reports
  FOR INSERT
  WITH CHECK (
    reporter_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Schema created successfully!';
  RAISE NOTICE 'Tables: users, connections, messages, notifications, reports';
  RAISE NOTICE 'RLS enabled on all tables';
END $$;

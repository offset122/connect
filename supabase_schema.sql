-- ============================================================================
-- Hanna's Connect - Complete Database Schema for Supabase
-- ============================================================================
-- This file contains the complete database schema including tables, RLS policies,
-- indexes, and triggers. Paste this entire file into the Supabase SQL Editor.
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ============================================================================
-- DROP EXISTING TABLES (if you want to start fresh - CAUTION: This will delete all data!)
-- ============================================================================
-- Uncomment the lines below if you want to recreate tables from scratch
-- DROP TABLE IF EXISTS public.reports CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.connections CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  
  -- Basic Information
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')),
  age INTEGER CHECK (age >= 18 AND age <= 100),
  nationality TEXT,
  
  -- Sexual & Relationship
  sexual_orientation TEXT CHECK (sexual_orientation IN ('Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual', 'Other')),
  relationship_goal TEXT CHECK (relationship_goal IN ('Marriage', 'Long-term relationship', 'Short-term relationship', 'Friendship', 'Casual dating', 'Not sure yet')),
  
  -- Location
  country_of_residence TEXT,
  city TEXT,
  county TEXT,
  constituency TEXT,
  
  -- Tribal & Religious
  tribe TEXT,
  tribe_other TEXT,
  religion TEXT CHECK (religion IN ('Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Traditional African religion', 'Atheist / Agnostic', 'Other', 'Prefer not to say')),
  religiousness TEXT CHECK (religiousness IN ('Very religious', 'Moderately religious', 'Slightly religious', 'Not religious')),
  believe_in_marriage TEXT CHECK (believe_in_marriage IN ('Yes', 'No')),
  
  -- Physical Appearance
  height_ft INTEGER CHECK (height_ft >= 3 AND height_ft <= 8),
  height_in INTEGER CHECK (height_in >= 0 AND height_in <= 11),
  weight_kg DECIMAL(5,2) CHECK (weight_kg >= 30 AND weight_kg <= 300),
  body_type TEXT CHECK (body_type IN ('Athletic', 'Slim', 'Average', 'Curvy', 'Plus-size', 'Muscular', 'Dad bod', 'Thick', 'Hourglass', 'Pear-shaped', 'Apple-shaped', 'Rectangle')),
  complexion TEXT CHECK (complexion IN ('Very fair', 'Fair', 'Medium', 'Olive', 'Brown', 'Dark brown', 'Very dark')),
  teeth_status TEXT CHECK (teeth_status IN ('Perfect', 'Good', 'Average', 'Needs work')),
  has_scars_birthmarks_tattoos BOOLEAN DEFAULT FALSE,
  scars_birthmarks_tattoos_details TEXT,
  
  -- Health
  hiv_status TEXT CHECK (hiv_status IN ('Negative', 'Positive (undetectable)', 'Positive (on treatment)', 'Prefer not to say')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),
  has_disabilities BOOLEAN DEFAULT FALSE,
  disabilities_details TEXT,
  has_allergies BOOLEAN DEFAULT FALSE,
  allergies_details TEXT,
  
  -- Lifestyle
  smoking TEXT CHECK (smoking IN ('Yes', 'No', 'Occasionally')),
  alcohol_consumption TEXT CHECK (alcohol_consumption IN ('Yes', 'No', 'Occasionally')),
  pets_details TEXT,
  
  -- Education & Work
  education_level TEXT CHECK (education_level IN ('Primary education', 'Secondary education', 'Diploma or certificate', 'Bachelor''s degree', 'Master''s degree', 'Doctorate (PhD)', 'Other')),
  field_of_study TEXT,
  current_profession TEXT,
  work_county TEXT,
  work_constituency TEXT,
  employment_status TEXT CHECK (employment_status IN ('Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired')),
  financial_stability TEXT CHECK (financial_stability IN ('Very stable', 'Stable', 'Getting by', 'Struggling')),
  
  -- Preferences
  can_relocate TEXT CHECK (can_relocate IN ('Yes', 'No', 'Maybe')),
  can_date_with_disability TEXT CHECK (can_date_with_disability IN ('Yes', 'No', 'Maybe')),
  
  -- Family
  marital_status TEXT CHECK (marital_status IN ('Single', 'Divorced', 'Widowed', 'Separated', 'In a relationship', 'It''s complicated')),
  number_of_children INTEGER DEFAULT 0 CHECK (number_of_children >= 0),
  children_ages TEXT,
  open_to_dating_with_children TEXT CHECK (open_to_dating_with_children IN ('Yes', 'No')),
  want_kids TEXT CHECK (want_kids IN ('Yes', 'No')),
  
  -- Relationship Perspective
  relationship_perspective TEXT CHECK (relationship_perspective IN ('Traditional (man leads)', 'Modern (woman leads)', 'Shared roles / equal partnership')),
  
  -- Personal Boundaries & Expectations
  do_not_contact_if TEXT,
  things_i_dont_do TEXT,
  what_i_hope_to_find TEXT,
  what_to_expect_from_me TEXT,
  imperfections TEXT,
  
  -- Images & Media
  avatar TEXT, -- URL to avatar image
  profile_images TEXT[], -- Array of image URLs
  
  -- Account Status
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  has_paid BOOLEAN DEFAULT FALSE,
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired')),
  payment_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Full-text search column (for optimized searching)
  search_vector tsvector
);

-- ============================================================================
-- CONNECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can't connect to themselves
  CHECK (requester_id != recipient_id),
  
  -- Ensure unique connection between two users (prevent duplicates)
  UNIQUE(requester_id, recipient_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can't message themselves
  CHECK (sender_id != receiver_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  notification_type TEXT CHECK (notification_type IN ('connection_request', 'connection_accepted', 'message', 'system', 'payment', 'profile_view')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  
  -- Ensure a user can't report themselves
  CHECK (reporter_id != reported_user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users(gender);
CREATE INDEX IF NOT EXISTS idx_users_age ON public.users(age);
CREATE INDEX IF NOT EXISTS idx_users_county ON public.users(county);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON public.users(payment_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_search_vector ON public.users USING gin(search_vector);

-- Connections table indexes
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON public.connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_created_at ON public.connections(created_at);
CREATE INDEX IF NOT EXISTS idx_connections_both_users ON public.connections(requester_id, recipient_id);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);

-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update user search vector
CREATE OR REPLACE FUNCTION users_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.county, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.current_profession, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_search_vector_trigger ON public.users;
CREATE TRIGGER users_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION users_search_vector_update();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = public.users.auth_id);

-- Users can view profiles of active, paid users
CREATE POLICY "Users can view active paid profiles"
  ON public.users FOR SELECT
  USING (public.users.is_active = true AND (public.users.has_paid = true OR public.users.payment_status = 'completed'));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS admin_user
      WHERE admin_user.auth_id = auth.uid() AND admin_user.is_admin = true
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = public.users.auth_id)
  WITH CHECK (auth.uid() = public.users.auth_id);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = public.users.auth_id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS admin_user
      WHERE admin_user.auth_id = auth.uid() AND admin_user.is_admin = true
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS admin_user
      WHERE admin_user.auth_id = auth.uid() AND admin_user.is_admin = true
    )
  );

-- ============================================================================
-- CONNECTIONS TABLE POLICIES
-- ============================================================================

-- Users can view connections they're part of
CREATE POLICY "Users can view own connections"
  ON public.connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.connections.requester_id AND public.users.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.connections.recipient_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can create connection requests
CREATE POLICY "Users can create connections"
  ON public.connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.connections.requester_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can update connections they're part of (accept/reject)
CREATE POLICY "Users can update own connections"
  ON public.connections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.connections.requester_id AND public.users.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.connections.recipient_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can delete connections they created
CREATE POLICY "Users can delete own connection requests"
  ON public.connections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.connections.requester_id AND public.users.auth_id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.messages.sender_id AND public.users.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.messages.receiver_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.messages.sender_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can update their received messages (mark as read)
CREATE POLICY "Users can update received messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.messages.receiver_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can delete messages they sent
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.messages.sender_id AND public.users.auth_id = auth.uid()
    )
  );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.notifications.user_id AND public.users.auth_id = auth.uid()
    )
  );

-- System can create notifications for users
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.notifications.user_id AND public.users.auth_id = auth.uid()
    )
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.notifications.user_id AND public.users.auth_id = auth.uid()
    )
  );

-- ============================================================================
-- REPORTS TABLE POLICIES
-- ============================================================================

-- Users can view reports they created
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.reports.reporter_id AND public.users.auth_id = auth.uid()
    )
  );

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS admin_user
      WHERE admin_user.auth_id = auth.uid() AND admin_user.is_admin = true
    )
  );

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = public.reports.reporter_id AND public.users.auth_id = auth.uid()
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users AS admin_user
      WHERE admin_user.auth_id = auth.uid() AND admin_user.is_admin = true
    )
  );

-- ============================================================================
-- FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Function to get potential matches for a user
CREATE OR REPLACE FUNCTION get_potential_matches(
  current_user_id UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  age INTEGER,
  gender TEXT,
  county TEXT,
  avatar TEXT,
  match_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.age,
    u.gender,
    u.county,
    u.avatar,
    50 as match_score -- Placeholder, implement actual matching algorithm
  FROM public.users u
  WHERE u.id != current_user_id
    AND u.is_active = true
    AND (u.has_paid = true OR u.payment_status = 'completed')
    AND u.id NOT IN (
      SELECT recipient_id FROM public.connections WHERE requester_id = current_user_id
      UNION
      SELECT requester_id FROM public.connections WHERE recipient_id = current_user_id
    )
  ORDER BY u.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.messages
    WHERE receiver_id = user_uuid AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = user_uuid AND read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================================================

-- Insert a sample admin user (update with your actual admin email)
-- INSERT INTO public.users (
--   auth_id, email, first_name, is_admin, is_active, has_paid, payment_status
-- ) VALUES (
--   NULL, -- Set this to the actual auth UUID after creating the user in Supabase Auth
--   'admin@hannasconnect.com',
--   'Admin',
--   true,
--   true,
--   true,
--   'completed'
-- ) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant necessary permissions to service role (for admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: users, connections, messages, notifications, reports';
  RAISE NOTICE 'RLS policies: Enabled on all tables';
  RAISE NOTICE 'Indexes: Created for optimal performance';
  RAISE NOTICE 'Triggers: Set up for auto-updating timestamps';
  RAISE NOTICE '========================================';
END $$;

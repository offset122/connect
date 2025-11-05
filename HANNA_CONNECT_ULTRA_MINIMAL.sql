-- ============================================================================
-- HANNA'S CONNECT - ULTRA MINIMAL DATABASE (GUARANTEED TO WORK)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  age INTEGER,
  gender TEXT,
  county TEXT,
  city TEXT,
  bio TEXT,
  current_profession TEXT,
  education_level TEXT,
  avatar TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  has_paid BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONNECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (requester_id != recipient_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON public.connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION activate_user_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_completed = true AND (OLD.payment_completed != true OR OLD.payment_completed IS NULL) THEN
    UPDATE public.users 
    SET 
      has_paid = true,
      payment_status = 'completed',
      is_active = true
    WHERE auth_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activate_user_on_payment_complete
  AFTER UPDATE ON public.user_payments
  FOR EACH ROW
  WHEN (NEW.payment_completed = true AND (OLD.payment_completed != true OR OLD.payment_completed IS NULL))
  EXECUTE FUNCTION activate_user_account();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = public.users.auth_id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = public.users.auth_id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = public.users.auth_id);

-- CONNECTIONS POLICIES
CREATE POLICY "Users can view connections" ON public.connections FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = requester_id AND auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = recipient_id AND auth_id = auth.uid()));
CREATE POLICY "Users can create connections" ON public.connections FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = requester_id AND auth_id = auth.uid()));
CREATE POLICY "Users can update connections" ON public.connections FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = requester_id AND auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = recipient_id AND auth_id = auth.uid()));

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = sender_id AND auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = receiver_id AND auth_id = auth.uid()));
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = sender_id AND auth_id = auth.uid()));

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view notifications" ON public.notifications FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND auth_id = auth.uid()));

-- PAYMENTS POLICIES
CREATE POLICY "Users can view payments" ON public.user_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payments" ON public.user_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMPLETION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ HANNA''S CONNECT ULTRA MINIMAL DATABASE READY!';
  RAISE NOTICE 'Tables: users, connections, messages, notifications, user_payments';
  RAISE NOTICE 'Security: RLS enabled';
  RAISE NOTICE 'Performance: Indexes created';
  RAISE NOTICE 'Ready for your dating app!';
END $$;
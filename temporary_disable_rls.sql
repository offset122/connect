-- ============================================================================
-- TEMPORARY IMMEDIATE FIX - Disable RLS to test
-- ============================================================================
-- Run this first to temporarily disable RLS and test if registration works

-- Disable RLS on users table temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Check if it works, then run the permanent fix below
SELECT 'RLS disabled temporarily. Test registration now.' as status;
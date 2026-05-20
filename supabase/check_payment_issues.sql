-- =============================================
-- Hanna's Connect - Database Check Script
-- Run this in Supabase SQL Editor to diagnose payment issues
-- =============================================

-- 1. Check the users table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check for any triggers on the users table
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- 3. Check for any policies (RLS) on the users table
SELECT polname, polpermissive, polroles, polcmd, polqual::text, polwithcheck::text
FROM pg_policy 
WHERE polrelid = 'users'::regclass;

-- 4. Check default values for has_paid and payment_status
SELECT 
    pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'd';

-- 5. Show recent users (last 20) with their payment status
SELECT 
    id,
    email,
    username,
    has_paid,
    payment_status,
    is_active,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- 6. Count users by payment status
SELECT 
    payment_status,
    has_paid,
    COUNT(*) as count
FROM users
GROUP BY payment_status, has_paid;

-- 7. Check for any functions that might auto-update has_paid
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE specific_schema = 'public';

-- 8. Check if there's a trigger function that auto-sets has_paid (PostgreSQL 16+ compatible)
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgrelid = 'users'::regclass AND NOT tgisinternal;

-- 9. Look for any recently created/updated users that might have incorrect payment status
SELECT 
    id,
    email,
    has_paid,
    payment_status,
    created_at,
    updated_at,
    CASE 
        WHEN has_paid = true AND payment_status = 'pending' THEN 'INCONSISTENT - paid but pending'
        WHEN has_paid = false AND payment_status = 'completed' THEN 'INCONSISTENT - not paid but completed'
        ELSE 'OK'
    END as status_check
FROM users
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

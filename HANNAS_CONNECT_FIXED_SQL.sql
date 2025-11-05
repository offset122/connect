-- ============================================================================
-- HANNA'S CONNECT DATING APP - COMPLETE DATABASE SCHEMA (FIXED)
-- ============================================================================
-- This file contains the complete database schema including all tables, RLS policies,
-- indexes, triggers, functions, and sample data for the Hanna's Connect dating app.
--
-- WHAT'S INCLUDED:
-- ✓ Complete users table with all dating app fields
-- ✓ Connections table for user connections
-- ✓ Messages table for chat functionality
-- ✓ Notifications system
-- ✓ Reports and moderation
-- ✓ User payments for M-Pesa integration
-- ✓ Admin system
-- ✓ Performance indexes
-- ✓ Row Level Security (RLS) policies
-- ✓ Triggers and functions
-- ✓ Sample data for testing
--
-- HOW TO USE:
-- 1. Paste this entire file into your Supabase SQL Editor
-- 2. Click "Run" to execute
-- 3. Your database will be ready for the app!
-- ============================================================================

-- Enable necessary extensions (basic ones that work everywhere)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES CREATION
-- ============================================================================

-- ============================================================================
-- USERS TABLE (Core user profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  -- Identity and Authentication
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,

  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 100),
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')),

  -- Location
  country_of_residence TEXT,
  county TEXT,
  city TEXT,
  constituency TEXT,

  -- Physical Appearance
  height_ft INTEGER CHECK (height_ft >= 3 AND height_ft <= 8),
  height_in INTEGER CHECK (height_in >= 0 AND height_in <= 11),
  weight_kg DECIMAL(5,2) CHECK (weight_kg >= 30 AND weight_kg <= 300),
  body_type TEXT CHECK (body_type IN ('Athletic', 'Slim', 'Average', 'Curvy', 'Plus-size', 'Muscular', 'Dad bod', 'Thick', 'Hourglass', 'Pear-shaped', 'Apple-shaped', 'Rectangle')),
  complexion TEXT CHECK (complexion IN ('Very fair', 'Fair', 'Medium', 'Olive', 'Brown', 'Dark brown', 'Very dark', 'Medium brown (warm cocoa or bronze tone)')),

  -- Personality & Lifestyle
  bio TEXT,
  interests TEXT[],
  occupation TEXT,
  current_profession TEXT,
  education_level TEXT CHECK (education_level IN ('Primary education', 'Secondary education', 'Diploma or certificate', 'Bachelor''s degree', 'Master''s degree', 'Doctorate (PhD)', 'Other')),
  field_of_study TEXT,
  religion TEXT CHECK (religion IN ('Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Traditional African religion', 'Atheist / Agnostic', 'Other', 'Prefer not to say')),
  religiousness TEXT CHECK (religiousness IN ('Very religious', 'Moderately religious', 'Slightly religious', 'Not religious')),

  -- Health Information
  hiv_status TEXT CHECK (hiv_status IN ('Negative', 'Positive (undetectable)', 'Positive (on treatment)', 'Prefer not to say')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')),

  -- Lifestyle
  smoking TEXT CHECK (smoking IN ('Yes', 'No', 'Occasionally')),
  alcohol_consumption TEXT CHECK (alcohol_consumption IN ('Yes', 'No', 'Occasionally')),
  employment_status TEXT CHECK (employment_status IN ('Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired')),
  financial_stability TEXT CHECK (financial_stability IN ('Very stable', 'Stable', 'Getting by', 'Struggling')),

  -- Relationship Preferences
  relationship_goal TEXT CHECK (relationship_goal IN ('Casual', 'Serious relationship leading to marriage', 'Marriage', 'Long-term relationship', 'Short-term relationship', 'Friendship', 'Not sure yet')),
  sexual_orientation TEXT CHECK (sexual_orientation IN ('Heterosexual', 'Homosexual', 'Bisexual', 'Pansexual', 'Asexual', 'Other')),
  relationship_perspective TEXT CHECK (relationship_perspective IN ('Man leads, woman follows', 'Woman leads, man follows', 'Shared roles / equal partnership', 'Traditional roles (each has defined responsibilities)', 'Independent but together (each maintains personal space and goals)', 'Still figuring it out')),
  marital_status TEXT CHECK (marital_status IN ('Single', 'Divorced', 'Widowed', 'Widower', 'Married', 'Separated', 'In a relationship', 'It''s complicated')),
  number_of_children INTEGER DEFAULT 0 CHECK (number_of_children >= 0),
  open_to_dating_with_children TEXT CHECK (open_to_dating_with_children IN ('Yes', 'No')),
  want_kids TEXT CHECK (want_kids IN ('Yes', 'No')),

  -- Personal Details
  do_not_contact_if TEXT,
  things_i_dont_do TEXT,
  what_i_hope_to_find TEXT,
  what_to_expect_from_me TEXT,
  imperfections TEXT,

  -- Media & Images
  avatar TEXT, -- Main profile picture
  profile_images TEXT[], -- Additional photos

  -- Account Status & Verification
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  phone_number TEXT,

  -- Payment & Subscription
  has_paid BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired')),
  payment_expires_at TIMESTAMP WITH TIME ZONE,

  -- Online Status
  online_status BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
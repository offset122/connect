-- Add photo columns to users table
-- Run this migration in Supabase SQL Editor

-- Add full_photo column (for full body photo)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_photo TEXT;

-- Add passport_photo column (for passport size photo)  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS passport_photo TEXT;

-- Add profile_images column (for additional photos)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_images TEXT[];

-- Enable RLS on the new columns
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for photo access
-- Users can view all photos
CREATE POLICY "Users can view all profile photos" 
ON users FOR SELECT 
USING (true);

-- Users can update their own photos
CREATE POLICY "Users can update own photos" 
ON users FOR UPDATE 
USING (auth.uid() = auth_id);

-- Note: You'll need to add separate policies for insert if needed
-- The existing policies may need to be updated to include the new columns

# Admin Account Setup Guide - FIXED

## Default Admin Credentials

### **Admin Login Details:**
- **Email**: `admin@hannasconnect.com`
- **Password**: `admin123456`
- **Access**: Via lock icon on welcome screen or `/admin/login` route

## CORRECTED Setup Steps

### **Step 1: Create Admin User in Supabase**
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User"
4. Enter these details:
   - **Email**: `admin@hannasconnect.com`
   - **Password**: `admin123456`
   - **Email Confirm**: Check the box to auto-confirm
5. Click "Create User"

### **Step 2: Get Admin User ID**
1. After creating the user, copy their **User ID** (UUID)
2. It looks like: `123e4567-e89b-12d3-a456-426614174000`

### **Step 3: Update Database**
Run this CORRECTED SQL in your Supabase SQL Editor (using `CORRECT_ADMIN_SETUP.sql`):

```sql
-- Replace 'your-admin-user-id' with the actual UUID from Step 2
INSERT INTO public.users (
  auth_id,
  email,
  first_name,
  last_name,
  age,
  gender,
  nationality,
  country_of_residence,
  county,
  education_level,
  current_profession,
  is_admin,
  is_active,
  has_paid,
  payment_status,
  profile_images
) VALUES (
  'your-admin-user-id',
  'admin@hannasconnect.com',
  'Admin',
  'User',
  30,
  'Other',
  'Kenyan',
  'Kenya',
  'Nairobi County',
  'Bachelor\'s degree',
  'System Administrator',
  true,
  true,
  true,
  'completed',
  ARRAY[]::TEXT[]
) ON CONFLICT (auth_id) DO UPDATE SET
  is_admin = true,
  is_active = true,
  has_paid = true,
  payment_status = 'completed';
```

### **Step 4: Verify Admin Setup**
Run this query to check if admin was created:
```sql
SELECT 
  email,
  first_name,
  is_admin,
  is_active,
  has_paid,
  payment_status,
  created_at
FROM public.users 
WHERE email = 'admin@hannasconnect.com';
```

## Quick Development Setup

For **immediate testing**, run this in Supabase SQL Editor (this makes ANY authenticated user an admin):

```sql
-- Development Admin Setup - REMOVE IN PRODUCTION!
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Development only: Any authenticated user is admin
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated, anon;
```

## How to Access Admin Panel

### **Method 1: Via Welcome Screen**
1. Open the app
2. Tap the lock icon (🔒) in the top-right corner
3. Login with: admin@hannasconnect.com / admin123456

### **Method 2: Direct URL**
1. Navigate to `/admin/login`
2. Login with the admin credentials

## Troubleshooting

### **Column Error Fixed**
- Use `age` instead of `date_of_birth`
- Use `current_profession` instead of `occupation`
- Use `country_of_residence` instead of `location`
- Uses your actual database schema from `supabase_simple_schema.sql`

### **Can't Login as Admin?**
1. Verify user exists in Supabase Auth with correct email/password
2. Run the corrected SQL script with the actual user ID
3. Check that `is_admin = true` in the database
4. Test the admin function: `SELECT is_current_user_admin();`

## Key Differences from Original

**✅ Corrected Fields:**
- `age` instead of `date_of_birth`
- `current_profession` instead of `occupation`
- `country_of_residence` instead of `location`
- `profile_images` as TEXT array
- Removed non-existent fields

**✅ Uses Your Schema:**
- Matches `supabase_simple_schema.sql` exactly
- Compatible with your actual database structure

This should resolve the column errors you encountered!
# Admin Account Setup Guide

## Default Admin Credentials

### **Admin Login Details:**
- **Email**: `admin@hannasconnect.com`
- **Password**: `admin123456`
- **Access**: Via lock icon on welcome screen or `/admin/login` route

## How to Set Up Admin Account

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
Run this SQL in your Supabase SQL Editor:

```sql
-- Replace 'your-admin-user-id' with the actual UUID from Step 2
INSERT INTO public.users (
  auth_id,
  email,
  first_name,
  last_name,
  is_admin,
  is_active,
  has_paid,
  payment_status,
  phone_number,
  date_of_birth,
  gender,
  relationship_type,
  has_children,
  height,
  education_level,
  occupation,
  location,
  bio,
  interests,
  profile_images
) VALUES (
  'd4a69352-cb3a-4009-b4f7-8f7e48fabf51',
  'admin@hannas.com',
  'Admin',
  'User',
  true,
  true,
  true,
  'completed',
  '+254700000000',
  '1990-01-01',
  'Other',
  'Serious relationship',
  false,
  '175 cm',
  'Master\'s degree',
  'System Administrator',
  'Nairobi County',
  'System Administrator for Hanna\'s Connect',
  ARRAY['Administration', 'Technology', 'User Management'],
  ARRAY[]
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
  created_at
FROM public.users 
WHERE email = 'admin@hannasconnect.com';
```

## How to Access Admin Panel

### **Method 1: Via Welcome Screen**
1. Open the app
2. Tap the lock icon (🔒) in the top-right corner of the welcome screen
3. Login with the admin credentials above

### **Method 2: Direct URL**
1. Navigate to `/admin/login` route
2. Login with admin credentials

### **Method 3: Manual Navigation**
1. Login with regular user account first
2. If that account has admin privileges, you'll be redirected to admin panel

## Admin Panel Features

Once logged in as admin, you can:
- **User Management**: View, edit, activate/deactivate users
- **Payment Management**: Check payment status, mark payments as completed
- **User Analytics**: View user statistics and reports
- **Report Handling**: Manage user reports and moderation

## Troubleshooting

### **Can't Login as Admin?**
1. Check that the user exists in Supabase Auth
2. Verify the user ID was inserted into the `users` table
3. Ensure `is_admin = true` in the database
4. Check that email and password match exactly

### **Admin Access Denied?**
1. Verify the `is_current_user_admin()` function exists
2. Run this to test: `SELECT is_current_user_admin();`
3. Make sure you're logged in with the correct admin account

## Security Notes

⚠️ **Important**: 
- Change the default admin password before going to production
- The current password `admin123456` is for development only
- Consider creating a more secure password for production use

## Quick Setup Script

For development, you can run this simplified version in Supabase SQL Editor:

```sql
-- Development Admin Setup
-- This makes ANY authenticated user an admin for testing

CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Development only: Any authenticated user is admin
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated, anon;
```

**Note**: Remove this development function in production and use the proper admin user setup above.
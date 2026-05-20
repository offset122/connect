# Password Reset Deep Link Fix

## Problem
When clicking the password reset link from email, the app opens but doesn't navigate to the reset password screen where users can enter their new password.

## Root Causes
1. **Missing Deep Link Configuration in AndroidManifest.xml**: The native Android manifest wasn't properly configured with the `hannasconnect://reset-password` deep link scheme.
2. **No Global Deep Link Handler**: The app didn't have a global handler to intercept deep links and navigate to the correct screen.
3. **Over-restrictive URL Checking**: The reset-password screen was checking if the URL contained "reset-password" before processing, which could fail if Supabase formats the URL differently.

## Fixes Applied

### 1. Regenerated Android Native Files
Ran `npx expo prebuild --platform android --clean` to regenerate the AndroidManifest.xml with the correct deep link configuration from app.json.

**Result**: AndroidManifest.xml now includes:
```xml
<intent-filter data-generated="true">
  <action android:name="android.intent.action.VIEW"/>
  <data android:scheme="hannasconnect" android:host="reset-password"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <category android:name="android.intent.category.DEFAULT"/>
</intent-filter>
```

### 2. Added Global Deep Link Handler
Updated `app/_layout.tsx` to add a global deep link handler that:
- Listens for deep links when the app launches or is already running
- Checks if the URL contains 'reset-password' or 'type=recovery' (Supabase recovery parameter)
- Navigates to the `/reset-password` screen

### 3. Simplified Reset Password Screen Logic
Updated `app/reset-password.tsx` to:
- Remove redundant URL path checking
- Focus on processing the Supabase recovery tokens (access_token, refresh_token, type)
- Set the session and enable reset mode when valid tokens are received

## How It Works Now

1. User requests password reset → Email sent with link like:
   ```
   hannasconnect://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
   ```

2. User clicks link → Android opens the app via deep link

3. Global handler in `_layout.tsx` detects the deep link and navigates to `/reset-password`

4. Reset password screen processes the tokens:
   - Extracts access_token, refresh_token, and type from URL hash
   - Verifies type === 'recovery'
   - Sets the Supabase session with the tokens
   - Enables reset mode to show password input fields

5. User enters new password → Password updated via `supabase.auth.updateUser()`

## Testing Steps

1. Build and install the app:
   ```bash
   npx expo run:android
   ```

2. Test the password reset flow:
   - Go to login screen
   - Click "Forgot Password"
   - Enter email and request reset link
   - Check email and click the reset link
   - App should open and show the "Set New Password" screen
   - Enter new password and confirm
   - Password should be updated successfully

## Additional Notes

- The deep link scheme `hannasconnect://reset-password` is configured in:
  - `app.json` (intentFilters)
  - `constants/config.ts` (DEEP_LINKS.RESET_PASSWORD)
  - `android/app/src/main/AndroidManifest.xml` (generated from app.json)

- Supabase sends recovery tokens in the URL hash fragment (#), not query parameters (?)

- The session must be set with the recovery tokens before the user can update their password

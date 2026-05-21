# Background Push Notifications Setup

This doc explains how to get true background push notifications working (like Facebook/WhatsApp) — where users get notified even when the app is fully closed.

## How it works

```
User A sends connection request
  → inserts row into `notifications` table
  → Supabase Database Webhook fires
  → Edge Function `send-push-notification` runs
  → Looks up User B's expo_push_token from `users` table
  → Calls Expo Push API
  → User B's phone shows a push notification (even if app is killed)
```

## Step 1 — Deploy the Edge Function

```bash
cd /home/stephen/Documents/ReactProjects/mobileapps/connect

# Login to Supabase CLI (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref dbvsexpcrojtnriqfbwa

# Deploy the function
npx supabase functions deploy send-push-notification --no-verify-jwt
```

## Step 2 — Set up the Database Webhook

Go to your Supabase Dashboard:
1. Open **Database → Webhooks** (or **Database → Database Webhooks**)
2. Click **Create a new hook**
3. Fill in:
   - **Name**: `push-on-notification-insert`
   - **Table**: `notifications`
   - **Events**: ✅ INSERT only
   - **Type**: HTTP Request
   - **URL**: `https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/send-push-notification`
   - **HTTP Headers**:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <your-service-role-key>`
       (find it in Dashboard → Settings → API → service_role key)
4. Save

## Step 3 — Make sure `expo_push_token` column exists

Run this in the Supabase SQL editor if the column doesn't exist yet:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
```

## Step 4 — Test it

1. Log in on a real device (not simulator — simulators don't get push tokens)
2. Have another user send you a connection request / message
3. Kill your app completely
4. You should receive a push notification within a few seconds

## Troubleshooting

- **No token saved**: Check that `notificationService.registerPushToken()` is being called after login. It's called in `NotificationInitializer.tsx` → `notificationService.init()`.
- **Token starts with `ExponentPushToken[`**: That's correct for Expo Go / development builds.
- **Edge function errors**: Check logs in Supabase Dashboard → Edge Functions → `send-push-notification` → Logs.
- **DeviceNotRegistered error**: The token is stale. The edge function automatically clears it from the DB.

## What was changed in the app

### Performance fixes
- `AuthContext.tsx`: Reduced user query timeout from 100s → 8s (login is much faster now)
- `app/(tabs)/(home)/index.tsx`:
  - All filtering (gender, age, location, HIV status, etc.) now happens **server-side** in Supabase, not client-side after fetching 50 users
  - Added **cursor-based pagination** — loads 20 users at a time, fetches more as you scroll
  - Profile query now only selects needed columns (not `SELECT *`)
  - Connections are cached in state — no re-fetch on filter change

### Push notifications
- `contexts/NotificationContext.tsx`: When a new notification is inserted, it now also calls the edge function so the recipient gets a push even when their app is closed
- `supabase/functions/send-push-notification/index.ts`: New edge function that handles the actual push delivery via Expo Push API

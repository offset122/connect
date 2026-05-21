/**
 * Supabase Edge Function: send-push-notification
 *
 * Called via a Supabase Database Webhook whenever a row is INSERTed into
 * the `notifications` table.  It looks up the recipient's expo_push_token
 * and fires a push via the Expo Push API so the user gets notified even
 * when the app is fully closed / killed.
 *
 * Deploy:
 *   supabase functions deploy send-push-notification --no-verify-jwt
 *
 * Database Webhook (Supabase Dashboard → Database → Webhooks):
 *   Table  : notifications
 *   Events : INSERT
 *   URL    : https://<project-ref>.supabase.co/functions/v1/send-push-notification
 *   Headers: { "Authorization": "Bearer <service-role-key>" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map notification type → Expo / Android channel id
function getChannelId(type: string): string {
  if (type === "message") return "messages";
  if (["connection", "connection_accepted", "connection_declined", "match"].includes(type))
    return "connections";
  if (
    [
      "phone_request",
      "phone_response",
      "photo_request",
      "photo_request_approved",
      "photo_request_declined",
    ].includes(type)
  )
    return "requests";
  if (type === "incoming_call") return "calls";
  return "default";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // The webhook payload from Supabase looks like:
    // { type: "INSERT", table: "notifications", record: { ... }, ... }
    const payload = await req.json();

    // Support both direct calls (with a `notification` key) and webhook calls
    const record = payload?.record ?? payload?.notification;

    if (!record) {
      return new Response(JSON.stringify({ error: "No notification record in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      user_id,
      title,
      body,
      description,
      type,
      related_user_id,
      id: notificationId,
    } = record;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Supabase admin client to look up the push token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the recipient's push token
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("expo_push_token, first_name")
      .eq("auth_id", user_id)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user:", userError);
      return new Response(JSON.stringify({ error: "Failed to fetch user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pushToken: string | null = userData?.expo_push_token ?? null;

    // No token → user hasn't granted permissions or hasn't logged in on a device yet
    if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) {
      console.log(`No valid push token for user ${user_id} — skipping push`);
      return new Response(JSON.stringify({ skipped: true, reason: "no_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifTitle = title ?? "New Notification";
    const notifBody = body ?? description ?? "";
    const channelId = getChannelId(type ?? "system");
    const priority = type === "message" || type === "incoming_call" ? "high" : "normal";

    // Send via Expo Push API
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        title: notifTitle,
        body: notifBody,
        sound: "default",
        priority,
        channelId,
        data: {
          type: type ?? "system",
          notificationId,
          related_user_id,
        },
      }),
    });

    const expoResult = await expoResponse.json();
    console.log("Expo push result:", JSON.stringify(expoResult));

    // If the token is invalid, clear it from the DB so we don't keep trying
    const ticketData = expoResult?.data;
    if (ticketData?.status === "error" && ticketData?.details?.error === "DeviceNotRegistered") {
      console.log(`Clearing stale push token for user ${user_id}`);
      await supabase
        .from("users")
        .update({ expo_push_token: null })
        .eq("auth_id", user_id);
    }

    return new Response(JSON.stringify({ success: true, expo: expoResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // Accept unauthenticated POST requests from Paystack
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  try {
    const body = await req.text();
    const event = JSON.parse(body);
    console.log("Received Paystack webhook:", event);
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;
      // Use 'success' for status if that's what your app expects
      const status = data.status === "success" ? "success" : "failed";
      // Update payment record
      const { error: updateError } = await supabase
        .from("user_payments")
        .update({
          status: "completed",
          payment_completed: true,
          updated_at: new Date().toISOString(),
          metadata: {
            webhook: data,
            paymentId: data.id,
            authorization: data.authorization,
            amount: data.amount,
            currency: data.currency,
            customer: {
              id: data.customer?.id,
              email: data.customer?.email
            }
          }
        })
        .eq("transaction_id", reference);
      if (updateError) {
        console.error("Failed to update payment record:", updateError);
      } else {
        console.log("Payment record updated for reference:", reference);
      }
      // If payment successful, activate user account
      if (status === "success") {
        try {
          const { data: payment, error: paymentFetchError } = await supabase
            .from("user_payments")
            .select("user_id")
            .eq("transaction_id", reference)
            .single();
          if (paymentFetchError) {
            console.error("Error fetching payment after update:", paymentFetchError);
          }
          if (payment?.user_id) {
            const { error: userUpdateError } = await supabase
              .from("users")
              .update({
                has_paid: true,
                payment_status: "completed",
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq("id", payment.user_id);
            if (userUpdateError) {
              console.error("Failed to update user after payment:", userUpdateError);
            } else {
              console.log("User account activated:", payment.user_id);
            }
          } else {
            console.error("No user_id found in payment record for reference:", reference);
          }
        } catch (activationError) {
          console.error("Error activating user account:", activationError);
        }
      }
    }
    return new Response("Webhook received", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Callback Error:", err);
    return new Response("Callback processing failed", { status: 500, headers: corsHeaders });
  }
});

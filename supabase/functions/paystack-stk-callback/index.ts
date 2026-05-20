/**
 * Paystack STK Callback Edge Function
 * Handles payment callback and verification from Paystack
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400"
};

// 🔹 Get Paystack Configuration
const getPaystackConfig = () => {
  const config = {
    secretKey: Deno.env.get("LIVE_SECRET_KEY") || "",
    publicKey: Deno.env.get("LIVE_PUBLIC_KEY") || "",
    environment: Deno.env.get("LIVE_ENV") || "live"
  };
  if (!config.secretKey || !config.publicKey) {
    throw new Error("Paystack configuration missing");
  }
  return config;
};

// 🔹 Verify Paystack Payment
const verifyPayment = async (config: any, reference: string) => {
  const url = `https://api.paystack.co/transaction/verify/${reference}`;

  console.log("Verifying Paystack Payment:", reference);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json"
    }
  });

  const text = await response.text();
  console.log("Paystack Verify Response:", text);

  if (!response.ok) {
    throw new Error(`Paystack verification failed: ${response.statusText} - ${text}`);
  }

  return JSON.parse(text);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const config = getPaystackConfig();

  // 🔸 Handle GET Request (Payment Verification)
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const reference = url.searchParams.get("reference");

      if (!reference) {
        return new Response(
          JSON.stringify({
            error: "Missing reference parameter"
          }),
          {
            headers: corsHeaders,
            status: 400
          }
        );
      }

      // Verify payment with Paystack
      const verifyResult = await verifyPayment(config, reference);
      
      const data = verifyResult.data;
      const status = data.status === "success" ? "completed" : "failed";

      console.log("✅ Payment verified:", reference, "Status:", status);

      return new Response(
        JSON.stringify({
          success: true,
          status,
          message: `Payment ${status}`,
          data
        }),
        {
          headers: corsHeaders
        }
      );
    } catch (err) {
      console.error("Verification Error:", err);
      return new Response(
        JSON.stringify({
          error: "Verification processing failed"
        }),
        {
          headers: corsHeaders,
          status: 500
        }
      );
    }
  }

  // 🔸 Handle POST Request (Webhook Callback from Paystack)
  if (req.method === "POST") {
    try {
      const body = await req.text();
      const event = JSON.parse(body);

      console.log("Received Paystack Webhook:", event.event);

      // Handle charge.success event
      if (event.event === "charge.success") {
        const data = event.data;
        const reference = data.reference;
        const status = data.status === "success" ? "completed" : "failed";

        console.log("Processing charge.success for reference:", reference);

        // Update payment record with payment_completed flag
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
        }

        // If payment successful, activate user account
        if (status === "completed") {
          try {
            // Find user by payment record
            const { data: payment, error: paymentLookupError } = await supabase
              .from("user_payments")
              .select("user_id")
              .eq("transaction_id", reference)
              .single();

            if (paymentLookupError) {
              console.error("Error looking up payment record for user update:", paymentLookupError, "reference:", reference);
            }

            if (payment?.user_id) {
              const { error: userUpdateError, data: userUpdateResult } = await supabase
                .from("users")
                .update({
                  has_paid: true,
                  payment_status: "completed",
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq("auth_id", payment.user_id);

              if (userUpdateError) {
                console.error("❌ Failed to update user after payment:", userUpdateError, "user_id:", payment.user_id, "reference:", reference);
              } else {
                console.log("✅ User account activated:", payment.user_id, "Update result:", userUpdateResult);
              }
            } else {
              console.error("❌ No user_id found in payment record for reference:", reference, "payment:", payment);
            }
          } catch (activationError) {
            console.error("Error activating user account:", activationError, "reference:", reference);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Charge ${status}`,
            reference
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      // Handle charge.failed event
      if (event.event === "charge.failed") {
        const data = event.data;
        const reference = data.reference;

        console.log("Processing charge.failed for reference:", reference);

        const { error: updateError } = await supabase
          .from("user_payments")
          .update({
            status: "failed",
            payment_completed: false,
            updated_at: new Date().toISOString(),
            metadata: {
              webhook: data,
              failureReason: data.gateway_response
            }
          })
          .eq("transaction_id", reference);

        if (updateError) {
          console.error("Failed to update payment record:", updateError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Charge failed recorded",
            reference
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      // Acknowledge other webhook events
      return new Response(
        JSON.stringify({
          success: true,
          message: "Webhook received"
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    } catch (err) {
      console.error("Callback Error:", err);
      return new Response(
        JSON.stringify({
          error: "Callback processing failed"
        }),
        {
          headers: corsHeaders,
          status: 500
        }
      );
    }
  }

  return new Response(
    JSON.stringify({
      error: "Method not allowed"
    }),
    {
      status: 405,
      headers: corsHeaders
    }
  );
});

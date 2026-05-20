/**
 * Paystack STK Push Edge Function
 * Initiates Paystack charge for STK-like payment flow
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
    environment: Deno.env.get("LIVE_ENV") || "live",
    callbackUrl: Deno.env.get("LIVE_CALLBACK_URL") || "https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/paystack-callback"
  };
  if (!config.secretKey || !config.publicKey) {
    throw new Error("Paystack configuration missing");
  }
  return config;
};

// 🔹 Initialize Paystack Charge
const initializeCharge = async (config: any, email: string, amount: number, reference: string, metadata: any = {}) => {
  const url = "https://api.paystack.co/transaction/initialize";
  
  const payload = {
    email,
    amount: Math.round(amount * 100), // Convert to kobo (cents)
    reference,
    callback_url: config.callbackUrl,
    metadata: {
      ...metadata,
      service: "Hanna's Connect Subscription"
    }
  };

  console.log("Paystack Initialize Payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log("Paystack Initialize Response:", text);

  if (!response.ok) {
    throw new Error(`Paystack initialization failed: ${response.statusText} - ${text}`);
  }

  return JSON.parse(text);
};

// 🔹 Serve Function (STK Push Initialization)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Handle STK Push initiation
  try {
    const requestData = await req.json();
    const { email, amount, userId, reference, metadata } = requestData;

    if (!email || !amount || !userId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: email, amount, userId"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const config = getPaystackConfig();
    const result = await initializeCharge(
      config,
      email,
      amount,
      reference || `HNC_${Date.now()}`,
      metadata
    );

    if (!result.status) {
      throw new Error(result.message || "Failed to initialize charge");
    }

    const { data: chargeData } = result;

    // Store payment record in database
    const { error: paymentError } = await supabase
      .from("user_payments")
      .insert({
        user_id: userId,
        amount,
        currency: "NGN",
        payment_method: "paystack",
        status: "pending",
        transaction_id: chargeData.reference,
        metadata: {
          email,
          authorization_url: chargeData.authorization_url,
          access_code: chargeData.access_code,
          charge_request: result,
          reference
        },
        created_at: new Date().toISOString()
      });

    if (paymentError) {
      console.error("Failed to store payment record:", paymentError);
    }

    console.log("✅ STK Push initialized successfully for:", email);

    return new Response(
      JSON.stringify({
        success: true,
        data: chargeData,
        message: "STK Push initiated successfully"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("STK Push initialization error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "PAYSTACK_ERROR",
          message: error instanceof Error ? error.message : "Failed to initiate STK Push"
        }
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

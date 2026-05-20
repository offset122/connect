/**
 * Paystack Charge Edge Function
 * Initiates Paystack charge (STK Push first, then Web Init fallback)
 * and handles payment callback/verification
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_INIT_URL = 'https://api.paystack.co/transaction/initialize';
const PAYSTACK_CHARGE_URL = 'https://api.paystack.co/charge';
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400"
};

// 🔹 Helper to normalize Kenyan phone numbers for STK Push
// Paystack expects format: +254XXXXXXXXX (with + prefix)
function normalizePhoneNumber(phoneNumber: string): string | null {
  // Remove any spaces, dashes, or parentheses
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Handle 07XXXXXXXX or 01XXXXXXXX format
  if (cleaned.match(/^0[17]\d{8}$/)) {
    return `+254${cleaned.substring(1)}`;
  }
  
  // Handle 254XXXXXXXXX format (add + prefix)
  if (cleaned.match(/^254[17]\d{8}$/)) {
    return `+${cleaned}`;
  }
  
  // Handle +254XXXXXXXXX format (already correct)
  if (cleaned.match(/^\+254[17]\d{8}$/)) {
    return cleaned;
  }
  
  // Handle 7XXXXXXXX or 1XXXXXXXX format (missing country code)
  if (cleaned.match(/^[17]\d{8}$/)) {
    return `+254${cleaned}`;
  }
  
  return null;
}

// 🔹 Get Paystack Configuration
const getPaystackConfig = () => {
  const config = {
    secretKey: Deno.env.get("LIVE_SECRET_KEY") || "",
    publicKey: Deno.env.get("LIVE_PUBLIC_KEY") || "",
    environment: Deno.env.get("LIVE_ENV") || "live",
    callbackUrl: Deno.env.get("LIVE_CALLBACK_URL") || "https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/paystack-callback"
  };
  if (!config.secretKey) {
    throw new Error("Paystack secret key missing");
  }
  return config;
};

// 🔹 Initialize Paystack Charge (Generic Web/Card Flow)
const initializeCharge = async (config: any, email: string, amountInSmallestUnit: number, reference: string, currency: string, phoneNumber: string | undefined, metadata: any) => {
  const payload = {
    email,
    amount: amountInSmallestUnit,
    reference,
    currency,
    callback_url: config.callbackUrl,
    phone: phoneNumber, // Added phone for context/mobile money on the checkout page
    channels: ['mobile_money', 'card', 'bank_transfer'],
    metadata: {
      ...metadata,
      service: "Hanna's Connect Subscription"
    }
  };
  
  console.log("Paystack Initialize Payload:", JSON.stringify(payload, null, 2));
  const response = await fetch(PAYSTACK_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`Paystack initialization failed: ${response.statusText} - ${text}`);
  }
  return JSON.parse(text);
};

// 🔹 Perform M-Pesa STK Push Attempt (Direct Charge Flow)
const attemptStkPush = async (config: any, email: string, amountInSmallestUnit: number, reference: string, normalizedPhoneNumber: string, metadata: any) => {
  const chargeBody = {
    email,
    amount: amountInSmallestUnit,
    reference,
    currency: 'KES', // Must be KES for M-Pesa
    mobile_money: {
      phone: normalizedPhoneNumber,
      provider: 'mpesa'
    },
    metadata: {
      ...metadata,
      service: "Hanna's Connect Subscription"
    }
  };

  console.log(`Attempting STK Push for ${normalizedPhoneNumber}. Payload:`, JSON.stringify(chargeBody, null, 2));
  
  const response = await fetch(PAYSTACK_CHARGE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(chargeBody)
  });

  const text = await response.text();
  console.log(`STK Push Response Status: ${response.status}, Body:`, text);
  
  let paystackData;
  try {
    paystackData = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse Paystack response: ${text}`);
  }

  if (response.ok && paystackData.status === true) {
    console.log(`STK Push initiated successfully. Reference: ${paystackData.data.reference}`);
    return paystackData;
  }
  
  const errorMessage = paystackData.message || `Paystack API error (${response.status}): ${text}`;
  console.error(`STK Push failed:`, errorMessage);
  throw new Error(errorMessage);
};

// 🔹 Verify Paystack Payment (Unchanged, but now only handles verification)
const verifyPayment = async (config: any, reference: string) => {
  // ... (Verification logic remains the same, using PAYSTACK_VERIFY_URL)
  const url = `${PAYSTACK_VERIFY_URL}${reference}`;
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

// 🔹 Serve Function (Handles both initialization and callback)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Use Service Role Key for database operations
  const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  // 🔸 Handle Callback / Verification (GET)
  // NOTE: This part is identical to your original code, handling verification based on URL params
  if (req.method === "GET" || req.url.includes("paystack-callback") || req.url.includes("verify")) {
    try {
      const url = new URL(req.url);
      const reference = url.searchParams.get("reference");
      // ... (Rest of verification logic remains the same)
      if (!reference) {
        return new Response(JSON.stringify({ error: "Reference parameter missing" }), { headers, status: 400 });
      }
      
      const config = getPaystackConfig();
      const verifyResult = await verifyPayment(config, reference);
      
      if (!verifyResult.status) {
        return new Response(JSON.stringify({ error: "Verification failed", data: verifyResult }), { headers, status: 400 });
      }
      
      const { data } = verifyResult;
      const status = data.status === "success" ? "completed" : "failed";
      
      // Update payment record in database
      const { error: updateError } = await supabase.from("user_payments").update({
        status,
        updated_at: new Date().toISOString(),
        metadata: {
          verification: data,
          paymentId: data.id,
          authorization: data.authorization
        }
      }).eq("transaction_id", reference);
      
      if (updateError) {
        console.error("Failed to update payment record:", updateError);
      }
      
      return new Response(JSON.stringify({
        success: true,
        status,
        message: `Payment ${status}`,
        data
      }), { headers });

    } catch (err) {
      console.error("Verification Error:", err);
      return new Response(JSON.stringify({ error: "Verification processing failed" }), { headers, status: 500 });
    }
  }

  // 🔸 Handle Charge Initialization (POST) - STK Push First
  if (req.method === "POST") {
    try {
      const requestData = await req.json();
      const { email, amount, userId, reference: initialReference, metadata, currency = 'NGN', phoneNumber } = requestData;
      
      if (!email || !amount || !userId) {
        return new Response(JSON.stringify({ error: "Missing required parameters: email, amount, userId" }), { status: 400, headers });
      }

      const config = getPaystackConfig();
      // Ensure unique reference: timestamp + random number
      const reference = initialReference || `HNC_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const amountInSmallestUnit = Math.round(Number(amount) * 100);
      let paystackResult;
      let attemptType = 'web_initialize';
      let stkPushError: string | null = null;
      
      const normalizedPhoneNumber = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;
      const isMpesaFlow = (currency === 'KES' && normalizedPhoneNumber);

      // 1. STK PUSH ATTEMPT
      if (isMpesaFlow) {
        try {
          paystackResult = await attemptStkPush(config, email, amountInSmallestUnit, reference, normalizedPhoneNumber!, metadata);
          attemptType = 'stk_push_success';
        } catch (error: any) {
          stkPushError = error.message;
          console.warn(`STK Push failed (Reason: ${stkPushError}). Falling back to Web Initialization.`);
          // DO NOT RETURN. Proceed to Web Initialization.
        }
      }

      // 2. FALLBACK TO WEB INITIALIZATION (or Default flow for non-KES)
      if (paystackResult === undefined) {
        paystackResult = await initializeCharge(config, email, amountInSmallestUnit, reference, currency, phoneNumber, metadata);
        attemptType = 'web_initialize';
      }
      
      if (!paystackResult.status) {
        throw new Error(paystackResult.message || "Failed to finalize initialization");
      }

      const { data: chargeData } = paystackResult;

      // Store payment record in database
      const { error: paymentError } = await supabase.from("user_payments").insert({
        user_id: userId,
        amount,
        currency: currency, // FIX: Use dynamic currency
        payment_method: "paystack",
        status: "pending",
        transaction_id: chargeData.reference,
        // Include STK Push error for clarity if fallback occurred
        metadata: {
          ...metadata,
          email,
          authorization_url: chargeData.authorization_url,
          access_code: chargeData.access_code,
          reference: initialReference,
          stk_push_error: stkPushError, // FIX: Propagate the STK failure message
        },
        created_at: new Date().toISOString()
      });
      
      if (paymentError) {
        console.error("Failed to store payment record:", paymentError);
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: chargeData,
        message: `Charge initiated successfully via ${attemptType}.`,
        // FIX: Propagate the STK Push error back to the frontend on fallback
        error: stkPushError ? { code: 'STK_PUSH_FAILED', message: stkPushError } : undefined 
      }), { headers });

    } catch (error) {
      console.error("Charge initialization error:", error);
      return new Response(JSON.stringify({
        success: false, // Ensure failure responses explicitly state success: false
        error: {
          code: "PAYSTACK_ERROR",
          message: error instanceof Error ? error.message : "Failed to initialize charge"
        }
      }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
});
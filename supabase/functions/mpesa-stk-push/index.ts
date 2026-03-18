/**
 * Mpesa STK Push + Callback Edge Function
 * Initiates STK Push payment using Mpesa Daraja API and handles payment callback
 */
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400"
};

// 🔹 Get M-Pesa Configuration
const getMpesaConfig = ()=>{
  const config = {
    consumerKey: Deno.env.get("MPESA_CUSTOMER_KEY") || "",
    consumerSecret: Deno.env.get("MPESA_CUSTOMER_SECRET") || "",
    passkey: Deno.env.get("MPESA_PASS_KEY") || "",
    shortcode: Deno.env.get("MPESA_SHORT_CODE") || "",
    environment: Deno.env.get("MPESA_ENV") || "sandbox",
    callbackUrl: Deno.env.get("MPESA_CALLBACK_URL") || "https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/mpesa-callback"
  };
  if (!config.consumerKey || !config.consumerSecret || !config.shortcode) {
    throw new Error("Mpesa configuration missing");
  }
  return config;
};

// 🔹 Generate Password (Base64 for Daraja)
const generatePassword = (shortcode, passkey, timestamp)=>{
  return btoa(`${shortcode}${passkey}${timestamp}`);
};

// 🔹 Get Access Token
const getAccessToken = async (config)=>{
  const url = config.environment === "sandbox" ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" : "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.statusText} - ${text}`);
  }
  const data = await response.json();
  console.log("Access token retrieved successfully ✅");
  return data.access_token;
};

// 🔹 Initiate STK Push
const stkPush = async (config, phoneNumber, amount, reference)=>{
  const accessToken = await getAccessToken(config);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const password = generatePassword(config.shortcode, config.passkey, timestamp);
  const url = config.environment === "sandbox" ? "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest" : "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: config.shortcode,
    PhoneNumber: phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: reference,
    TransactionDesc: "Hanna's Connect Subscription"
  };
  console.log("STK Push Payload:", JSON.stringify(payload, null, 2));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  console.log("M-Pesa STK Response:", text);
  if (!response.ok) {
    throw new Error(`STK Push failed: ${response.statusText} - ${text}`);
  }
  return JSON.parse(text);
};

// 🔹 Serve Function (Handles both STK and Callback)
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // 🔸 Handle Callback
  if (req.url.includes("mpesa-callback") || req.url.endsWith("mpesa-stkpush")) {
    try {
      const callbackBody = await req.json();
      console.log("Received M-Pesa Callback:", callbackBody);
      const body = callbackBody.Body?.stkCallback;
      if (!body) {
        return new Response(JSON.stringify({
          message: "Invalid callback payload"
        }), {
          headers: corsHeaders,
          status: 400
        });
      }
      const resultCode = body.ResultCode;
      const checkoutId = body.CheckoutRequestID;
      const resultDesc = body.ResultDesc;
      const amount = body.CallbackMetadata?.Item?.find((i)=>i.Name === "Amount")?.Value || 0;
      const phone = body.CallbackMetadata?.Item?.find((i)=>i.Name === "PhoneNumber")?.Value || null;
      const status = resultCode === 0 ? "success" : "failed";
      await supabase.from("user_payments").update({
        status,
        updated_at: new Date().toISOString(),
        metadata: {
          callback: body,
          phone,
          resultDesc
        }
      }).eq("transaction_id", checkoutId);
      return new Response(JSON.stringify({
        success: true,
        message: "Callback processed"
      }), {
        headers: corsHeaders
      });
    } catch (err) {
      console.error("Callback Error:", err);
      return new Response(JSON.stringify({
        error: "Callback processing failed"
      }), {
        headers: corsHeaders,
        status: 500
      });
    }
  }

  // 🔸 Handle STK Push initiation
  try {
    const requestData = await req.json();
    const { phoneNumber, amount, userId, reference } = requestData;
    if (!phoneNumber || !amount || !userId) {
      return new Response(JSON.stringify({
        error: "Missing required parameters: phoneNumber, amount, userId"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const config = getMpesaConfig();
    const result = await stkPush(config, phoneNumber, amount, reference || "HANNAS_CONNECT");
    const { error: paymentError } = await supabase.from("user_payments").insert({
      user_id: userId,
      amount,
      currency: "KSH",
      payment_method: "mpesa",
      status: "pending",
      transaction_id: result.CheckoutRequestID,
      metadata: {
        phone_number: phoneNumber,
        stk_push_request: result,
        reference
      },
      created_at: new Date().toISOString()
    });
    if (paymentError) console.error("Failed to store payment record:", paymentError);
    return new Response(JSON.stringify({
      success: true,
      data: result,
      message: "STK Push initiated successfully"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("STK Push error:", error);
    return new Response(JSON.stringify({
      error: {
        code: "MPESA_ERROR",
        message: error instanceof Error ? error.message : "Failed to initiate STK Push"
      }
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
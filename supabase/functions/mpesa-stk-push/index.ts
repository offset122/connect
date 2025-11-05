/**
 * Mpesa STK Push Edge Function
 * Initiates STK Push payment using Mpesa Daraja API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
}

interface MpesaConfig {
  consumerKey: string
  consumerSecret: string
  passkey: string
  shortcode: string
  environment: 'sandbox' | 'production'
  callbackUrl: string
}

const getMpesaConfig = (): MpesaConfig => {
  const config = {
    consumerKey: Deno.env.get('CUSTOMER-KEY') || '',
    consumerSecret: Deno.env.get('CUSTOMER-SECRET') || '',
    passkey: Deno.env.get('MPESA_PASSKEY') || '',
    shortcode: Deno.env.get('SHORT-CODE') || '',
    environment: (Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox') as 'sandbox' | 'production',
    callbackUrl: Deno.env.get('MPESA_CALLBACK_URL') || 'https://your-project.supabase.co/functions/v1/mpesa-callback'
  }
  
  if (!config.consumerKey || !config.consumerSecret || !config.shortcode) {
    throw new Error('Mpesa configuration missing')
  }
  
  return config
}

const generatePassword = async (shortcode: string, passkey: string, timestamp: string): Promise<string> => {
  const data = shortcode + passkey + timestamp
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const digest = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const getAccessToken = async (config: MpesaConfig): Promise<string> => {
  const url = config.environment === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

  const auth = btoa(`${config.consumerKey}:${config.consumerSecret}`)
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

const stkPush = async (config: MpesaConfig, phoneNumber: string, amount: number, reference: string): Promise<any> => {
  const accessToken = await getAccessToken(config)
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const password = await generatePassword(config.shortcode, config.passkey, timestamp)
  
  const url = config.environment === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: config.shortcode,
    PhoneNumber: phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: reference,
    TransactionDesc: "Hanna's Connect Dating App Subscription"
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`STK Push failed: ${response.statusText}`)
  }

  return await response.json()
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json()
    const { phoneNumber, amount, userId, reference } = requestData

    if (!phoneNumber || !amount || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: phoneNumber, amount, userId' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get Mpesa configuration
    const config = getMpesaConfig()

    // Initiate STK Push
    const result = await stkPush(config, phoneNumber, amount, reference || 'HANNAS_CONNECT')

    // Store transaction record in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Store payment record
    const { error: paymentError } = await supabase
      .from('user_payments')
      .insert({
        user_id: userId,
        amount: amount,
        currency: 'KSH',
        payment_method: 'mpesa',
        status: 'pending',
        transaction_id: result.CheckoutRequestID,
        metadata: {
          phone_number: phoneNumber,
          stk_push_request: result,
          reference: reference
        },
        created_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('Failed to store payment record:', paymentError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: result,
        message: 'STK Push initiated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('STK Push error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: {
          code: 'MPESA_ERROR',
          message: error instanceof Error ? error.message : 'Failed to initiate STK Push'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
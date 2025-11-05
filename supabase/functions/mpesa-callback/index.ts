/**
 * Mpesa Callback Handler Edge Function
 * Processes Mpesa STK Push callback notifications
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse callback data
    const callbackData = await req.json()
    
    console.log('Mpesa Callback received:', JSON.stringify(callbackData))

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract callback data
    const { Body } = callbackData
    const { stkCallback } = Body

    if (!stkCallback) {
      throw new Error('Invalid callback format')
    }

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback

    // Find the corresponding payment record
    const { data: paymentRecord, error: findError } = await supabase
      .from('user_payments')
      .select('*')
      .eq('transaction_id', CheckoutRequestID)
      .single()

    if (findError || !paymentRecord) {
      console.error('Payment record not found for CheckoutRequestID:', CheckoutRequestID)
      return new Response('Payment record not found', { status: 404 })
    }

    // Update payment status based on ResultCode
    let status = 'failed'
    let updateData: any = {
      status: 'failed',
      updated_at: new Date().toISOString()
    }

    if (ResultCode === 0) {
      // Payment successful
      status = 'completed'
      
      // Extract callback metadata
      const metadata = CallbackMetadata?.Item || []
      const callbackData: any = {}
      
      metadata.forEach((item: any) => {
        callbackData[item.Name] = item.Value
      })

      updateData = {
        status: 'completed',
        payment_completed: true,
        callback_response: callbackData,
        mpesa_receipt: callbackData.MpesaReceiptNumber,
        transaction_date: callbackData.TransactionDate,
        updated_at: new Date().toISOString()
      }

      // If payment was successful, also update user account status
      if (paymentRecord.user_id) {
        // Calculate account expiry (1 month from now)
        const expiryDate = new Date()
        expiryDate.setMonth(expiryDate.getMonth() + 1)
        
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            has_paid: true,
            payment_status: 'completed',
            account_expiry: expiryDate.toISOString(),
            payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRecord.user_id)

        if (userUpdateError) {
          console.error('Failed to update user payment status:', userUpdateError)
        }
      }
    } else {
      // Payment failed
      status = 'failed'
      updateData.result_description = ResultDesc
      updateData.result_code = ResultCode
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('user_payments')
      .update(updateData)
      .eq('id', paymentRecord.id)

    if (updateError) {
      console.error('Failed to update payment record:', updateError)
      throw new Error('Failed to update payment record')
    }

    console.log(`Payment ${status} for CheckoutRequestID: ${CheckoutRequestID}`)

    // Return success response to Mpesa
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Success'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Callback processing error:', error)
    
    // Return error response to Mpesa
    return new Response(
      JSON.stringify({
        ResultCode: 1,
        ResultDesc: 'Error processing callback'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
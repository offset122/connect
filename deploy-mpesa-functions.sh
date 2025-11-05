#!/bin/bash
# M-Pesa Edge Functions Deployment Script
# Hanna's Connect Dating App

echo "🚀 Deploying M-Pesa Edge Functions for Hanna's Connect..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Login to Supabase (if not already logged in)
echo "🔐 Checking Supabase login status..."
supabase projects list

# Deploy STK Push function
echo "📤 Deploying STK Push function..."
supabase functions deploy mpesa-stk-push

if [ $? -eq 0 ]; then
    echo "✅ STK Push function deployed successfully"
else
    echo "❌ Failed to deploy STK Push function"
    exit 1
fi

# Deploy callback function
echo "📤 Deploying M-Pesa callback function..."
supabase functions deploy mpesa-callback

if [ $? -eq 0 ]; then
    echo "✅ M-Pesa callback function deployed successfully"
else
    echo "❌ Failed to deploy callback function"
    exit 1
fi

echo ""
echo "🎉 M-Pesa Edge Functions Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify edge functions in Supabase dashboard"
echo "2. Test STK Push with sandbox credentials"
echo "3. Replace old payment screen with new one"
echo "4. Test payment flow end-to-end"
echo ""
echo "🔍 View function logs:"
echo "supabase functions logs mpesa-stk-push"
echo "supabase functions logs mpesa-callback"
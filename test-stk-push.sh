#!/bin/bash

# M-Pesa STK Push Test Script using curl
# Run this script to test the STK push functionality

SUPABASE_URL="https://dbvsexpcrojtnriqfbwa.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidnNleHBjcm9qdG5yaXFmYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQyMzYsImV4cCI6MjA3NzAxMDIzNn0.e3bGdg7pvM0r6eF82oTlhJYRuuQcYnvYva_232gj2y4"

echo "🚀 Starting M-Pesa STK Push Test..."
echo "=================================="
echo

# Test phone number (replace with real number for actual test)
PHONE_NUMBER="254729058802"
AMOUNT=1
USER_ID="test-user-$(date +%s)"
REFERENCE="TEST_$(date +%s)"

echo "📱 Test Configuration:"
echo "Phone: $PHONE_NUMBER"
echo "Amount: KSH $AMOUNT"
echo "User ID: $USER_ID"
echo "Reference: $REFERENCE"
echo

echo "🔍 Testing Edge Function Availability..."
echo "📡 Testing OPTIONS request to check CORS..."
echo

curl -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  "${SUPABASE_URL}/functions/v1/mpesa-stk-push" \
  -v

echo
echo
echo "📱 Testing STK Push Request..."
echo "=================================="

# Create JSON payload
PAYLOAD=$(cat <<EOF
{
  "phoneNumber": "$PHONE_NUMBER",
  "amount": $AMOUNT,
  "userId": "$USER_ID",
  "reference": "$REFERENCE"
}
EOF
)

echo "📦 Request Payload:"
echo "$PAYLOAD"
echo

echo "📤 Sending POST request to STK Push function..."
echo

# Make the actual STK push request
RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "$PAYLOAD" \
  -w "\nHTTP_STATUS:%{http_code}\n" \
  -s \
  "${SUPABASE_URL}/functions/v1/mpesa-stk-push")

echo "📥 Response:"
echo "$RESPONSE"
echo

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

echo "📊 Test Results:"
echo "=================================="
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ STK Push Request Successful!"
    echo "🔔 User should receive M-Pesa popup on their phone"
    echo
    echo "📋 Next Steps:"
    echo "1. Check the phone number for M-Pesa popup"
    echo "2. Complete the payment on the phone"
    echo "3. Monitor the database for payment updates"
else
    echo "❌ STK Push Request Failed!"
    echo
    echo "🔧 Possible Issues:"
    echo "- M-Pesa secrets not properly set in Supabase"
    echo "- Invalid phone number format"
    echo "- Network/API connectivity issues"
    echo "- Edge functions not deployed"
fi

echo
echo "=================================="
echo "🏁 Test Completed"
echo "=================================="
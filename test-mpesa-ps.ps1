# M-Pesa STK Push Test Script for PowerShell
# Run this script to test the STK push functionality

$SUPABASE_URL = "https://dbvsexpcrojtnriqfbwa.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidnNleHBjcm9qdG5yaXFmYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQyMzYsImV4cCI6MjA3NzAxMDIzNn0.e3bGdg7pvM0r6eF82oTlhJYRuuQcYnvYva_232gj2y4"

Write-Host "🚀 Starting M-Pesa STK Push Test..." -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""

# Test configuration
$PHONE_NUMBER = "254729058802"  # Replace with real number for actual test
$AMOUNT = 1
$USER_ID = "test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"
$REFERENCE = "TEST_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "📱 Test Configuration:" -ForegroundColor Cyan
Write-Host "Phone: $PHONE_NUMBER" -ForegroundColor White
Write-Host "Amount: KSH $AMOUNT" -ForegroundColor White
Write-Host "User ID: $USER_ID" -ForegroundColor White
Write-Host "Reference: $REFERENCE" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Testing Edge Function Availability..." -ForegroundColor Yellow
Write-Host "📡 Testing OPTIONS request to check CORS..." -ForegroundColor Yellow
Write-Host ""

# Test OPTIONS request
try {
    $optionsResponse = Invoke-WebRequest -Method Options -Uri "$SUPABASE_URL/functions/v1/mpesa-stk-push" -Headers @{
        "Origin" = "https://example.com"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "content-type"
    } -ErrorAction Stop

    Write-Host "✅ OPTIONS request successful (Status: $($optionsResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ OPTIONS request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   This might indicate the function is not deployed or accessible" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📱 Testing STK Push Request..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""

# Create JSON payload
$payload = @{
    phoneNumber = $PHONE_NUMBER
    amount = $AMOUNT
    userId = $USER_ID
    reference = $REFERENCE
} | ConvertTo-Json

Write-Host "📦 Request Payload:" -ForegroundColor Cyan
Write-Host $payload -ForegroundColor White
Write-Host ""

Write-Host "📤 Sending POST request to STK Push function..." -ForegroundColor Yellow
Write-Host ""

# Make the actual STK push request
try {
    $headers = @{
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
        "apikey" = $SUPABASE_ANON_KEY
    }

    $response = Invoke-WebRequest -Method Post -Uri "$SUPABASE_URL/functions/v1/mpesa-stk-push" -Headers $headers -Body $payload -ErrorAction Stop

    Write-Host "📥 Response:" -ForegroundColor Cyan
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""
    
    $responseData = $response.Content | ConvertFrom-Json

    Write-Host "📊 Test Results:" -ForegroundColor Yellow
    Write-Host "==================================" -ForegroundColor Yellow
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor White

    if ($response.StatusCode -eq 200) {
        Write-Host "✅ STK Push Request Successful!" -ForegroundColor Green
        Write-Host "🔔 User should receive M-Pesa popup on their phone" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Check the phone number ($PHONE_NUMBER) for M-Pesa popup" -ForegroundColor White
        Write-Host "2. Complete the payment on the phone" -ForegroundColor White
        Write-Host "3. Monitor the database for payment updates" -ForegroundColor White
        Write-Host ""
        if ($responseData.data) {
            Write-Host "📱 CheckoutRequestID: $($responseData.data.CheckoutRequestID)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ STK Push Request Failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔧 Possible Issues:" -ForegroundColor Yellow
        Write-Host "- M-Pesa secrets not properly set in Supabase Dashboard" -ForegroundColor White
        Write-Host "- Invalid phone number format" -ForegroundColor White
        Write-Host "- Network/API connectivity issues" -ForegroundColor White
        Write-Host "- Edge functions not deployed" -ForegroundColor White
    }
} catch {
    Write-Host "❌ STK Push Request Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "🔧 Network/Connectivity Issues:" -ForegroundColor Yellow
    Write-Host "- Check internet connection" -ForegroundColor White
    Write-Host "- Verify Supabase URL is correct" -ForegroundColor White
    Write-Host "- Ensure edge functions are deployed" -ForegroundColor White
    
    # Try to get response body for more details
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        Write-Host "- HTTP Status Code: $statusCode" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Yellow
Write-Host "🏁 Test Completed" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Yellow

# Additional helpful information
Write-Host ""
Write-Host "💡 To use this script:" -ForegroundColor Cyan
Write-Host "1. Run: PowerShell -ExecutionPolicy Bypass -File test-mpesa-ps.ps1" -ForegroundColor White
Write-Host "2. Replace the phone number with a real M-Pesa number" -ForegroundColor White
Write-Host "3. Check your phone for the M-Pesa popup" -ForegroundColor White
Write-Host "4. Complete the payment and check database updates" -ForegroundColor White
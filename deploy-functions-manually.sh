#!/bin/bash
# Manual Supabase Functions Deployment Script
# Using Management API instead of CLI

# Configuration
ACCESS_TOKEN="sbp_a7b9338cae01735aa4e714a00abaca4ef1cf1b13"
PROJECT_ID="your-project-id"  # You need to get this from your Supabase dashboard

echo "🚀 Deploying M-Pesa Functions manually via API..."

# Check if PROJECT_ID is set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo "❌ Please set your actual PROJECT_ID first"
    echo "🔍 To find your project ID:"
    echo "   1. Go to https://supabase.com/dashboard/projects"
    echo "   2. Select your project"
    echo "   3. Copy the project ID from the URL or project settings"
    echo "   4. Update this script with your actual project ID"
    exit 1
fi

# Function to deploy an edge function
deploy_function() {
    local function_name=$1
    echo "📤 Deploying function: $function_name"
    
    # Read the function file
    local function_file="supabase/functions/$function_name/index.ts"
    
    if [ ! -f "$function_file" ]; then
        echo "❌ Function file not found: $function_file"
        return 1
    fi
    
    # Deploy via API
    local response=$(curl -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$function_name\",
            \"verify_jwt\": false
        }" \
        "https://api.supabase.com/v1/projects/$PROJECT_ID/functions")
    
    echo "✅ Function $function_name deployment response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

# Deploy STK Push function
deploy_function "mpesa-stk-push"

# Deploy callback function  
deploy_function "mpesa-callback"

echo ""
echo "🎉 Manual deployment attempt complete!"
echo "📋 Next steps:"
echo "1. Verify functions in Supabase dashboard"
echo "2. Check function logs for any errors"
echo "3. Test STK Push functionality"
// M-Pesa STK Push Test Script - Updated with your Supabase configuration
// This script tests the STK push functionality

const SUPABASE_URL = "https://dbvsexpcrojtnriqfbwa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidnNleHBjcm9qdG5yaXFmYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQyMzYsImV4cCI6MjA3NzAxMDIzNn0.e3bGdg7pvM0r6eF82oTlhJYRuuQcYnvYva_232gj2y4";
// You'll need to replace this with your actual service role key for full testing
const SUPABASE_SERVICE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE";

const testSTKPush = async (useServiceKey = false) => {
    try {
        console.log('🚀 Starting M-Pesa STK Push Test...\n');

        // Test data - Use a real M-Pesa phone number for testing
        const testData = {
            phoneNumber: "254729058802", // Replace with test phone number
            amount: 1, // Small amount for testing
            userId: "test-user-" + Date.now(),
            reference: "TEST_" + Date.now()
        };

        console.log('📱 Test Data:');
        console.log('Phone Number:', testData.phoneNumber);
        console.log('Amount:', testData.amount);
        console.log('User ID:', testData.userId);
        console.log('Reference:', testData.reference);
        console.log('\n');

        const authKey = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
        const authHeader = `Bearer ${authKey}`;

        console.log('🔑 Using authentication...');
        console.log('🔑 Auth Header:', authHeader.substring(0, 20) + '...');
        console.log('\n');

        // Make request to STK push function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-stk-push`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'apikey': authKey
            },
            body: JSON.stringify(testData)
        });

        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Status Text:', response.statusText);
        console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('\n');

        const responseData = await response.json();
        console.log('📦 Response Data:');
        console.log(JSON.stringify(responseData, null, 2));

        if (response.ok && responseData.success) {
            console.log('\n✅ STK Push initiated successfully!');
            console.log('🔔 User should receive M-Pesa popup on their phone');
            console.log('📱 CheckoutRequestID:', responseData.data?.CheckoutRequestID);
            console.log('💰 Amount:', responseData.data?.ResponseParameters?.[0]?.Value || 'N/A');
            console.log('\n📋 Next Steps:');
            console.log('1. Check the phone number for M-Pesa popup');
            console.log('2. Complete the payment on the phone');
            console.log('3. The callback will update the payment status automatically');
            console.log('4. Check the database for updated payment records');
            
            return {
                success: true,
                checkoutRequestId: responseData.data?.CheckoutRequestID,
                response: responseData
            };
        } else {
            console.log('\n❌ STK Push failed!');
            console.log('Error:', responseData.error || responseData);
            console.log('\n🔧 Possible Issues:');
            console.log('- M-Pesa secrets not properly set in Supabase');
            console.log('- Invalid phone number format');
            console.log('- Network/API connectivity issues');
            console.log('- Authentication issues');
            
            return {
                success: false,
                error: responseData.error || responseData,
                response: responseData
            };
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.log('\n🔧 Network/Connectivity Issues:');
        console.log('- Check internet connection');
        console.log('- Verify Supabase URL is correct');
        console.log('- Ensure edge functions are deployed');
        
        return {
            success: false,
            error: error.message
        };
    }
};

const testCallbackEndpoint = async () => {
    try {
        console.log('\n🔔 Testing Callback Endpoint...\n');

        // Mock callback data
        const mockCallback = {
            Body: {
                stkCallback: {
                    CheckoutRequestID: "ws_CO_DMZ_" + Date.now() + "_123456789012345678",
                    ResultCode: 0,
                    ResultDesc: "The service request is processed successfully.",
                    CallbackMetadata: {
                        Item: [
                            {
                                Name: "Amount",
                                Value: 1
                            },
                            {
                                Name: "MpesaReceiptNumber",
                                Value: "MG" + Math.random().toString().slice(2, 12)
                            },
                            {
                                Name: "TransactionDate",
                                Value: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
                            },
                            {
                                Name: "PhoneNumber",
                                Value: "254729058802"
                            }
                        ]
                    }
                }
            }
        };

        const response = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-callback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify(mockCallback)
        });

        console.log('📊 Callback Response Status:', response.status);
        const callbackResponse = await response.json();
        console.log('📦 Callback Response:');
        console.log(JSON.stringify(callbackResponse, null, 2));

        return callbackResponse;

    } catch (error) {
        console.error('❌ Callback test failed:', error);
        return { success: false, error: error.message };
    }
};

// Test edge function availability
const testEdgeFunctionAvailability = async () => {
    try {
        console.log('🔍 Testing Edge Function Availability...\n');

        // Test if the function endpoint is accessible
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-stk-push`, {
            method: 'OPTIONS'
        });

        console.log('📊 Function Availability Response Status:', response.status);
        
        if (response.ok) {
            console.log('✅ Edge function is deployed and accessible');
            
            // Test with empty data to see error handling
            const errorResponse = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-stk-push`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({}) // Empty body to test validation
            });

            console.log('📊 Validation Test Status:', errorResponse.status);
            const validationData = await errorResponse.json();
            console.log('📦 Validation Response:');
            console.log(JSON.stringify(validationData, null, 2));
            
            return true;
        } else {
            console.log('❌ Edge function not accessible');
            console.log('Status:', response.status, response.statusText);
            return false;
        }

    } catch (error) {
        console.error('❌ Edge function availability test failed:', error);
        return false;
    }
};

// Run comprehensive tests
const runTests = async () => {
    console.log('=======================================');
    console.log('🧪 M-Pesa STK Push Test Suite');
    console.log('=======================================');
    console.log('📡 Supabase URL:', SUPABASE_URL);
    console.log('🔑 Auth Method: Anonymous Key (test)');
    console.log('=======================================\n');

    // Test 1: Edge Function Availability
    const isFunctionAvailable = await testEdgeFunctionAvailability();
    
    if (isFunctionAvailable) {
        // Test 2: STK Push with anon key (limited functionality)
        console.log('\n📱 Testing STK Push with Anonymous Key...\n');
        const stkResult = await testSTKPush(false);
        
        // Test 3: Test Callback Endpoint (requires service key)
        console.log('\n⏳ Testing Callback Endpoint (requires Service Key)...\n');
        if (SUPABASE_SERVICE_KEY !== "YOUR_SERVICE_ROLE_KEY_HERE") {
            await testCallbackEndpoint();
        } else {
            console.log('⚠️  Service key not provided, skipping callback test');
            console.log('💡 To test callback, update SUPABASE_SERVICE_KEY in this script');
        }

        // Final summary
        console.log('\n=======================================');
        console.log('🏁 Test Results Summary');
        console.log('=======================================');
        console.log('📊 Edge Function: Available ✅');
        console.log('📊 STK Push Test:', stkResult.success ? 'Passed ✅' : 'Failed ❌');
        console.log('📊 Callback Test: Skipped (requires service key)');
        console.log('=======================================');
        
        if (!stkResult.success) {
            console.log('\n🔧 Next Steps to Fix Issues:');
            console.log('1. Verify M-Pesa secrets are set in Supabase Dashboard');
            console.log('2. Check that the phone number format is correct (+254)');
            console.log('3. Ensure you have proper network connectivity');
            console.log('4. Test with Service Role Key for full functionality');
        }
    } else {
        console.log('\n❌ Edge functions are not deployed or accessible');
        console.log('🔧 Deploy functions with: supabase functions deploy');
    }
};

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        testSTKPush, 
        testCallbackEndpoint, 
        testEdgeFunctionAvailability,
        runTests 
    };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
    runTests();
}
# M-Pesa Integration Setup Checklist
## Hanna's Connect Dating App

### ✅ **Already Configured**
- [x] CUSTOMER-KEY: `j60yVt4ehzGMGDyJHjSDeAmeyqXGpU46`
- [x] CUSTOMER-SECRET: `5tJnGNBjZ0fKppnL`
- [x] SHORT-CODE: `5594010`
- [x] Email confirmation system working

### 🚨 **Still Needed - Add These to Supabase Secrets**

Please add these additional secrets to your Supabase project:

```
Key: MPESA_PASSKEY
Value: [Your M-Pesa Passkey from Safaricom]

Key: MPESA_CALLBACK_URL  
Value: https://your-project.supabase.co/functions/v1/mpesa-callback

Key: MPESA_ENVIRONMENT
Value: sandbox
```

### 📋 **How to Get MPESA_PASSKEY**

1. **Contact Safaricom Business Support**:
   - Log into your M-Pesa business account
   - Or contact your Safaricom account manager
   - Request your "M-Pesa Passkey" for STK Push

2. **Alternative - Use Test Passkey** (Sandbox):
   ```
   MPESA_PASSKEY: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
   ```

### 🚀 **Next Steps After Adding Secrets**

1. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy mpesa-stk-push
   supabase functions deploy mpesa-callback
   ```

2. **Test with Sandbox**:
   - Use phone number: `254708374149`
   - Test amount: 100-1000 KSH
   - Test PIN: `1234`

3. **Replace Payment Screen**:
   - Rename `app/payment.tsx` to `app/payment-old.tsx`
   - Rename `app/payment-new.tsx` to `app/payment.tsx`

### 🔍 **Where to Find Your Supabase Project Details**

1. **Go to**: https://supabase.com/dashboard/projects
2. **Select your project**
3. **Project Settings** → **API**
4. **Copy the Project URL** for callback configuration

### 📱 **Testing Payment Flow**

Once everything is set up:
1. User enters M-Pesa number (2547XXXXXXXX)
2. Clicks "Pay KSH 3,000"
3. Receives STK Push prompt on phone
4. Completes payment with PIN
5. Account gets activated automatically

### 🎯 **Quick Status Check**

After adding the missing secrets, test:
- [ ] Edge functions deploy successfully
- [ ] STK Push initiates without errors
- [ ] Payment callback processes correctly
- [ ] User account gets activated
- [ ] Real-time status updates work

### 📞 **Need Help?**

- M-Pesa API issues: Contact Safaricom developer support
- Supabase issues: Check edge function logs in dashboard
- Configuration: Verify all secrets are set correctly

**Ready to go live once MPESA_PASSKEY is added!** 🚀
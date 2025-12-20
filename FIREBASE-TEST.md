# Firebase Sync Test Instructions

## All Fixes Applied ✅

1. **Firebase Configuration** - Added actual config values to .env.local
2. **Required Fields** - Name*, Phone*, Address* are now required
3. **Invoice Number** - Now persists and doesn't change on refresh

## How to Test Firebase Sync Between Devices

### Step 1: Wait for Deployment
1. Go to https://vercel.com/your-dashboard
2. Wait for deployment to show "Ready" status (1-2 minutes)
3. Get your production URL

### Step 2: Test on First Device
1. Open your Vercel production URL (NOT localhost)
2. Press F12 to open browser console
3. Look for these messages:
   ```
   Firebase configured: true
   Firebase config: { hasApiKey: true, hasProjectId: true, projectId: 'marcopolo-invoice' }
   Firebase initialized successfully
   ```
4. Create a new invoice:
   - Fill in Name (required)
   - Fill in Phone (required)
   - Fill in Address (required)
   - Add at least one rug
   - Click "Generate Invoice"
5. Check console for: "Saved invoice to cloud: MP00000XXX"

### Step 3: Verify in Firebase Console
1. Go to https://console.firebase.google.com
2. Open your "MarcoPolo-invoice" project
3. Click "Firestore Database" in left menu
4. You should see "invoices" collection with your new invoice

### Step 4: Test on Second Device
1. Open the SAME Vercel production URL on a different device or browser
2. Click "Saved Invoices (X)" button
3. You should see the invoice you created on first device
4. This proves cloud sync is working!

### Step 5: Test Invoice Number Persistence
1. Create a new invoice - note the invoice number (e.g., MP00000123)
2. Refresh the page (F5)
3. The SAME invoice number should still be there (not changed)
4. After you click "Generate Invoice", a NEW number will be ready for next invoice

## If Firebase Shows "Not Configured"

If console shows `Firebase configured: false`:

### Check Vercel Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify ALL 6 variables are set:
   - NEXT_PUBLIC_FIREBASE_API_KEY = `AIzaSyCT5ukPxCXfMI3j8PgJCGdF5AvN6RnX0Y8`
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = `marcopolo-invoice.firebaseapp.com`
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID = `marcopolo-invoice`
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = `marcopolo-invoice.firebasestorage.app`
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = `257585408766`
   - NEXT_PUBLIC_FIREBASE_APP_ID = `1:257585408766:web:6309ba28477926e86c796f`
3. Make sure they're applied to "Production" environment
4. Trigger a new deployment: Deployments → Three dots → Redeploy

## Common Issues

### "Invoice saved locally but cloud sync failed"
- This means localStorage works but Firebase doesn't
- Check browser console for error messages
- Verify Firestore security rules allow read/write

### Invoice doesn't appear on other device
- Make sure you're using the PRODUCTION Vercel URL on both devices
- Don't use localhost - it only saves locally
- Wait 1-2 seconds and refresh "Saved Invoices"

### Invoice number changes on refresh
- This should now be FIXED
- Number is saved in localStorage and persists
- Only changes after successful invoice creation

## Success Checklist

✅ Name, Phone, Address are required (form won't submit without them)
✅ Invoice number stays the same when you refresh
✅ Invoice number only changes after you successfully create an invoice
✅ Browser console shows "Firebase configured: true"
✅ Browser console shows "Saved invoice to cloud: MP00000XXX"
✅ Invoice appears in Firebase Console under "invoices" collection
✅ Invoice appears on other devices when you click "Saved Invoices"

## If All Else Fails

If Firebase still doesn't work after all checks:

1. Send me screenshot of browser console (F12)
2. Send me screenshot of Vercel environment variables
3. Send me screenshot of Firebase Firestore Database
4. I'll help debug the specific issue

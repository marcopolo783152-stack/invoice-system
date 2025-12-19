# Firebase Setup Guide

Firebase provides cloud storage for your invoices, allowing access from any device worldwide.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `marco-polo-invoices` (or any name you prefer)
4. Click **Continue**
5. **Disable Google Analytics** (not needed) - toggle OFF
6. Click **Create project**
7. Wait for setup to complete, then click **Continue**

## Step 2: Create Firestore Database

1. In the left sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** 
4. Click **Next**
5. Select location closest to you (or leave default: `us-central`)
6. Click **Enable**
7. Wait for database to be created

## Step 3: Set Up Security Rules

1. In Firestore Database, click the **"Rules"** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /invoices/{invoice} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

⚠️ **Note:** These rules allow anyone to read/write. For production, you should add authentication.

## Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon in left sidebar)
2. Scroll down to **"Your apps"** section
3. Click the **Web icon** (`</>`) to add a web app
4. Enter app nickname: `Marco Polo Invoice System`
5. **Do NOT check** "Set up Firebase Hosting"
6. Click **"Register app"**
7. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "marco-polo-invoices.firebaseapp.com",
  projectId: "marco-polo-invoices",
  storageBucket: "marco-polo-invoices.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. **Copy all these values**
9. Click **"Continue to console"**

## Step 5: Update Configuration File

1. Open file: `lib/firebase.ts`
2. Replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

3. Save the file
4. Rebuild and deploy: `npm run build`
5. Push to GitHub: `git push origin main`

## Step 6: Test Cloud Sync

1. Create an invoice on Device A
2. Open the invoice system on Device B (different computer/phone)
3. Click **"Search Invoices"**
4. You should see the invoice from Device A!

## Features After Setup

✅ **Access from anywhere** - Any device, any country
✅ **Real-time sync** - Changes appear instantly
✅ **Never lose data** - Backed up in Google Cloud
✅ **Unlimited devices** - Use on desktop, tablet, phone
✅ **Search all invoices** - From any location

## Free Tier Limits

Firebase free plan includes:
- **1 GB storage** (enough for ~100,000 invoices)
- **50,000 reads/day** (plenty for small business)
- **20,000 writes/day** 
- **10 GB/month data transfer**

This is more than enough for typical invoice system usage.

## Troubleshooting

**Problem:** "Firebase not configured" error
**Solution:** Make sure you replaced ALL placeholder values in `lib/firebase.ts`

**Problem:** "Permission denied" error
**Solution:** Check Firestore Rules are set to allow read/write

**Problem:** Invoices not syncing
**Solution:** Open browser console (F12) and check for errors

## Support

For Firebase help: https://firebase.google.com/support
For project issues: Check console (F12) for error messages

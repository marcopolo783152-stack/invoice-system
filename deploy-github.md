# Invoice System - Deploy to Vercel (GitHub)

This guide will deploy your invoice system to a live server using GitHub + Vercel (completely free!).

## Step 1: Push to GitHub

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Invoice System"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/invoice-system.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel (Recommended - Free & Easy)

### Option A: Vercel CLI (Fastest)
```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- What's your project's name? **invoice-system**
- In which directory is your code located? **./**
- Want to override the settings? **N**

Your site will be live at: `https://invoice-system-xxx.vercel.app`

### Option B: Vercel Dashboard (Easiest)

1. Go to https://vercel.com
2. Click "Import Project"
3. Connect GitHub account
4. Select your repository
5. Click "Deploy"
6. Done! Live in 30 seconds

**Your site URL:** `https://your-project-name.vercel.app`

## Step 3: Custom Domain (Optional)

In Vercel dashboard:
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as shown

## Alternative: Netlify Deploy

```powershell
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=out
```

Or use Netlify Dashboard:
1. Go to https://netlify.com
2. Drag and drop `out/` folder
3. Live instantly!

## Alternative: GitHub Pages (Free)

Add to `package.json` scripts:
```json
"deploy": "npm run build && gh-pages -d out"
```

Then:
```powershell
npm install -g gh-pages
npm run deploy
```

Access at: `https://YOUR_USERNAME.github.io/invoice-system`

## Alternative: Railway (Free)

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. It will auto-detect and deploy

## Important Notes

### Environment Variables
If you need any environment variables, add them in Vercel/Netlify dashboard settings.

### Auto-Deploy
Every push to `main` branch will automatically redeploy your site!

### HTTPS
All these services provide free HTTPS certificates automatically.

### Custom Domain
You can connect your own domain (e.g., invoices.yourcompany.com) for free.

## Quick Deploy Now (Vercel - Easiest)

```powershell
# One command to deploy
npx vercel --prod
```

Follow prompts and your site is live in 60 seconds!

## Server Access
Once deployed, anyone with the URL can access your invoice system from anywhere in the world!

## Data Storage Note
Remember: Data is stored in browser localStorage (per-user). For shared database, we'd need to add a backend API.

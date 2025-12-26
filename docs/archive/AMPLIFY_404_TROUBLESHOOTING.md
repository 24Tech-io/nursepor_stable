# AWS Amplify 404 Error - Complete Troubleshooting Guide

## Root Causes

The 404 error on `https://main.d1feuk4cj2m70e.amplifyapp.com/` is most commonly caused by:

1. **Platform not set to WEB_COMPUTE** (most common)
2. **Framework not set to "Next.js - SSR"**
3. **Node.js version mismatch** (package.json requires 22.x, but Amplify may not support it)
4. **Build failing** (check build logs)
5. **Missing amplify.yml** (now fixed)

## Step-by-Step Fix

### Step 1: Check Amplify Console Platform Setting ⚠️ CRITICAL

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app (`d1feuk4cj2m70e`)
3. Go to **App settings** → **General**
4. Check the **Platform** field:
   - ✅ **Must be: `WEB_COMPUTE`** (for Next.js SSR)
   - ❌ **If it says: `WEB`** → This is the problem!

**If Platform is `WEB` (not `WEB_COMPUTE`):**
- You need to change it to `WEB_COMPUTE`
- **Note:** This might require recreating the app if the option is grayed out
- Contact AWS Support if you can't change it

### Step 2: Verify Branch Framework Setting

1. Go to **App settings** → **Build settings**
2. Click on your branch (`main`)
3. Check the **Framework** field:
   - ✅ **Must be: `Next.js - SSR`**
   - ❌ **If it's different** → Update it

**To update via AWS Console:**
- Click **Edit** on the branch
- Set **Framework** to `Next.js - SSR`
- Save

**To update via AWS CLI:**
```bash
aws amplify update-branch \
  --app-id d1feuk4cj2m70e \
  --branch-name main \
  --framework "Next.js - SSR" \
  --region us-east-1  # or your region
```

### Step 3: Verify Build Settings

In **Build settings** → Your branch, ensure:

- **Build command**: `npm run build`
- **Node version**: `20.x` (NOT 22.x - Amplify may not support Node 22 yet)
- **Build image**: Amazon Linux 2023 or Ubuntu 22

**Important:** Your `package.json` specifies Node `>=22.0.0`, but Amplify may not support it. The `amplify.yml` file now forces Node 20, which should work.

### Step 4: Check Build Logs

1. Go to **Build history**
2. Click on the latest build
3. Check if the build completed successfully
4. Look for errors like:
   - Build failures
   - Missing dependencies
   - Environment variable errors
   - Node version errors

### Step 5: Verify Environment Variables

Go to **App settings** → **Environment variables** and ensure these are set:

- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- Any `NEXT_PUBLIC_*` variables your app needs

### Step 6: Commit and Redeploy

After making changes:

1. **Commit the new `amplify.yml` file:**
   ```bash
   git add amplify.yml
   git commit -m "Add amplify.yml for Next.js SSR deployment"
   git push
   ```

2. **Or manually trigger a deployment:**
   - Go to Amplify Console → Your app
   - Click **Redeploy this version** or push a new commit

3. **Wait for build to complete** (check build logs)

4. **Test the URL:**
   - `https://main.d1feuk4cj2m70e.amplifyapp.com/`
   - `https://main.d1feuk4cj2m70e.amplifyapp.com/login`

## What Was Fixed

✅ **Created `amplify.yml`** - Build configuration file for Amplify
✅ **Set Node version to 20** - Compatible with Amplify (package.json still says 22, but amplify.yml overrides)
✅ **Configured for Next.js SSR** - Proper build settings

## If Still Getting 404 After These Steps

### Option 1: Check if Build Completed Successfully

- Go to Build history → Latest build → View logs
- Look for "Build succeeded" message
- If build failed, fix the errors first

### Option 2: Verify Platform is WEB_COMPUTE

This is the #1 cause of 404 errors:
- Platform MUST be `WEB_COMPUTE` (not `WEB`)
- If you can't change it, you may need to recreate the app

### Option 3: Try Removing amplify.yml (Let Amplify Auto-Detect)

Sometimes Amplify's auto-detection works better:

1. Delete or rename `amplify.yml`
2. In Amplify Console → Build settings → Edit
3. Remove any custom build settings
4. Let Amplify auto-detect Next.js
5. Redeploy

### Option 4: Check Rewrites and Redirects

1. Go to **App settings** → **Rewrites and redirects**
2. Ensure there's a rule for SPA routing:
   - Source: `/<*>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`

**Note:** For Next.js SSR, this might not be needed, but check if it helps.

## Quick Checklist

- [ ] Platform is `WEB_COMPUTE` (not `WEB`)
- [ ] Framework is `Next.js - SSR`
- [ ] Node version is 20.x (not 22.x)
- [ ] Build command is `npm run build`
- [ ] Build completed successfully (check logs)
- [ ] Environment variables are set
- [ ] `amplify.yml` file exists and is committed
- [ ] Redeployed after making changes

## Contact AWS Support

If none of these steps work:
- The platform might be locked to `WEB` and can't be changed
- You may need to recreate the app with `WEB_COMPUTE` from the start
- Contact AWS Support for assistance


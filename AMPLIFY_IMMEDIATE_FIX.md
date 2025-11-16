# 🚨 IMMEDIATE FIX for AWS Amplify 404 Error

## ⚠️ CRITICAL: Check These Settings FIRST

The 404 error is **99% likely** due to incorrect Amplify Console settings. Follow these steps **in order**:

---

## Step 1: Verify Platform Setting (MOST IMPORTANT)

1. Go to: [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app: `d1feuk4cj2m70e`
3. Click: **App settings** → **General**
4. Look for: **Platform** field

### ✅ CORRECT:
- Platform: `WEB_COMPUTE`

### ❌ WRONG (causes 404):
- Platform: `WEB`

**If Platform is `WEB`:**
- This is your problem!
- You **MUST** change it to `WEB_COMPUTE` for Next.js SSR
- If you can't change it (grayed out), you may need to:
  - Contact AWS Support, OR
  - Recreate the app with WEB_COMPUTE from the start

---

## Step 2: Verify Framework Setting

1. Go to: **App settings** → **Build settings**
2. Click on your branch: `main`
3. Look for: **Framework** field

### ✅ CORRECT:
- Framework: `Next.js - SSR`

### ❌ WRONG:
- Framework: `Next.js - SSG` (Static Site Generation)
- Framework: `React` or `React - Single Page Application`
- Framework: `Other` or blank

**To Fix:**
- Click **Edit** on the branch
- Change Framework to: `Next.js - SSR`
- Save

---

## Step 3: Check Build Logs

1. Go to: **Build history**
2. Click on the **latest build**
3. Check:
   - ✅ Build status: **Succeeded** (green)
   - ❌ Build status: **Failed** (red) → Fix errors first!

**If build failed:**
- Look for error messages
- Common issues:
  - Missing environment variables
  - Node version errors
  - Build command errors
  - Dependency installation failures

---

## Step 4: Verify Environment Variables

Go to: **App settings** → **Environment variables**

**Required variables:**
- `DATABASE_URL` (your Neon Postgres connection string)
- `JWT_SECRET` (any random 32+ character string)

**Optional but recommended:**
- `NEXT_PUBLIC_APP_URL` (set to your Amplify URL)
- SMTP variables (if using email features)
- Stripe variables (if using payments)

---

## Step 5: Try Two Options

### Option A: Use amplify.yml (Current Setup)

The `amplify.yml` file is already created. Make sure:
1. It's committed to your repository
2. It's in the root directory
3. Redeploy after committing

### Option B: Remove amplify.yml (Let Amplify Auto-Detect)

Sometimes Amplify's auto-detection works better:

1. **Delete or rename `amplify.yml`**:
   ```bash
   git rm amplify.yml
   git commit -m "Remove amplify.yml to use Amplify auto-detection"
   git push
   ```

2. **In Amplify Console:**
   - Go to **Build settings** → **Edit**
   - Remove any custom build settings
   - Let Amplify auto-detect Next.js
   - Save

3. **Redeploy**

---

## Step 6: Check Rewrites and Redirects

1. Go to: **App settings** → **Rewrites and redirects**

**For Next.js SSR, you typically DON'T need custom rewrites** (Amplify handles it automatically).

**But if you want to add one:**
- Source: `/<*>`
- Target: `/index.html`
- Type: `200 (Rewrite)`

**Note:** This is usually NOT needed for Next.js SSR, but try it if nothing else works.

---

## Step 7: Verify Node Version

In **Build settings** → Your branch:

- **Node version**: Should be `20.x` (NOT 22.x)
- The `amplify.yml` file forces Node 20, which should override `package.json`

---

## Step 8: Clear CloudFront Cache

1. Go to: **App settings** → **General**
2. Look for: **CloudFront distribution**
3. Click on the distribution link
4. Go to: **Invalidations** tab
5. Create invalidation: `/*`
6. Wait for it to complete (usually 1-2 minutes)

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Platform is `WEB_COMPUTE` (not `WEB`)
- [ ] Framework is `Next.js - SSR`
- [ ] Latest build succeeded (check logs)
- [ ] Environment variables are set (`DATABASE_URL`, `JWT_SECRET`)
- [ ] Node version is 20.x (not 22.x)
- [ ] `amplify.yml` is committed and pushed (if using Option A)
- [ ] Redeployed after making changes
- [ ] CloudFront cache cleared (if needed)

---

## If STILL Getting 404 After All Steps

### 1. Check Build Output

In build logs, look for:
```
Creating an optimized production build...
Compiled successfully
```

If you see errors, fix them first.

### 2. Verify App is Actually Deployed

- Check if the build completed successfully
- Look for deployment URL in build logs
- Try accessing: `https://main.d1feuk4cj2m70e.amplifyapp.com/` (with trailing slash)

### 3. Test Different Routes

Try these URLs:
- `https://main.d1feuk4cj2m70e.amplifyapp.com/` (homepage)
- `https://main.d1feuk4cj2m70e.amplifyapp.com/login` (login page)

If `/login` works but `/` doesn't, it's a routing issue.

### 4. Contact AWS Support

If Platform is locked to `WEB` and can't be changed:
- This is a known limitation
- You may need to recreate the app
- Contact AWS Support for assistance

---

## Most Likely Solution

**90% of the time, the issue is:**

1. Platform is `WEB` instead of `WEB_COMPUTE` → **Change to WEB_COMPUTE**
2. Framework is not `Next.js - SSR` → **Change to Next.js - SSR**
3. Build failed → **Fix build errors first**

**After fixing these, redeploy and the 404 should be resolved.**


# 🔍 How to Check Your AWS Amplify Settings

## Quick Access Links

1. **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Your App**: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1feuk4cj2m70e

---

## Step-by-Step: Check Platform Setting

1. **Open AWS Amplify Console**
2. **Click on your app** (`d1feuk4cj2m70e`)
3. **Click**: `App settings` (left sidebar)
4. **Click**: `General` (under App settings)
5. **Look for**: `Platform` field

### What You Should See:

```
Platform: WEB_COMPUTE  ✅ CORRECT
```

### What You Might See (WRONG):

```
Platform: WEB  ❌ THIS CAUSES 404!
```

**If it says `WEB`:**
- This is why you're getting 404
- You need to change it to `WEB_COMPUTE`
- If the field is grayed out/disabled, you may need AWS Support help

---

## Step-by-Step: Check Framework Setting

1. **In Amplify Console**, go to: `App settings` → `Build settings`
2. **Click on your branch**: `main`
3. **Look for**: `Framework` field

### What You Should See:

```
Framework: Next.js - SSR  ✅ CORRECT
```

### What You Might See (WRONG):

```
Framework: Next.js - SSG  ❌ WRONG
Framework: React  ❌ WRONG
Framework: Other  ❌ WRONG
Framework: (blank)  ❌ WRONG
```

**To Fix:**
- Click `Edit` button
- Change `Framework` to: `Next.js - SSR`
- Click `Save`

---

## Step-by-Step: Check Build Status

1. **In Amplify Console**, click: `Build history` (left sidebar)
2. **Click on the latest build**
3. **Look at the status**:

### ✅ Good:
```
Status: Succeeded (green checkmark)
```

### ❌ Bad:
```
Status: Failed (red X)
```

**If Failed:**
- Click `View logs` to see errors
- Fix the errors
- Redeploy

---

## Step-by-Step: Check Environment Variables

1. **In Amplify Console**, go to: `App settings` → `Environment variables`
2. **Verify these are set:**

### Required:
- `DATABASE_URL` - Your Neon Postgres connection string
- `JWT_SECRET` - Any random 32+ character string

### Example:
```
DATABASE_URL = postgresql://user:pass@host.neon.tech/dbname?sslmode=require
JWT_SECRET = your-random-secret-key-here-min-32-chars
```

**If missing:**
- Click `Manage variables`
- Add the missing variables
- Save
- Redeploy

---

## Step-by-Step: Check Node Version

1. **In Amplify Console**, go to: `App settings` → `Build settings`
2. **Click on your branch**: `main`
3. **Look for**: `Node version` or `Node.js version`

### ✅ Correct:
```
Node version: 20.x
```

### ❌ Wrong:
```
Node version: 22.x  (Amplify may not support this yet)
```

**To Fix:**
- Click `Edit`
- Change Node version to `20.x`
- Save

---

## After Making Changes

1. **Commit and push** the `amplify.yml` file (if you haven't already):
   ```bash
   git add amplify.yml
   git commit -m "Add amplify.yml for Next.js SSR"
   git push
   ```

2. **Or manually trigger deployment**:
   - In Amplify Console → Your app
   - Click `Redeploy this version` OR
   - Push a new commit to trigger auto-deploy

3. **Wait for build to complete** (usually 5-10 minutes)

4. **Test the URL**:
   - `https://main.d1feuk4cj2m70e.amplifyapp.com/`

---

## Still Getting 404?

If you've checked all the above and still get 404:

1. **Take a screenshot** of:
   - Platform setting (App settings → General)
   - Framework setting (App settings → Build settings → main branch)
   - Latest build status (Build history)

2. **Check build logs** for any errors

3. **Contact AWS Support** with:
   - App ID: `d1feuk4cj2m70e`
   - Branch: `main`
   - Screenshots of settings
   - Build log errors (if any)

---

## Most Common Issue

**90% of 404 errors are caused by:**

Platform = `WEB` instead of `WEB_COMPUTE`

**Fix:** Change Platform to `WEB_COMPUTE` in App settings → General

If you can't change it, you may need to recreate the app or contact AWS Support.


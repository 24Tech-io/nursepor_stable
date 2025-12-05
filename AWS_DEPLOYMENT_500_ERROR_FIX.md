# 🚨 AWS Deployment 500 Error - Complete Fix Guide

## 🔍 **ISSUES IDENTIFIED**

### **Issue #1: HARDCODED `secure: false` in Cookies** ⚠️⚠️⚠️

**CRITICAL:** Several auth endpoints have `secure: false` hardcoded, which breaks HTTPS in production!

**Files with Issues:**
1. `src/app/api/auth/admin-login/route.ts` (line 174)
2. `src/app/api/auth/switch-role/route.ts` (line 79)
3. `src/app/api/auth/refresh/route.ts` (line 113)
4. `src/app/api/auth/fingerprint-login/route.ts` (line 74)

**Problem:**
```typescript
secure: false  // ❌ WRONG! Cookies won't work in production HTTPS
```

**Should Be:**
```typescript
secure: process.env.NODE_ENV === 'production'  // ✅ Correct
```

---

### **Issue #2: Missing Environment Variables in AWS** ⚠️

AWS Amplify needs these environment variables set:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `JWT_SECRET` - At least 32 characters (same value as local)
- `NODE_ENV=production`

**Optional but Recommended:**
- `NEXT_PUBLIC_APP_URL` - Your AWS Amplify URL
- `SMTP_*` - Email settings (if using password reset)

---

### **Issue #3: X-Frame-Options May Block Loading** ⚠️

**File:** `src/middleware.ts` (line 39)

```typescript
response.headers.set('X-Frame-Options', 'DENY');
```

This blocks ALL framing, which can cause "fail to load frame" errors in some contexts.

---

## 🔧 **COMPLETE FIX**

### **Fix #1: Update Cookie Settings** (CRITICAL!)

**File:** `src/app/api/auth/admin-login/route.ts` (line 171-178)

**Change:**
```typescript
// BEFORE ❌
jsonResponse.cookies.set('token', sessionToken, {
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // ❌ WRONG!
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
  domain: undefined,
});

// AFTER ✅
jsonResponse.cookies.set('token', sessionToken, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production', // ✅ Correct!
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
  domain: undefined,
});
```

**Repeat for these files:**
- `src/app/api/auth/switch-role/route.ts` (line 76-81)
- `src/app/api/auth/refresh/route.ts` (line 110-115)
- `src/app/api/auth/fingerprint-login/route.ts` (line 71-76)

---

### **Fix #2: Set Environment Variables in AWS Amplify**

1. Go to AWS Amplify Console
2. Select your app
3. Go to **Environment variables**
4. Add these:

```bash
DATABASE_URL="postgresql://username:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-secret-key-at-least-32-characters-long-same-as-local"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://master.d1ink9ws0bkm9.amplifyapp.com"
```

**IMPORTANT:** Use the EXACT same `JWT_SECRET` you use locally!

---

### **Fix #3: Verify Build Settings**

AWS Amplify build settings should be:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
```

---

### **Fix #4: Check TypeScript Build Errors**

Your `next.config.js` has:

```javascript
typescript: {
  ignoreBuildErrors: true,
},
```

**This hides errors!** Some TypeScript errors might cause runtime 500s in production.

**Recommendation:**
```javascript
typescript: {
  ignoreBuildErrors: false,  // Fix TS errors properly
},
```

Then fix any build errors that appear.

---

## 🔒 **Common AWS Amplify Issues**

### **Issue: Database Connection Fails**

**Symptoms:**
- 500 error on login
- "Database is not available" in logs

**Causes:**
- `DATABASE_URL` not set in AWS
- Wrong database URL format
- Database not allowing connections from AWS IPs

**Fix:**
- Set `DATABASE_URL` in AWS environment variables
- Use Neon's connection string with `?sslmode=require`
- Check Neon allows external connections

---

### **Issue: JWT Verification Fails**

**Symptoms:**
- 500 error after login redirect
- "Invalid token" errors
- Can't stay logged in

**Causes:**
- Different `JWT_SECRET` in AWS vs local
- `JWT_SECRET` missing in AWS
- `JWT_SECRET` less than 32 characters

**Fix:**
- Use EXACT same JWT_SECRET in AWS as local
- Must be at least 32 characters
- Generate new one if needed:
  ```bash
  # PowerShell
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
  ```

---

### **Issue: Cookies Don't Work**

**Symptoms:**
- Login succeeds but immediately logged out
- Can't maintain session
- 401 errors after login

**Causes:**
- `secure: false` in production (HTTPS requires secure cookies)
- Wrong domain settings
- SameSite issues

**Fix:**
- Use `secure: process.env.NODE_ENV === 'production'`
- Set `domain: undefined` or don't set domain
- Use `sameSite: 'lax'`

---

### **Issue: X-Frame-Options Blocking**

**Symptoms:**
- "fail to load frame" error
- Page won't load in certain contexts
- CSP violations

**Causes:**
- `X-Frame-Options: DENY` too strict
- CSP `frame-ancestors 'none'` blocking

**Fix (if needed):**
```typescript
// In middleware.ts
// Change from:
response.headers.set('X-Frame-Options', 'DENY');

// To:
response.headers.set('X-Frame-Options', 'SAMEORIGIN');
```

---

## 🧪 **TESTING IN AWS**

### **Step 1: Check AWS Amplify Logs**

1. Go to AWS Amplify Console
2. Select your app
3. Click on latest build
4. Check "Build logs" for errors

Look for:
- `DATABASE_URL is not set`
- `JWT_SECRET must be set`
- TypeScript errors
- Build failures

---

### **Step 2: Test Login**

1. Go to your AWS URL
2. Try to login
3. Open browser DevTools (F12)
4. Check Console for errors
5. Check Network tab for 500 responses

**Look for:**
- Failed API calls
- Cookie errors
- CORS errors
- CSP violations

---

### **Step 3: Check AWS Environment Variables**

```bash
# In AWS Amplify Console
# Environment variables → Should see:

DATABASE_URL = postgresql://...
JWT_SECRET = your-secret-key-here
NODE_ENV = production
```

---

## 📋 **AWS DEPLOYMENT CHECKLIST**

- [ ] Set `DATABASE_URL` in AWS environment variables
- [ ] Set `JWT_SECRET` in AWS (SAME as local!)
- [ ] Set `NODE_ENV=production`
- [ ] Fix `secure: false` to `secure: process.env.NODE_ENV === 'production'`
- [ ] Verify build succeeds in AWS
- [ ] Test login on AWS URL
- [ ] Check cookies are set (DevTools → Application → Cookies)
- [ ] Verify database connection from AWS
- [ ] Check AWS logs for errors

---

## 🚀 **QUICK FIX STEPS**

### **Immediate Actions:**

```bash
# 1. Fix cookie settings in code
# (Changes needed in 4 files - see Fix #1 above)

# 2. Commit and push
git add .
git commit -m "Fix production cookie security settings"
git push

# 3. In AWS Amplify Console:
#    - Add environment variables
#    - Redeploy

# 4. Test login
```

---

## 🎯 **ROOT CAUSE**

The 500 error is likely caused by:

**Primary:** `secure: false` in cookies → HTTPS cookies rejected → Auth fails → 500 error

**Secondary:** Missing `DATABASE_URL` or `JWT_SECRET` in AWS → Can't verify credentials → 500 error

---

## 💡 **PRODUCTION-READY COOKIE FORMAT**

**Always use this pattern:**

```typescript
response.cookies.set('cookieName', value, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',  // ✅ Dynamic!
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
  domain: undefined,
});
```

---

## 🔍 **DEBUGGING AWS ISSUES**

### **Get AWS Logs:**

```bash
# Check Amplify build logs
# Go to: AWS Amplify → Your App → Latest Build → View Logs

# Look for:
- "DATABASE_URL is not set"
- "JWT_SECRET must be set"
- "Failed to initialize database"
- Any 500 errors
```

### **Check Application Logs:**

AWS Amplify → Monitoring → View CloudWatch Logs

Look for runtime errors during login attempts.

---

## ✅ **AFTER FIX**

You should be able to:
- ✅ Access AWS URL
- ✅ See login page
- ✅ Login successfully
- ✅ Stay logged in
- ✅ Use all features
- ✅ No 500 errors
- ✅ Cookies work correctly

---

## 📞 **IF STILL FAILING**

Provide:
1. AWS build logs (copy/paste errors)
2. Browser console errors (F12 → Console)
3. Network tab response (F12 → Network → Failed request → Response)
4. Confirm environment variables are set

Then I can provide specific fix!

---

**Priority:** 🔥 CRITICAL - Fix cookie settings immediately!
**Difficulty:** Easy (4 line changes)
**Impact:** Will fix 500 error and login issues


# 🔧 JWT_SECRET Troubleshooting Guide

## ❌ Current Error
```
Server configuration error. JWT_SECRET is missing or invalid.
```

## 🔍 Root Cause Analysis

The error occurs when:
1. `JWT_SECRET` is not set in AWS Amplify environment variables
2. `JWT_SECRET` is set but has less than 32 characters
3. `JWT_SECRET` has leading/trailing whitespace
4. App was not redeployed after setting the variable
5. Variable is set in wrong environment/branch

## ✅ Step-by-Step Fix

### Step 1: Verify JWT_SECRET in AWS Amplify Console

1. Go to: https://console.aws.amazon.com/amplify
2. Select your app: `main.d37ba296v07j95.amplifyapp.com`
3. Click **App settings** → **Environment variables**
4. Look for `JWT_SECRET` variable

**Check:**
- ✅ Variable name is exactly `JWT_SECRET` (case-sensitive)
- ✅ Value is exactly: `4Jaej0rbLXsSnRDulk25WfwpV1qYM8AK9ZPzh6U7ExNOQ3yoFvdHBItigGcCmT`
- ✅ NO spaces before or after the value
- ✅ NO quotes around the value

### Step 2: Fix JWT_SECRET if Needed

If the variable exists but might have issues:

1. **Click Edit** on the `JWT_SECRET` variable
2. **Select ALL text** in the value field (Ctrl+A)
3. **Delete everything**
4. **Type or paste** the exact value: `4Jaej0rbLXsSnRDulk25WfwpV1qYM8AK9ZPzh6U7ExNOQ3yoFvdHBItigGcCmT`
5. **Make sure there are NO spaces** before or after
6. **Click Save**

### Step 3: Verify All Required Variables

Make sure these 4 variables are set:

```
JWT_SECRET=4Jaej0rbLXsSnRDulk25WfwpV1qYM8AK9ZPzh6U7ExNOQ3yoFvdHBItigGcCmT
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
DATABASE_URL=postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Step 4: CRITICAL - Redeploy the App

**This is the most important step!** Environment variables only take effect after redeployment.

1. After saving environment variables, go to **Deployments** tab
2. Click **Redeploy this version** (or trigger a new deployment)
3. Wait for deployment to complete (usually 3-5 minutes)
4. Check deployment logs for any errors

### Step 5: Test After Deployment

After deployment completes:

1. Visit: https://main.d37ba296v07j95.amplifyapp.com/api/debug/env-check
2. This will show you what the server sees for `JWT_SECRET`
3. Check if `jwtSecret.isValid` is `true`

Then test login:
- Admin: https://main.d37ba296v07j95.amplifyapp.com/admin/login
- Student: https://main.d37ba296v07j95.amplifyapp.com/login

## 🐛 Common Issues

### Issue 1: Variable Set But Not Working
**Cause:** App not redeployed after setting variable
**Fix:** Redeploy the app (Step 4 above)

### Issue 2: Whitespace in Value
**Cause:** Copy/paste added spaces
**Fix:** Edit variable, delete all, retype value (Step 2 above)

### Issue 3: Variable Set in Wrong Environment
**Cause:** AWS Amplify has multiple environments (production, preview, etc.)
**Fix:** Make sure you're setting variables in the **Production** environment (or the environment your app uses)

### Issue 4: Variable Name Typo
**Cause:** Variable name is `JWT_SECRET` but might be `jwt_secret` or `Jwt_Secret`
**Fix:** Variable names are case-sensitive. Must be exactly `JWT_SECRET`

## 🔍 Debugging Tools

### Check Environment Variables (After Deployment)

Visit: https://main.d37ba296v07j95.amplifyapp.com/api/debug/env-check

This will show:
- Whether `JWT_SECRET` exists
- Its length (raw and trimmed)
- First/last 4 characters
- Whether it has leading/trailing spaces
- Whether it's valid (32+ characters)

### Check AWS Amplify Logs

1. Go to AWS Amplify Console → Your App → **Monitoring** → **Logs**
2. Look for error messages containing "JWT_SECRET"
3. Check the enhanced logging we added (shows first/last chars, length, etc.)

## ✅ Verification Checklist

After following all steps:

- [ ] `JWT_SECRET` variable exists in AWS Amplify Console
- [ ] Value is exactly 62 characters (no spaces)
- [ ] All 4 required variables are set
- [ ] App has been redeployed after setting variables
- [ ] Deployment completed successfully
- [ ] `/api/debug/env-check` shows `jwtSecret.isValid: true`
- [ ] Login works without "JWT_SECRET is missing or invalid" error

## 🚨 If Still Not Working

If the error persists after redeployment:

1. **Check AWS Amplify Build Logs:**
   - Go to Deployments → Latest deployment → Build logs
   - Look for any errors during build

2. **Verify Variable is in Correct Branch:**
   - Make sure you're setting variables for the branch that's deployed (usually `main`)

3. **Try Deleting and Re-adding:**
   - Delete the `JWT_SECRET` variable
   - Add it again with the exact value
   - Redeploy

4. **Check for Special Characters:**
   - Make sure the value doesn't have any hidden characters
   - Try generating a new JWT_SECRET if needed

## 📝 Quick Reference

**Exact values to set in AWS Amplify:**

```
JWT_SECRET=4Jaej0rbLXsSnRDulk25WfwpV1qYM8AK9ZPzh6U7ExNOQ3yoFvdHBItigGcCmT
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
DATABASE_URL=postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Remember:** 
- NO quotes around values
- NO trailing slashes in URLs
- NO spaces before/after values
- MUST redeploy after setting variables



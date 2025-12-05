# 🔧 AWS Amplify Environment Variables Configuration

## 📋 **Complete List for AWS Amplify Console**

Go to: **AWS Amplify Console** → **Your App** → **App settings** → **Environment variables**

Then add/update these variables:

---

## ✅ **REQUIRED Variables (Must Set)**

### 1. **DATABASE_URL**
```
DATABASE_URL=postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
**Why:** Database connection for your Neon Postgres database

---

### 2. **JWT_SECRET**
```
JWT_SECRET=your-actual-jwt-secret-value-here
```
**Why:** Used for authentication token signing
**Note:** Use the same value from your `.env.local` (must be 32+ characters)

---

### 3. **NEXT_PUBLIC_APP_URL** ⚠️ **CRITICAL**
```
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
```
**Why:** Used for password reset links, email links, CORS, and redirects
**Important:** Must match your actual AWS Amplify URL (no trailing slash)

---

### 4. **NODE_ENV**
```
NODE_ENV=production
```
**Why:** Tells Next.js to run in production mode (enables optimizations, secure cookies, etc.)

---

## 🔐 **OPTIONAL Variables (Set if Using These Features)**

### 5. **SMTP Configuration** (For Email Features)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Nurse Pro Academy <noreply@example.com>
```
**Why:** Enables password reset emails, welcome emails, notifications
**Note:** If not set, email features won't work

---

### 6. **Stripe Keys** (For Payment Features)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
```
**Why:** Enables payment processing
**Note:** Use `pk_live_` and `sk_live_` for production (not `pk_test_`)

---

### 7. **Google Gemini API** (For AI Features)
```
GEMINI_API_KEY=your-gemini-api-key-here
```
**Why:** Enables AI-powered features (if using)

---

### 8. **Admin App URL** (If Separate Admin App)
```
NEXT_PUBLIC_ADMIN_URL=https://admin.d37ba296v07j95.amplifyapp.com
```
**Why:** If you have a separate admin app deployment
**Note:** Only needed if admin app is on different domain

---

## 📝 **Step-by-Step Instructions**

### **Step 1: Access AWS Amplify Console**
1. Go to: https://console.aws.amazon.com/amplify
2. Sign in to your AWS account
3. Select your app: `main.d37ba296v07j95.amplifyapp.com`

### **Step 2: Navigate to Environment Variables**
1. Click on your app name
2. Click **App settings** (left sidebar)
3. Click **Environment variables** (under App settings)

### **Step 3: Add Variables**
For each variable:
1. Click **Add environment variable**
2. Enter **Variable name** (e.g., `DATABASE_URL`)
3. Enter **Value** (paste the value)
4. Click **Save**

### **Step 4: Verify All Variables**
Make sure you have at least these 4 required variables:
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET`
- ✅ `NEXT_PUBLIC_APP_URL`
- ✅ `NODE_ENV`

### **Step 5: Redeploy**
1. After adding all variables, click **Save**
2. Go to **Deployments** tab
3. Click **Redeploy this version** (or push a new commit)
4. Wait for deployment to complete

---

## 🎯 **Quick Copy-Paste Template**

Copy this and fill in your values in AWS Amplify Console:

```bash
# REQUIRED - Copy these exactly
DATABASE_URL=postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your-jwt-secret-from-env-local
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
NODE_ENV=production

# OPTIONAL - Add if using these features
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Nurse Pro Academy <noreply@example.com>
```

---

## ⚠️ **Important Notes**

1. **No Quotes:** Don't add quotes around values in AWS Console
   - ✅ Correct: `NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com`
   - ❌ Wrong: `NEXT_PUBLIC_APP_URL="https://main.d37ba296v07j95.amplifyapp.com"`

2. **No Trailing Slash:** Don't add trailing slash to URLs
   - ✅ Correct: `https://main.d37ba296v07j95.amplifyapp.com`
   - ❌ Wrong: `https://main.d37ba296v07j95.amplifyapp.com/`

3. **Case Sensitive:** Variable names are case-sensitive
   - ✅ Correct: `NEXT_PUBLIC_APP_URL`
   - ❌ Wrong: `next_public_app_url`

4. **JWT_SECRET:** Must match your `.env.local` value exactly
   - Copy the exact value from your `.env.local` file

5. **Redeploy Required:** After adding variables, you must redeploy for changes to take effect

---

## ✅ **Verification Checklist**

After setting variables and redeploying, test:

- [ ] App loads at `https://main.d37ba296v07j95.amplifyapp.com`
- [ ] Login works (student & admin)
- [ ] Database connections work
- [ ] Password reset email links use AWS URL (not localhost)
- [ ] API endpoints respond correctly
- [ ] No CORS errors in browser console

---

## 🆘 **Troubleshooting**

### **Issue: Password reset links still point to localhost**
- **Fix:** Verify `NEXT_PUBLIC_APP_URL` is set correctly in AWS Console
- **Fix:** Redeploy after setting the variable

### **Issue: Database connection fails**
- **Fix:** Verify `DATABASE_URL` is correct and accessible from AWS
- **Fix:** Check database allows connections from AWS IPs

### **Issue: Login doesn't work**
- **Fix:** Verify `JWT_SECRET` matches your `.env.local` value
- **Fix:** Check cookies are being set (check browser DevTools)

### **Issue: CORS errors**
- **Fix:** Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
- **Fix:** Check middleware CORS configuration

---

**Status:** ✅ Ready to configure in AWS Amplify Console


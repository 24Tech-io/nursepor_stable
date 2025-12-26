# 🚨 CRITICAL: NEXT_PUBLIC_APP_URL Configuration

## ⚠️ **The Problem**

Your `.env.local` has:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

But your AWS deployment is at:
```
https://main.d37ba296v07j95.amplifyapp.com/
```

## 🔴 **Why This Causes Issues**

### **1. Password Reset Links**
- Password reset emails will contain `http://localhost:3000/reset-password?token=...`
- Users clicking these links will try to access localhost (which won't work)
- **Result:** Password reset feature completely broken

### **2. Email Links**
- Any email notifications will point to localhost
- Users can't access these links from their devices
- **Result:** Email functionality broken

### **3. CORS Configuration**
- Middleware checks `NEXT_PUBLIC_APP_URL` for CORS
- Requests from AWS domain may be blocked
- **Result:** API calls may fail

### **4. Redirect URLs**
- After login/logout, redirects may go to localhost
- **Result:** Users redirected to wrong URL

### **5. OAuth/Callback URLs**
- If using social login, callbacks won't work
- **Result:** Authentication failures

---

## ✅ **The Solution**

### **For Localhost Development:**
Keep `.env.local` with:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **For AWS Amplify Production:**
Set in AWS Amplify Console → Environment Variables:
```bash
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
```

**OR** if you want to use the same `.env.local` for both, you can use:
```bash
# For localhost, use: http://localhost:3000
# For AWS, override in Amplify Console
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

But **MUST** set it in AWS Amplify Console to:
```
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
```

---

## 📋 **Step-by-Step Fix**

### **1. Update AWS Amplify Environment Variables:**

Go to AWS Amplify Console:
1. Select your app: `main.d37ba296v07j95.amplifyapp.com`
2. Go to **App settings** → **Environment variables**
3. Add/Update:
   ```
   NEXT_PUBLIC_APP_URL = https://main.d37ba296v07j95.amplifyapp.com
   ```
4. **Save** and **Redeploy**

### **2. Verify After Deployment:**

Test these features:
- [ ] Password reset email links
- [ ] Login redirects
- [ ] API calls work
- [ ] CORS allows your domain

---

## 🔧 **Recommended Configuration**

### **Option 1: Separate Files (Recommended)**
- `.env.local` → For localhost development
- AWS Amplify Console → For production

### **Option 2: Environment Detection**
The code already uses `process.env.NODE_ENV` to detect production:
```typescript
secure: process.env.NODE_ENV === 'production'
```

So you can:
- Keep `.env.local` with localhost URL
- Set AWS URL in Amplify Console (it will override)

---

## ✅ **Correct AWS Configuration**

In AWS Amplify Console, set these environment variables:

```bash
# Required
DATABASE_URL=postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your-jwt-secret-here
NEXT_PUBLIC_APP_URL=https://main.d37ba296v07j95.amplifyapp.com
NODE_ENV=production

# Optional
NEXT_PUBLIC_ADMIN_URL=https://admin.d37ba296v07j95.amplifyapp.com  # If separate admin app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Nurse Pro Academy <noreply@example.com>
```

---

## 🎯 **Quick Fix Command**

After setting in AWS Amplify Console, redeploy:
1. Go to AWS Amplify Console
2. Click **Redeploy this version** (or push a new commit)
3. Wait for deployment
4. Test password reset functionality

---

## ⚠️ **Important Notes**

1. **Never commit `.env.local` to Git** - It contains secrets
2. **Always set production URLs in AWS Console** - Not in `.env.local`
3. **Test after deployment** - Verify password reset links work
4. **Use HTTPS in production** - Your AWS URL already uses HTTPS ✅

---

**Status:** ⚠️ **Needs Fix** - Update `NEXT_PUBLIC_APP_URL` in AWS Amplify Console


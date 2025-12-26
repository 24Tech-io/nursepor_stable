# AWS Amplify Console Build Settings Configuration

## Step-by-Step: Configure Build Settings in Amplify Console

Instead of using `amplify.yml`, you can configure everything directly in the AWS Amplify Console.

---

## Step 1: Access Build Settings

1. Go to: [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click on your app: `d1feuk4cj2m70e`
3. Click: **App settings** (left sidebar)
4. Click: **Build settings**
5. Click: **Edit** (on your `main` branch)

---

## Step 2: Configure Build Settings

### Framework
```
Framework: Next.js - SSR
```
**Important:** Must be `Next.js - SSR` (not SSG, not React)

### Build Image
```
Build image: Amazon Linux 2023
```
**OR**
```
Build image: Ubuntu 22
```

### Node.js Version
```
Node.js version: 20.x
```
**Important:** Use `20.x` (NOT 22.x - Amplify may not support Node 22 yet)

---

## Step 3: Build Commands

### Pre-build commands:
```bash
npm ci
```

### Build command:
```bash
npm run build
```

### Post-build commands:
(Leave empty or remove any existing commands)

---

## Step 4: Artifacts (Build Output)

### Base directory:
```
.next
```

### Files:
```
**/*
```

**OR** leave it as default (Amplify will auto-detect)

---

## Step 5: Environment Variables

Go to: **App settings** → **Environment variables**

Add these required variables:

### Required:
```
DATABASE_URL = postgresql://user:password@host.neon.tech/dbname?sslmode=require
JWT_SECRET = your-random-32-character-secret-key-here
```

### Optional (but recommended):
```
NEXT_PUBLIC_APP_URL = https://main.d1feuk4cj2m70e.amplifyapp.com
```

### If using email features:
```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-password
SMTP_FROM = Nurse Pro Academy <noreply@yourdomain.com>
```

### If using Stripe:
```
STRIPE_SECRET_KEY = sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
```

---

## Step 6: Platform Setting (CRITICAL)

Go to: **App settings** → **General**

### Platform:
```
WEB_COMPUTE  ✅ REQUIRED
```

**MUST be `WEB_COMPUTE`** (not `WEB`) for Next.js SSR to work!

If it's set to `WEB`, you need to change it to `WEB_COMPUTE`. If you can't change it, contact AWS Support.

---

## Step 7: Save and Deploy

1. **Click "Save"** on the build settings page
2. **Go to your app** → Click **Redeploy this version** OR
3. **Push a commit** to trigger auto-deployment:
   ```bash
   git commit --allow-empty -m "Trigger Amplify rebuild"
   git push
   ```

---

## Complete Build Settings Summary

Here's what your build settings should look like:

```
Framework: Next.js - SSR
Build image: Amazon Linux 2023
Node.js version: 20.x

Pre-build commands:
  npm ci

Build command:
  npm run build

Post-build commands:
  (empty)

Base directory: .next
Files: **/*
```

---

## Optional: Remove amplify.yml

If you want to use console settings exclusively, you can remove the `amplify.yml` file:

```bash
git rm amplify.yml
git commit -m "Remove amplify.yml, using console build settings"
git push
```

**Note:** Console settings will take precedence over `amplify.yml` if both exist, but removing it avoids confusion.

---

## Verify Settings

After configuring:

1. ✅ Platform = `WEB_COMPUTE` (App settings → General)
2. ✅ Framework = `Next.js - SSR` (Build settings)
3. ✅ Node version = `20.x` (Build settings)
4. ✅ Build command = `npm run build` (Build settings)
5. ✅ Environment variables set (App settings → Environment variables)
6. ✅ Latest build succeeded (Build history)

---

## Troubleshooting

### If build fails:
- Check build logs in **Build history** → Latest build → View logs
- Verify all environment variables are set correctly
- Ensure Node version is 20.x (not 22.x)

### If still getting 404:
- **Most common cause:** Platform is `WEB` instead of `WEB_COMPUTE`
- Check: App settings → General → Platform
- Must be `WEB_COMPUTE` for Next.js SSR

### If Platform can't be changed:
- Contact AWS Support
- You may need to recreate the app with `WEB_COMPUTE` from the start

---

## Quick Checklist

- [ ] Platform = `WEB_COMPUTE` (App settings → General)
- [ ] Framework = `Next.js - SSR` (Build settings)
- [ ] Node version = `20.x` (Build settings)
- [ ] Build command = `npm run build` (Build settings)
- [ ] Pre-build command = `npm ci` (Build settings)
- [ ] Base directory = `.next` (Build settings)
- [ ] Environment variables set (DATABASE_URL, JWT_SECRET)
- [ ] Saved build settings
- [ ] Triggered new deployment
- [ ] Build completed successfully


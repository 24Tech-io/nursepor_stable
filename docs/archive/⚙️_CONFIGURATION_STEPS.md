# ⚙️ Configuration Setup Guide

**Status:** 🔄 In Progress  
**Time Required:** 15-20 minutes  

---

## 📋 What We're Setting Up

1. ✅ **Security Secrets** - Generated automatically
2. ⏳ **SMTP Email** - For notifications (Gmail or SendGrid)
3. ⏳ **Stripe Payments** - For course purchases
4. ⏳ **Google Gemini AI** - For AI assistant features
5. ⏳ **Redis Cache** - Optional, for performance

---

## 🔐 Step 1: Security Secrets (✅ DONE!)

These have been automatically generated:

```
CSRF_SECRET=b13570a62c76359e615e8ea9f1efcbbfdde1bf4f3be9e51ec4746afdf11154ad
SESSION_SECRET=517ff5f6577423cb796bcaee4679c0028715c49bbe77b4462065e1316dda8229
ENCRYPTION_KEY=06021a2ce40b0b374978cee55c97ee9231550767a4e6aca164e438702447ac52
FACE_API_ENCRYPTION_KEY=7023999e6d1ce3b74b6b60614412add9e50dcc5b075b43072be12e1e4226c93d
```

✅ **These will be added to your .env.local file automatically**

---

## 📧 Step 2: SMTP Email Configuration

### Option A: Gmail (Easiest - 5 minutes)

#### What You Need:
- A Gmail account
- Google Account with 2-Step Verification enabled

#### Steps:

1. **Go to Gmail Settings**
   - Visit: https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Create App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or Other)
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Your Configuration:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop  # Remove spaces from app password
   SMTP_FROM="Nurse Pro Academy <your-email@gmail.com>"
   ```

### Option B: SendGrid (Professional - 5 minutes)

1. **Create Account**
   - Visit: https://signup.sendgrid.com/
   - Free tier: 100 emails/day

2. **Create API Key**
   - Go to: Settings → API Keys
   - Click "Create API Key"
   - Name: "LMS Platform"
   - Full Access
   - Copy the key (starts with `SG.`)

3. **Your Configuration:**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=SG.your-api-key-here
   SMTP_FROM="Nurse Pro Academy <noreply@yourdomain.com>"
   ```

**Which should I use?**
- Gmail: Easy for testing
- SendGrid: Better for production

---

## 💳 Step 3: Stripe Payment Configuration

### Steps (5 minutes):

1. **Create Stripe Account**
   - Visit: https://dashboard.stripe.com/register
   - Complete verification (can use test mode immediately)

2. **Get Test API Keys**
   - Visit: https://dashboard.stripe.com/test/apikeys
   - Click "Developers" → "API keys"
   - Copy both keys:
     - **Publishable key** (starts with `pk_test_`)
     - **Secret key** (starts with `sk_test_`)

3. **Get Webhook Secret** (for payment events)
   - Visit: https://dashboard.stripe.com/test/webhooks
   - Click "+ Add endpoint"
   - Endpoint URL: `http://localhost:3000/api/payments/webhook` (or your domain)
   - Events to listen to:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `charge.refunded`
   - Click "Add endpoint"
   - Click to reveal "Signing secret" (starts with `whsec_`)

4. **Your Configuration:**
   ```env
   STRIPE_SECRET_KEY=sk_test_your_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

**Test Credit Card:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

## 🤖 Step 4: Google Gemini AI Configuration

### Steps (2 minutes):

1. **Get API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Or: https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Select existing project or create new one
   - Copy the API key

2. **Your Configuration:**
   ```env
   GEMINI_API_KEY=AIzaSy...your-key-here
   ```

**Free Tier:**
- 60 requests per minute
- Perfect for testing and moderate use

---

## 🗄️ Step 5: Redis Cache (Optional - 2 minutes)

### Option A: Docker (Easiest)

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Configuration:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Option B: Windows (Native)

1. Download from: https://github.com/microsoftarchive/redis/releases
2. Install and run

**Configuration:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Option C: Cloud (Production)

- **Redis Cloud:** https://redis.com/try-free/
- **AWS ElastiCache**
- **Azure Cache**

**Skip this for now if you want - it's optional!**

---

## 📝 Summary Checklist

### Required for Full Functionality:
- [ ] ✅ Security Secrets (Done automatically)
- [ ] 📧 SMTP Email (Choose Gmail or SendGrid)
- [ ] 💳 Stripe Payments (Get test keys)
- [ ] 🤖 Gemini AI (Get API key)

### Optional:
- [ ] 🗄️ Redis Cache (Skip for now, add later)

---

## 🚀 What Happens Next

Once you provide the API keys:

1. ✅ I'll update your `.env.local` file
2. ✅ I'll restart the server
3. ✅ I'll test each configuration
4. ✅ You'll be ready to use all features!

---

## ⏱️ Time Breakdown

- Gmail SMTP: 5 minutes
- Stripe: 5 minutes
- Gemini AI: 2 minutes
- Redis: 2 minutes (optional)

**Total: 12-15 minutes**

---

## 💡 Pro Tips

1. **Start with test keys** - Switch to live keys later
2. **Use Gmail for testing** - Easy and fast
3. **Save your keys** - Keep them in a password manager
4. **Webhook URL** - Update with real domain when deploying

---

## 🆘 Need Help?

### Common Issues:

**Gmail App Password not working?**
- Make sure 2-Step Verification is enabled
- Remove spaces from the password
- Try generating a new app password

**Stripe webhook failing?**
- For localhost, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments/webhook`
- Or skip webhook for local testing

**Gemini API errors?**
- Make sure you copied the full key
- Check API is enabled in Google Cloud Console
- Verify free tier limits

---

## 📞 Ready?

**Tell me when you have:**
1. SMTP credentials (Gmail or SendGrid)
2. Stripe API keys
3. Gemini API key

**And I'll configure everything for you!** 🚀

Or let me know if you need help getting any of these keys.

---

**Current Status:**
- ✅ Security secrets generated
- ⏳ Waiting for SMTP credentials
- ⏳ Waiting for Stripe keys
- ⏳ Waiting for Gemini API key



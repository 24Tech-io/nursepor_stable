# 🔑 API Keys Configuration

**Instructions:** Get your API keys from the services below and paste them here. I'll automatically configure everything!

---

## 📧 SMTP Email Configuration

### Which service are you using?
- [ ] **Gmail** (Easy for testing)
- [ ] **SendGrid** (Professional)
- [ ] **Skip for now** (You can add this later)

### If using Gmail:
1. Get app password from: https://myaccount.google.com/apppasswords
2. Paste below:

```
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password-no-spaces
```

### If using SendGrid:
1. Get API key from: https://app.sendgrid.com/settings/api_keys
2. Paste below:

```
SMTP_PASS=SG.your-sendgrid-api-key-here
SMTP_FROM=noreply@yourdomain.com
```

---

## 💳 Stripe Payment Configuration

### Get your test keys:
1. Visit: https://dashboard.stripe.com/test/apikeys
2. Copy both keys and paste below:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Get webhook secret:
1. Visit: https://dashboard.stripe.com/test/webhooks
2. Create endpoint: `http://localhost:3000/api/payments/webhook`
3. Add events: `checkout.session.completed`, `payment_intent.succeeded`
4. Paste secret below:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🤖 Google Gemini AI Configuration

### Get your API key:
1. Visit: https://makersuite.google.com/app/apikey
2. Create API key and paste below:

```
GEMINI_API_KEY=AIzaSy...
```

---

## 🗄️ Redis Cache (OPTIONAL - Skip for now)

If you want to set up Redis:

```bash
# Run this in terminal:
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Then it will be auto-configured.

---

## ✅ What to do:

**Option 1: Configure Everything Now (15 mins)**
1. Open the links above
2. Get all the API keys
3. Paste them in this file
4. Tell me "keys ready" and I'll configure everything!

**Option 2: Configure Step by Step**
1. Tell me which service you want to configure first
2. I'll guide you through just that one
3. We'll do the others later

**Option 3: Quick Start (Skip for now)**
- Tell me "skip configuration"
- I'll show you what works without API keys
- You can add them later

---

## 💬 Just tell me:

- "I have Gmail credentials" → I'll configure Gmail SMTP
- "I have Stripe keys" → I'll configure Stripe payments
- "I have Gemini key" → I'll configure AI features
- "I have all keys" → I'll configure everything at once
- "skip for now" → I'll show you what works without configuration

---

**What would you like to do?** 🚀



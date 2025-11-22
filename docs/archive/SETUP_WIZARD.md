# 🧙‍♂️ Setup Wizard - From Zero to Hero!

Since you don't have Gmail or Stripe yet, I'll guide you through creating everything from scratch!

---

## 📧 PART 1: Email Setup (SendGrid - FREE!)

### Step 1: Create SendGrid Account (2 minutes)

1. **Go to:** https://signup.sendgrid.com/
2. **Fill in:**
   - Email: Your email address
   - Password: Create a strong password
   - Click "Create Account"

3. **Verify your email** (check inbox)

4. **Skip the questionnaire** or fill it:
   - "I'm building an LMS platform"
   - "Less than 100 contacts"
   - Click "Get Started"

### Step 2: Create API Key (1 minute)

1. **In SendGrid Dashboard:**
   - Click "Settings" (left sidebar)
   - Click "API Keys"
   - Click "Create API Key"

2. **Configure:**
   - Name: `LMS Platform`
   - Select: "Full Access"
   - Click "Create & View"

3. **COPY THE KEY!** (You'll only see it once!)
   - Looks like: `SG.xxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### Step 3: Verify Sender Email (1 minute)

1. **In SendGrid:**
   - Settings → Sender Authentication
   - Click "Verify a Single Sender"

2. **Fill in your details:**
   - From Name: `Nurse Pro Academy`
   - From Email: Your email (the one you signed up with)
   - Reply To: Same email
   - Company: `Nurse Pro Academy`
   - Address: Your address (can be home address)

3. **Verify:** Check inbox and click verification link

### Step 4: Add to .env.local

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_api_key_here
SMTP_FROM="Nurse Pro Academy <your-verified-email@example.com>"
```

✅ **Done! You can now send 100 emails/day FREE!**

---

## 💳 PART 2: Stripe Payment Setup (FREE!)

### Step 1: Create Stripe Account (3 minutes)

1. **Go to:** https://dashboard.stripe.com/register

2. **Fill in:**
   - Email: Your email
   - Full name: Your name
   - Country: Your country
   - Password: Create strong password
   - Click "Create account"

3. **Verify email** (check inbox and click link)

### Step 2: Get Your API Keys (30 seconds)

1. **After login, you'll see the Dashboard**

2. **Look for "Get your test API keys"** or:
   - Click "Developers" (top right)
   - Click "API keys"

3. **You'll see TWO keys:**
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

4. **COPY BOTH KEYS!**

### Step 3: Skip Business Details (For Now)

- You can complete business profile later
- Test mode works without verification
- For production, you'll need to verify business

### Step 4: Setup Webhook (For local testing)

**Option A: For Local Testing (Easier)**
```env
STRIPE_WEBHOOK_SECRET=whsec_test_local_development
```

**Option B: Stripe CLI (More accurate)**
```bash
# Install Stripe CLI (Windows)
scoop install stripe

# Or download from: https://github.com/stripe/stripe-cli/releases

# Run forwarding
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook

# Copy the webhook secret (starts with whsec_)
```

### Step 5: Add to .env.local

```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

✅ **Done! Payments are ready to test!**

---

## 🔐 PART 3: Generate Security Secrets (30 seconds)

### Run this command:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('CSRF_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Copy output to .env.local:

```env
JWT_SECRET=abc123...
CSRF_SECRET=def456...
SESSION_SECRET=ghi789...
```

---

## 📝 PART 4: Complete .env.local File

### Create the file:

```bash
cp .env.example .env.local
```

### Edit `.env.local` with ALL your values:

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (leave empty for SQLite)
DATABASE_URL=

# Security Secrets
JWT_SECRET=your_generated_jwt_secret
CSRF_SECRET=your_generated_csrf_secret
SESSION_SECRET=your_generated_session_secret

# SendGrid Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
SMTP_FROM="Nurse Pro Academy <your-verified-email@example.com>"

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional - Can keep defaults
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ENABLE_FACE_ID=true
ENABLE_FINGERPRINT=true
ENABLE_TWO_FACTOR=true
```

---

## 🚀 PART 5: Launch! (1 minute)

```bash
# Install dependencies (if not already)
npm install

# Apply database migrations
npx drizzle-kit migrate

# Start the server
npm run dev
```

**Open:** http://localhost:3000

✅ **Your platform is LIVE!**

---

## 🧪 PART 6: Test Everything! (5 minutes)

### 1. Test Email
```bash
# Register a new user
# Check if you receive welcome email
```

### 2. Test Password Reset
- Click "Forgot Password"
- Enter your email
- Check inbox for reset link
- ✅ If you get email, SMTP works!

### 3. Test Payment
- Login as student
- Browse courses
- Click "Purchase" on a course
- Use test card: **4242 4242 4242 4242**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits
- Complete payment
- ✅ If payment succeeds, Stripe works!

### 4. Test New Features
- ✅ **Leave a review:** Rate a course
- ✅ **Add to wishlist:** Click heart icon
- ✅ **Watch video:** Check progress saves
- ✅ **Complete course:** Get certificate
- ✅ **Ask question:** Use Q&A section
- ✅ **Apply coupon:** Use discount code

---

## ❓ TROUBLESHOOTING

### SendGrid Issues?

**"API key not working"**
- Make sure you copied the entire key
- Should start with `SG.`
- No spaces before/after

**"Sender verification failed"**
- Check your email inbox
- Click the verification link
- Use the EXACT email you verified in SMTP_FROM

**"Emails not sending"**
- Check SendGrid dashboard for errors
- Verify API key has "Mail Send" permission
- Make sure sender email is verified

### Stripe Issues?

**"API key invalid"**
- Make sure you copied both keys correctly
- Test keys start with `pk_test_` and `sk_test_`
- No spaces before/after

**"Webhook not working"**
- For local testing, use: `whsec_test_local_development`
- For production, need real webhook endpoint

**"Payment fails"**
- Use test card: 4242 4242 4242 4242
- Any future expiry date
- Any CVC (e.g., 123)
- Check Stripe dashboard for errors

### Database Issues?

**"Migration fails"**
```bash
# Reset and try again
rm lms.db
npx drizzle-kit migrate
```

**"Table already exists"**
- That's OK! Migration handles it
- Just continue

---

## 📞 NEED HELP?

### SendGrid Not Working?
**Alternative Email Services (Also Free):**

**Option 2: Mailjet (Free 6,000/month)**
```env
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_USER=your_api_key
SMTP_PASS=your_secret_key
```
Sign up: https://app.mailjet.com/signup

**Option 3: Brevo (Free 300/day)**
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_smtp_key
```
Sign up: https://onboarding.brevo.com/account/register

### Stripe Not Working?
I can help you through any errors!

### Questions?
Just ask me! I'll help you get everything configured! 😊

---

## ✅ CONFIGURATION CHECKLIST

- [ ] Created SendGrid account
- [ ] Created API key
- [ ] Verified sender email
- [ ] Added SMTP to .env.local
- [ ] Created Stripe account
- [ ] Copied API keys
- [ ] Added Stripe to .env.local
- [ ] Generated JWT/CSRF/SESSION secrets
- [ ] Added secrets to .env.local
- [ ] Ran `npm install`
- [ ] Ran `npx drizzle-kit migrate`
- [ ] Started server `npm run dev`
- [ ] Tested email sending
- [ ] Tested payment
- [ ] 🎉 LAUNCHED!

---

## 🎯 ONCE CONFIGURED, YOU'LL HAVE:

✅ **Fully functional email system**
- Password resets
- Welcome emails
- Notifications
- All automated!

✅ **Complete payment system**
- Stripe checkout
- Automatic enrollment
- Coupon support
- Webhook handling

✅ **ALL Udemy/Coursera features**
- Reviews & ratings
- Wishlist
- Progress tracking
- Certificates
- Q&A
- Notes
- Bookmarks
- Coupons
- Categories
- Announcements
- And 85+ more features!

---

## 🚀 READY TO START?

1. **Create SendGrid account** (2 mins)
2. **Create Stripe account** (2 mins)
3. **Configure .env.local** (2 mins)
4. **Launch!** `npm run dev`

**Total Time: 6 minutes to full launch!** ⏱️

---

## 💬 QUESTIONS?

**Ask me:**
- "How do I create SendGrid API key?"
- "Where do I find Stripe keys?"
- "What if SendGrid doesn't work?"
- "Can I use a different email service?"
- "Help with any error!"

**I'm here to help you succeed! 💪**

---

## 🎊 YOU'RE ALMOST THERE!

**Just 6 minutes away from:**
- ✅ Fully functional LMS
- ✅ Email notifications working
- ✅ Payments processing
- ✅ All premium features
- ✅ Production-ready platform

**GO CREATE THOSE ACCOUNTS! 🚀**

**Then tell me when you're ready, and I'll help you test everything!** 😊


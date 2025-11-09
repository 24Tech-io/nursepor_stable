# ⚙️ Configuration Guide

## 📧 SMTP Email Configuration

Your SMTP is already implemented! Just add these to `.env.local`:

### Option 1: Gmail (Recommended for Development)

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="Nurse Pro Academy <your-email@gmail.com>"
```

### Option 2: SendGrid (Recommended for Production)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
SMTP_FROM="Nurse Pro Academy <noreply@yourdomain.com>"
```

### Test Email

```bash
curl -X POST http://localhost:3000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"email":"test@example.com"}'
```

## 💳 Stripe Payment Configuration

Your Stripe is already implemented! Just add these to `.env.local`:

### Get Stripe Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Get your publishable and secret keys
3. Add to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_51xxxxx (or sk_live for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx (or pk_live)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Setup Webhook (for Production)

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Test Payment

1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any ZIP code

## ✅ Verification

Once configured, restart your server and check:

```bash
# Check SMTP
npm run dev
# Look for: "✅ SMTP email configured and verified"

# Check Stripe
# Look for: "✅ Stripe payment configured"

# Test email
POST /api/admin/test-email

# Test payment
# Go to student dashboard → Purchase course
```

## 🚨 Troubleshooting

### SMTP Not Working

**Gmail:** "Less secure app access"
- Use App Password instead (requires 2FA)
- Don't use regular password

**Connection timeout:**
- Check firewall/antivirus
- Try port 465 with SMTP_SECURE=true
- Verify credentials

**Authentication failed:**
- Double-check username/password
- Some providers require email as username
- Check if account is locked

### Stripe Not Working

**Webhook errors:**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/payments/webhook`
- Check webhook secret matches
- Verify endpoint is publicly accessible

**Payment fails:**
- Check test mode vs live mode
- Verify API keys match (test with test, live with live)
- Check Stripe dashboard for errors

## 📝 Quick Config Checklist

- [ ] Copy `.env.example` to `.env.local`
- [ ] Add JWT_SECRET (random 32+ chars)
- [ ] Add CSRF_SECRET (random 32+ chars)
- [ ] Add SESSION_SECRET (random 32+ chars)
- [ ] Configure SMTP (Gmail or SendGrid)
- [ ] Add Stripe keys (test mode first)
- [ ] Set NEXT_PUBLIC_APP_URL
- [ ] Set DATABASE_URL (or leave empty for SQLite)
- [ ] Test email sending
- [ ] Test payment processing
- [ ] Verify all features work

**Once configured, you're ready to go! 🚀**


# SMTP Email Configuration Guide

## Quick Setup

Add these variables to your `.env.local` file:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Nurse Pro Academy <noreply@nurseproacademy.com>"
```

## Common SMTP Providers

### Gmail

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use these settings:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM="Nurse Pro Academy <your-email@gmail.com>"
```

### Outlook/Hotmail

```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
SMTP_FROM="Nurse Pro Academy <your-email@outlook.com>"
```

### Yahoo Mail

```env
SMTP_HOST="smtp.mail.yahoo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@yahoo.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Nurse Pro Academy <your-email@yahoo.com>"
```

### SendGrid

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="Nurse Pro Academy <noreply@nurseproacademy.com>"
```

### Mailgun

```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-mailgun-smtp-username"
SMTP_PASS="your-mailgun-smtp-password"
SMTP_FROM="Nurse Pro Academy <noreply@nurseproacademy.com>"
```

## Testing Your SMTP Configuration

### Method 1: Check Server Logs

When you start the server, you should see:
- ✅ `SMTP email configured and verified` - Configuration is working
- ❌ `SMTP connection verification failed` - Check your settings

### Method 2: Use the Test Email API

1. Log in as admin
2. Test connection:
   ```bash
   curl http://localhost:3000/api/admin/test-email \
     -H "Cookie: token=your-admin-token"
   ```

3. Send test email:
   ```bash
   curl -X POST http://localhost:3000/api/admin/test-email \
     -H "Content-Type: application/json" \
     -H "Cookie: token=your-admin-token" \
     -d '{"email":"your-test-email@example.com"}'
   ```

## Troubleshooting

### Error: "Invalid login"
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Other providers**: Verify your username and password are correct

### Error: "Connection timeout"
- Check if your firewall is blocking port 587 or 465
- Try using port 465 with `SMTP_SECURE="true"`

### Error: "Certificate verification failed"
- For development, you can set `SMTP_REJECT_UNAUTHORIZED="false"` (not recommended for production)

### Error: "Authentication failed"
- Double-check your SMTP_USER and SMTP_PASS
- For Gmail, ensure 2FA is enabled and you're using an App Password

## Security Notes

- Never commit `.env.local` to version control
- Use App Passwords instead of regular passwords when available
- For production, use a dedicated email service (SendGrid, Mailgun, AWS SES)
- Keep your SMTP credentials secure

## Advanced Options

```env
# Optional: Require TLS (default: true)
SMTP_REQUIRE_TLS="true"

# Optional: Reject unauthorized certificates (default: true)
# Set to "false" only for development/testing
SMTP_REJECT_UNAUTHORIZED="true"
```


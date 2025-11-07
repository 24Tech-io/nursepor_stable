# Troubleshooting Internal Server Errors

## Common Causes and Solutions

### 1. Database Connection Error

**Error:** `Database is not available. Please check your DATABASE_URL in .env.local`

**Solution:**
1. Create a `.env.local` file in the root directory if it doesn't exist
2. Add your Neon database URL:
   ```
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```
3. Restart the development server

### 2. Database Tables Not Found

**Error:** `Database tables not found. Please run migrations`

**Solution:**
Run the database migrations:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 3. Missing Environment Variables

**Check if these are set in `.env.local`:**
- `DATABASE_URL` - Required for database connection
- `JWT_SECRET` - Required for authentication
- `NEXT_PUBLIC_APP_URL` - Required for payment redirects (defaults to http://localhost:3000)
- `STRIPE_SECRET_KEY` - Optional, for payment processing
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Optional, for payment processing
- `STRIPE_WEBHOOK_SECRET` - Optional, for payment webhooks

### 4. Check Server Logs

Look at the terminal where `npm run dev` is running to see the exact error message.

### 5. Clear Next.js Cache

If you're seeing stale errors, try:
```bash
rm -rf .next
npm run dev
```

### 6. Verify Database Connection

Test your database connection:
```bash
# Visit http://localhost:3000/api/test-db
# Or check the terminal logs for database initialization messages
```

## Quick Fix Checklist

- [ ] `.env.local` file exists with `DATABASE_URL`
- [ ] Database migrations have been run (`npx drizzle-kit migrate`)
- [ ] Development server has been restarted after adding environment variables
- [ ] Check terminal logs for specific error messages
- [ ] Verify database URL is correct and accessible


# Neon DB Setup Guide

This guide will help you connect your LMS Platform to Neon DB and fix any connection issues.

## Step 1: Get Your Neon DB Connection String

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign in or create an account
3. Create a new project (or use an existing one)
4. Go to your project dashboard
5. Click on "Connection Details" or find your connection string
6. Copy the connection string - it should look like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

## Step 2: Create .env.local File

1. In your project root directory, create a file named `.env.local`
2. Add the following content:

```env
# Neon DB Connection String (REQUIRED)
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# JWT Secret for authentication (REQUIRED)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# SMTP Configuration (Optional - for email features)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="LMS Platform <noreply@example.com>"
```

**Important:** Replace the `DATABASE_URL` with your actual Neon connection string!

## Step 3: Run Database Migrations

After setting up your `.env.local` file, you need to create the database tables:

```bash
npx drizzle-kit migrate
```

This will create all the necessary tables in your Neon database.

## Step 4: Test Database Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and go to:
   ```
   http://localhost:3000/api/test-db
   ```

3. You should see a success message if everything is configured correctly.

## Step 5: Verify Everything Works

1. Try registering a new account at `http://localhost:3000/register`
2. Try logging in at `http://localhost:3000/login`
3. Check your Neon Console to see if data is being saved

## Troubleshooting

### Error: "DATABASE_URL is not set"
- Make sure you created `.env.local` in the project root
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Restart your development server after creating/editing `.env.local`

### Error: "Database connection failed"
- Double-check your `DATABASE_URL` connection string
- Make sure it includes `?sslmode=require` at the end
- Verify your Neon database is running (check Neon Console)

### Error: "Database tables not found"
- Run migrations: `npx drizzle-kit migrate`
- Check if migrations ran successfully
- Verify tables exist in Neon Console → SQL Editor: `SELECT * FROM users;`

### Error: "Internal server error" with no details
- Check your terminal/console for detailed error messages
- Make sure you're running in development mode (`npm run dev`)
- Check the browser console for error messages

## Quick Test Commands

```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Or open in browser:
# http://localhost:3000/api/test-db
```

## Need Help?

If you're still having issues:
1. Check the terminal output for detailed error messages
2. Visit `/api/test-db` to see specific error details
3. Verify your Neon connection string is correct
4. Make sure migrations have been run


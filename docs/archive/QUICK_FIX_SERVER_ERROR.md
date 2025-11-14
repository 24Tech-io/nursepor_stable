# Quick Fix for Internal Server Error

## Most Common Cause: Missing DATABASE_URL

The internal server error is most likely caused by a missing or invalid `DATABASE_URL` environment variable.

## Quick Fix Steps:

### 1. Check if `.env.local` exists
```bash
# In PowerShell
Test-Path .env.local
```

### 2. Create `.env.local` if it doesn't exist
Create a file named `.env.local` in the root directory with:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# JWT Secret (REQUIRED)
JWT_SECRET="your-secret-key-here-change-this-in-production"

# App URL (Optional, defaults to http://localhost:3000)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Get Your Neon Database URL
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Copy the connection string
4. Paste it as `DATABASE_URL` in `.env.local`

### 4. Run Database Migrations
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5. Restart the Server
```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Check the Error Message

After restarting, check:
1. **Terminal logs** - Look for error messages
2. **Browser console** - Check for API error responses
3. **Network tab** - See which API call is failing

The improved error handling will now show you a clear message about what's wrong instead of a generic "Internal Server Error".

## Test Database Connection

Visit: `http://localhost:3000/api/test-db`

This will tell you if your database connection is working.


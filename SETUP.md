# Nurse Pro Academy Setup Guide

## ✅ Fixed Issues

1. **PostCSS Configuration** - Fixed to use object format with `@tailwindcss/postcss`
2. **Database Connection** - Supports both Neon Postgres and SQLite fallback
3. **Migrations** - All database migrations are applied

## 🚀 Quick Start

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# For Neon Postgres (production/remote):
DATABASE_URL="postgresql://username:password@host.neon.tech/dbname?sslmode=require"

# For local SQLite (development - leave DATABASE_URL empty or comment it out):
# DATABASE_URL=""

# JWT Secret for authentication tokens
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# SMTP Configuration for Email (optional but recommended)
# For Gmail:
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # Use App Password, not regular password
SMTP_FROM="Nurse Pro Academy <noreply@nurseproacademy.com>"
SMTP_REQUIRE_TLS="true"
SMTP_REJECT_UNAUTHORIZED="true"

# For other providers:
# Outlook: smtp-mail.outlook.com, port 587
# Yahoo: smtp.mail.yahoo.com, port 587
# SendGrid: smtp.sendgrid.net, port 587, user: "apikey", pass: your-api-key
# Mailgun: smtp.mailgun.org, port 587

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Neon Database Setup

If you want to use Neon Postgres (recommended):

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your connection string
4. Add it to `.env.local` as `DATABASE_URL`

The connection string looks like:
```
postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### 3. Local Development (SQLite)

If you don't have a Neon database yet, you can run locally with SQLite:
- Just don't set `DATABASE_URL` in `.env.local` (or comment it out)
- The app will automatically use SQLite (`lms.db` file)

### 4. Run Migrations (Only for Neon)

If using Neon Postgres, run migrations:
```bash
npx drizzle-kit migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🧪 Testing Registration & Login

1. **Register a new account:**
   - Go to `http://localhost:3000/register`
   - Fill in the form
   - Submit - data will be saved to Neon DB (or SQLite if no DATABASE_URL)

2. **Login:**
   - Go to `http://localhost:3000/login`
   - Use the credentials you just created
   - Should authenticate against the database

## 📝 Default Accounts (if using seed script)

If you run the seed script:
- **Admin**: `admin@lms.com` / `password123`
- **Student**: `student@lms.com` / `password123`

## 🔧 Troubleshooting

### PostCSS Error
- If you see PostCSS errors, make sure `postcss.config.cjs` exists
- Try clearing `.next` folder: `rm -rf .next` (or `Remove-Item .next -Recurse` on Windows)

### Database Connection Error
- Check that `DATABASE_URL` is correct in `.env.local`
- Make sure Neon database is running
- For SQLite fallback, ensure `better-sqlite3` is installed

### Registration/Login Not Working
- Check browser console for errors
- Verify database connection string
- Check server logs in terminal

## 📦 Dependencies

All required packages are installed:
- ✅ `@tailwindcss/postcss` - Tailwind CSS v4
- ✅ `better-sqlite3` - SQLite support
- ✅ `@neondatabase/serverless` - Neon Postgres support
- ✅ `drizzle-orm` - Database ORM
- ✅ All other dependencies

## 🎯 What Works

- ✅ User registration → Saves to database
- ✅ User login → Authenticates against database
- ✅ Session management → Creates sessions in database
- ✅ Password hashing → Secure bcrypt hashing
- ✅ Cookie-based auth → HttpOnly cookies
- ✅ Both Neon Postgres and SQLite support


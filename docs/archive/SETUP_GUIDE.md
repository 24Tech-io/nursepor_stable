# Nurse Pro Academy - Quick Setup Guide

## Step 1: Create `.env.local`

```bash
cp env.local.example .env.local
```

Then open `.env.local` and ensure it has:

```env
# Database (Your Neon connection string)
DATABASE_URL="postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# JWT Secret (32+ characters - required)
JWT_SECRET="nurse-pro-academy-super-secret-jwt-key-2024-production-ready"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Stripe Test Keys (optional - for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"
STRIPE_SECRET_KEY="sk_test_YOUR_KEY_HERE"

# SMTP (optional - for password reset emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Nurse Pro Academy <noreply@nurseproacademy.com>"
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Sync Database Schema

This creates all tables (courses, question_banks, qbank_questions, qbank_tests, etc.) in your Neon database:

```bash
npx drizzle-kit push
```

**Important**: When prompted about the `nursing_candidate_forms` table, select `+ nursing_candidate_forms` to create it.

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Create Nurse Pro Course & Test Data

Once the server is running, visit this URL in your browser:

```
http://localhost:3000/api/test/create-nurse-pro
```

This will:
- Create the "Nurse Pro" course (free, published)
- Create a question bank
- Add 50 test questions with answers (multiple choice and SATA)
- Create sample tests for existing students
- Generate question attempts and statistics

You should see a JSON response like:

```json
{
  "success": true,
  "message": "Nurse Pro course and Q-Bank data created successfully!",
  "data": {
    "course": { "id": "1", "title": "Nurse Pro", "pricing": 0, "status": "published" },
    "questionBank": { "id": "1", "name": "Nurse Pro Q-Bank" },
    "questionsCreated": 50,
    "testsCreated": 6,
    "attemptsCreated": 60,
    "statsCreated": 60,
    "studentsProcessed": 3
  }
}
```

## Step 6: Test the Application

1. **Log out** if you're already logged in (to get a fresh token)
2. **Log in** as a student (or create a new student account)
3. Visit `/student/dashboard`
4. You should see "Nurse Pro" in "Explore More Courses" section
5. Click "Enroll for Free" to enroll
6. After enrollment, click on "Nurse Pro" to access the course
7. Click "Q-Bank" in the sidebar to see the Q-Bank interface with all the test data

## Troubleshooting

### Database Connection Issues

If you see "Database connection error":
- Verify your `DATABASE_URL` in `.env.local` is correct
- Test the connection: `psql 'postgresql://...'`

### Migration Issues

If tables don't exist:
```bash
npx drizzle-kit push
```

### Token Issues (401 errors)

If you see "Invalid or expired token":
- Log out and log back in
- Clear browser cookies for `localhost:3000`
- Make sure `.env.local` has a valid `JWT_SECRET`

### No Courses Showing

1. Visit `/api/test/create-nurse-pro` to create the course
2. Check the console logs in the browser (F12)
3. Visit `/api/debug/courses` to see all courses in database

## Next Steps

After setup:
- The "Nurse Pro" course should appear in the student dashboard
- Students can enroll for free
- Access Q-Bank feature with 50 test questions
- View statistics, previous tests, and remediation sections


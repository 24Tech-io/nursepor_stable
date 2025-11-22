# Quick Start - Nurse Pro Academy

## ✅ What's Already Done

1. ✅ `env.local.example` created with your Neon database URL
2. ✅ Database schema ready to push
3. ✅ Test endpoint created with 50 sample questions
4. ✅ Auto-enrollment for free "Nurse Pro" course

## 🚀 Run These Commands

### 1. Copy the environment file

```bash
cp env.local.example .env.local
```

**Note**: The `.env.local` already contains your Neon database URL!

### 2. Push database schema to Neon

```bash
npx drizzle-kit push
```

When prompted about `nursing_candidate_forms`, select **`+ nursing_candidate_forms`** (press Enter).

### 3. Start the development server

```bash
npm run dev
```

### 4. Create test data

Visit in your browser: **http://localhost:3000/api/test/create-nurse-pro**

This creates:
- ✅ "Nurse Pro" course (free, published)
- ✅ Question bank with 50 questions
- ✅ Sample tests (completed + pending)
- ✅ Question attempts and statistics

### 5. Test the application

1. Go to **http://localhost:3000/login**
2. Log in as a student (or register if needed)
3. You'll see "Nurse Pro" in "Explore More Courses"
4. Click "Enroll for Free"
5. Access the course and click "Q-Bank"

## 📊 What You'll See

- **50 Questions**: Mix of multiple choice and SATA
- **Sample Tests**: Completed and pending tests
- **Statistics**: Question attempts and performance data
- **Free Enrollment**: No payment required

## 🔧 If Something Goes Wrong

### Can't connect to database
- Check `.env.local` has the correct `DATABASE_URL`
- Test connection: `psql 'your-connection-string'`

### Tables don't exist
- Run: `npx drizzle-kit push` again

### 401 Authentication errors
- Log out and log back in
- Clear browser cookies
- Check `JWT_SECRET` is set in `.env.local`

### Course not showing
- Visit: `http://localhost:3000/api/test/create-nurse-pro`
- Check console logs (F12) for errors
- Visit: `http://localhost:3000/api/debug/courses`

## 🎯 You're Ready!

Once you complete the steps above, the "Nurse Pro" course with full Q-Bank functionality will be available to all students!


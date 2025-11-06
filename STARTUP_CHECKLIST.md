# 🚀 LMS Platform - Startup Checklist

## ✅ Pre-Startup Checks

### 1. Environment Variables
- [x] `.env.local` file exists
- [ ] `JWT_SECRET` is set (minimum 32 characters)
- [ ] `DATABASE_URL` is set (Neon Postgres connection string)
- [ ] `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000`

### 2. Dependencies
- [x] `node_modules` installed (`npm install`)
- [x] All packages installed correctly

### 3. Database
- [ ] Database migrations run (`npx drizzle-kit migrate`)
- [ ] Database connection tested (`/api/test-db`)

## 🔧 Server Startup

1. **Stop any running servers:**
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Wait for server to start** (look for "Ready" message)

## 🧪 Testing After Startup

### Test 1: Server Health
- [ ] Open `http://localhost:3000` - should load homepage
- [ ] Check browser console for errors

### Test 2: Database Connection
- [ ] Open `http://localhost:3000/api/test-db`
- [ ] Should see success message

### Test 3: Registration
- [ ] Go to `http://localhost:3000/register`
- [ ] Fill in form:
  - Name: Test User
  - Email: test@example.com
  - Password: Test1234 (must be 8+ chars with letter and number)
- [ ] Submit form
- [ ] Should see success message or redirect

### Test 4: Login
- [ ] Go to `http://localhost:3000/login`
- [ ] Enter credentials:
  - Email: test@example.com
  - Password: Test1234
- [ ] Click "Sign in"
- [ ] **Should redirect to dashboard** (not stay on login page)
- [ ] Check browser console for:
  - "Attempting login with email: ..."
  - "Login response status: 200"
  - "Login successful, redirecting to: ..."

### Test 5: Cookie Verification
- [ ] After login, check DevTools → Application → Cookies
- [ ] Should see `token` cookie with:
  - Domain: `localhost`
  - Path: `/`
  - HttpOnly: ✓
  - SameSite: `Lax`

### Test 6: Protected Routes
- [ ] Try accessing `/student/dashboard` - should work
- [ ] Try accessing `/admin/students` - should redirect if not admin

## 🐛 Troubleshooting

### Issue: Server won't start
**Check:**
- JWT_SECRET is set and at least 32 characters
- DATABASE_URL is correct (if using Neon)
- Port 3000 is not in use
- No syntax errors in code

### Issue: Login stays on login page
**Check:**
- Browser console for errors
- Network tab - is `/api/auth/login` returning 200?
- Cookies are enabled in browser
- JWT_SECRET is correct

### Issue: "Database connection error"
**Check:**
- DATABASE_URL is correct
- Neon database is accessible
- Migrations have been run
- Test with `/api/test-db`

### Issue: "JWT_SECRET must be set"
**Fix:**
- Add `JWT_SECRET` to `.env.local`
- Must be at least 32 characters
- Restart server after adding

## 📝 Quick Commands

```bash
# Stop server
Get-Process node | Stop-Process -Force

# Start server
npm run dev

# Test database
curl http://localhost:3000/api/test-db

# Run migrations
npx drizzle-kit migrate

# Check environment
node -e "console.log(process.env.JWT_SECRET ? 'JWT_SECRET: Set' : 'JWT_SECRET: Not Set')"
```

## ✅ Success Indicators

When everything is working:
- ✅ Server starts without errors
- ✅ Homepage loads at `http://localhost:3000`
- ✅ Registration creates new user
- ✅ Login redirects to dashboard
- ✅ Cookie is set after login
- ✅ Protected routes are accessible
- ✅ No console errors

## 🎯 Next Steps After Successful Startup

1. Test all features:
   - Course enrollment
   - Payment flow (if Stripe configured)
   - Admin dashboard
   - Student dashboard

2. Check security:
   - Rate limiting works
   - Input validation works
   - Authorization checks work

3. Test face login (if models downloaded):
   - Enroll face in profile
   - Login with face


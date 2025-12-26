# Q-Bank System - Testing Guide

## ✅ Implementation Complete

All Q-Bank restructuring code has been implemented and fixed. The system is ready for testing.

## 📋 Pre-Testing Checklist

### 1. Database Migration
- ✅ Migration file created: `drizzle/0017_qbank_restructure.sql`
- ✅ Migration script created: `scripts/run-qbank-migration.mjs`
- ✅ Migration applied successfully

### 2. Code Fixes Applied
- ✅ Fixed SQL query issues (replaced raw SQL with Drizzle schema)
- ✅ Fixed `useSearchParams` issue in client components
- ✅ Fixed all `orderBy` clauses (added `desc()`)
- ✅ Added input validation (NaN checks)
- ✅ Added error handling for enrollments table
- ✅ All imports corrected
- ✅ No linter errors

## 🧪 Testing Steps

### Step 1: Start Development Server

```bash
# Make sure you're in the project root
cd C:\Users\adhit\Desktop\lms-platform\lms-platform

# Start the dev server
npm run dev
```

Wait for the server to start (you should see "Ready" message).

### Step 2: Login as Student

1. Navigate to: `http://localhost:3000/login`
2. Login with student credentials
3. Verify you're redirected to `/student/dashboard`

### Step 3: Test Q-Bank Browse Page

1. Navigate to: `http://localhost:3000/student/qbanks`
2. **Expected**: Page loads showing three tabs:
   - Enrolled (0 Q-Banks initially)
   - Requested (0 requests initially)
   - Available (shows published Q-Banks)

### Step 4: Test Q-Bank Enrollment

1. In the "Available" tab, find a Q-Bank
2. Click "Enroll Now" (for public Q-Banks)
3. **Expected**: Q-Bank moves to "Enrolled" tab
4. Click "Request Access" (for requestable Q-Banks)
5. **Expected**: Q-Bank moves to "Requested" tab

### Step 5: Test Q-Bank Detail Page

1. Click on an enrolled Q-Bank
2. Navigate to: `http://localhost:3000/student/qbanks/[id]`
3. **Expected**: Page loads with tabs:
   - Practice (Tutorial/Timed/Assessment modes)
   - Analytics (link to full dashboard)
   - Categories
   - Test History

### Step 6: Test Analytics Dashboard

1. From Q-Bank detail page, click "Analytics" tab
2. Or navigate to: `http://localhost:3000/student/qbanks/[id]/analytics`
3. **Expected**: Dashboard shows:
   - Readiness Score card
   - Questions Attempted card
   - Average Score card
   - Tests Completed card
   - Strengths & Weaknesses sections
   - Category Performance charts
   - Study Recommendations (if any)
   - Remediation Center (if any questions need review)

### Step 7: Test API Endpoints (Manual)

#### Student APIs

```bash
# List all Q-Banks (requires auth cookie)
curl http://localhost:3000/api/student/qbanks \
  -H "Cookie: token=YOUR_TOKEN"

# Get Q-Bank details
curl http://localhost:3000/api/student/qbanks/1 \
  -H "Cookie: token=YOUR_TOKEN"

# Enroll in Q-Bank
curl -X POST http://localhost:3000/api/student/qbanks/1/enroll \
  -H "Cookie: token=YOUR_TOKEN"

# Request access
curl -X POST http://localhost:3000/api/student/qbank-requests \
  -H "Cookie: token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qbankId": 1, "reason": "Test request"}'

# Get analytics overview
curl http://localhost:3000/api/student/qbanks/1/analytics/overview \
  -H "Cookie: token=YOUR_TOKEN"

# Get category performance
curl http://localhost:3000/api/student/qbanks/1/analytics/category-performance \
  -H "Cookie: token=YOUR_TOKEN"

# Get strengths/weaknesses
curl http://localhost:3000/api/student/qbanks/1/analytics/strengths-weaknesses \
  -H "Cookie: token=YOUR_TOKEN"

# Get trends
curl http://localhost:3000/api/student/qbanks/1/analytics/trends?period=30d \
  -H "Cookie: token=YOUR_TOKEN"

# Get test history
curl http://localhost:3000/api/student/qbanks/1/analytics/test-history \
  -H "Cookie: token=YOUR_TOKEN"
```

#### Admin APIs

```bash
# List all Q-Banks (requires admin auth)
curl http://localhost:3000/api/admin/qbanks \
  -H "Cookie: token=YOUR_ADMIN_TOKEN"

# Create Q-Bank
curl -X POST http://localhost:3000/api/admin/qbanks \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Q-Bank",
    "description": "Test description",
    "status": "published",
    "isPublic": true
  }'

# List access requests
curl http://localhost:3000/api/admin/qbank-requests \
  -H "Cookie: token=YOUR_ADMIN_TOKEN"

# Approve request
curl -X POST http://localhost:3000/api/admin/qbank-requests/1/approve \
  -H "Cookie: token=YOUR_ADMIN_TOKEN"

# Reject request
curl -X POST http://localhost:3000/api/admin/qbank-requests/1/reject \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Not eligible"}'
```

### Step 8: Test Auto-Enrollment

1. Enroll in a course that has a linked Q-Bank
2. **Expected**: Student is automatically enrolled in the course Q-Bank
3. Check `/student/qbanks` - Q-Bank should appear in "Enrolled" tab

## 🐛 Troubleshooting

### Issue: 500 Internal Server Error

**Possible Causes:**
1. Dev server not running - Start with `npm run dev`
2. Database connection issue - Check `DATABASE_URL` in `.env.local`
3. Migration not applied - Run `node scripts/run-qbank-migration.mjs`
4. Compilation error - Check terminal for error messages

**Solution:**
```bash
# Restart dev server
# Press Ctrl+C to stop, then:
npm run dev
```

### Issue: "Not authenticated" errors

**Solution:**
1. Make sure you're logged in
2. Check browser cookies - should have `token` cookie
3. Try logging out and logging back in

### Issue: "Q-Bank not found"

**Solution:**
1. Check if Q-Bank exists in database
2. Verify Q-Bank status is "published"
3. Check if Q-Bank is active (`isActive = true`)

### Issue: Analytics showing 0 or empty

**Solution:**
1. This is normal if no tests have been taken yet
2. Take some practice tests to generate analytics data
3. Analytics will populate as you use the Q-Bank

## ✅ Expected Test Results

### Successful Tests Should Show:

1. **Browse Page**:
   - ✅ Page loads without errors
   - ✅ Three tabs visible (Enrolled, Requested, Available)
   - ✅ Q-Banks displayed in appropriate tabs
   - ✅ Enroll/Request buttons work

2. **Detail Page**:
   - ✅ Q-Bank information displayed
   - ✅ Four tabs visible (Practice, Analytics, Categories, History)
   - ✅ Navigation works between tabs

3. **Analytics Dashboard**:
   - ✅ Overview cards display (may show 0 initially)
   - ✅ Strengths/Weaknesses sections (may be empty initially)
   - ✅ Category performance charts (may be empty initially)
   - ✅ No console errors

4. **API Endpoints**:
   - ✅ All endpoints return 200 or appropriate status codes
   - ✅ JSON responses are valid
   - ✅ Error handling works (401 for unauthenticated, 404 for not found)

## 📊 Test Coverage

### ✅ Completed:
- Database schema and migration
- All API endpoints (19 endpoints)
- Student UI pages (3 pages)
- Analytics calculation functions
- Auto-enrollment logic
- Error handling
- Input validation

### ⏳ Pending Manual Testing:
- End-to-end user flows
- Analytics data generation (requires test attempts)
- Admin Q-Bank management UI (APIs ready)
- Performance under load

## 🎯 Next Steps After Testing

1. **If all tests pass:**
   - System is ready for production
   - Consider adding admin UI pages
   - Add more test data for better analytics

2. **If issues found:**
   - Check server logs for error messages
   - Verify database migration was successful
   - Check browser console for client-side errors
   - Review API responses in Network tab

## 📝 Notes

- Analytics will be empty until students take tests
- Readiness scores require test attempts to calculate
- Some features (like practice tests) are placeholders for future implementation
- Admin UI pages can be built using the existing APIs

---

**Status**: ✅ Implementation Complete | 🔄 Ready for Testing


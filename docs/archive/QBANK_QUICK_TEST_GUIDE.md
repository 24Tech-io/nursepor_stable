# Q-Bank System - Quick Testing Guide
**Updated: December 16, 2025**

## ✅ Implementation Status: 85% Complete

### What's Ready
- ✅ **Schema Fixed**: All tables properly defined
- ✅ **Seed Data Script**: Creates test Q-Banks and questions
- ✅ **Admin UI**: Q-Bank management and request approval pages
- ✅ **Student UI**: Browse, detail, and analytics pages
- ✅ **API Endpoints**: All 19 endpoints implemented

## 🚀 Quick Start Testing

### Step 1: Ensure Seed Data Exists

If you haven't run the seed script yet:

```bash
node scripts/seed-qbank-data.mjs
```

This creates:
- 6 Categories
- 2 Q-Banks (1 public, 1 private/requestable)
- 60 Questions

**Verify data:**
```bash
node scripts/test-qbank-workflow.mjs
```

### Step 2: Test Student Interface

1. **Login as Student**
   - URL: `http://localhost:3000/login`
   - Use student credentials

2. **Browse Q-Banks**
   - URL: `http://localhost:3000/student/qbanks`
   - **Expected**: 
     - ✅ Page loads without errors
     - ✅ Three tabs visible (Enrolled, Requested, Available)
     - ✅ Q-Banks appear in "Available" tab
     - ✅ Public Q-Bank shows "Enroll Now" button
     - ✅ Private Q-Bank shows "Request Access" button

3. **Test Enrollment**
   - Click "Enroll Now" on public Q-Bank
   - **Expected**:
     - ✅ Q-Bank moves to "Enrolled" tab
     - ✅ No errors in console
     - ✅ Can click on Q-Bank to view details

4. **Test Q-Bank Detail**
   - Click on enrolled Q-Bank
   - **Expected**:
     - ✅ Detail page loads
     - ✅ Four tabs visible (Practice, Analytics, Categories, History)
     - ✅ Q-Bank information displays correctly

5. **Test Analytics Dashboard**
   - Navigate to Analytics tab
   - **Expected**:
     - ✅ Dashboard loads
     - ✅ Readiness Score card (will show 0)
     - ✅ Overview metrics (all 0 - normal, no tests taken)
     - ✅ Strengths & Weaknesses sections (empty - normal)

6. **Test Request Access**
   - Go back to browse page
   - Find private Q-Bank in "Available" tab
   - Click "Request Access"
   - **Expected**:
     - ✅ Q-Bank moves to "Requested" tab
     - ✅ Status shows "Pending"
     - ✅ No errors

### Step 3: Test Admin Interface

1. **Login as Admin**
   - URL: `http://localhost:3000/admin`
   - Use admin credentials

2. **Access Q-Bank Management**
   - From dashboard, click "📚 Q-Banks" card
   - Or navigate to: `http://localhost:3000/admin/qbanks`
   - **Expected**:
     - ✅ Page loads showing all Q-Banks
     - ✅ Stats cards display (Total, Published, Questions, Enrollments)
     - ✅ Q-Bank table shows all Q-Banks with details
     - ✅ Actions available (Edit, Questions, Delete)

3. **Test Request Approval**
   - Click "Manage Access Requests" button
   - Or navigate to: `http://localhost:3000/admin/qbank-requests`
   - **Expected**:
     - ✅ Page loads with filter tabs
     - ✅ Pending requests visible
     - ✅ Student information displayed
     - ✅ Approve/Reject buttons work

4. **Approve a Request**
   - Find a pending request
   - Click "Approve"
   - **Expected**:
     - ✅ Request moves to "Approved" tab
     - ✅ Student can now access Q-Bank
     - ✅ Q-Bank appears in student's "Enrolled" tab

## 🐛 Troubleshooting

### Issue: "Failed to fetch Q-Banks"
**Solution:**
1. Check server is running: `npm run dev`
2. Check browser console for specific error
3. Verify database connection
4. Restart server if needed

### Issue: No Q-Banks Showing
**Solution:**
1. Run seed script: `node scripts/seed-qbank-data.mjs`
2. Verify data exists: `node scripts/test-qbank-workflow.mjs`
3. Check Q-Bank status is "published" and is_active = true

### Issue: Enrollment Not Working
**Solution:**
1. Check browser Network tab for API response
2. Verify Q-Bank is_public = true
3. Check qbank_enrollments table for entry
4. Clear browser cache and retry

### Issue: Admin Pages Not Loading
**Solution:**
1. Verify admin authentication
2. Check adminToken cookie is set
3. Verify user role is "admin"
4. Check API endpoint responses

## 📊 Expected Test Results

### ✅ Successful Test Should Show:

**Student Side:**
- Browse page loads with Q-Banks
- Can enroll in public Q-Banks
- Can request access to private Q-Banks
- Detail page shows all tabs
- Analytics dashboard displays (even if empty)

**Admin Side:**
- Q-Bank list page shows all Q-Banks
- Stats cards display correct numbers
- Request approval page shows pending requests
- Can approve/reject requests successfully

**Database:**
- qbank_enrollments has entries after enrollment
- qbank_access_requests has entries after request
- Data persists after page refresh

## 🎯 What's Still Pending

1. **Practice Test Interface** (Not implemented)
   - Test configuration modal
   - Test-taking interface
   - Results/review page
   - Timer component

2. **Q-Bank Creation/Edit Forms** (Not implemented)
   - Create Q-Bank form
   - Edit Q-Bank form
   - Question management interface

3. **Auto-Enrollment Testing** (Needs manual test)
   - Enroll in course with linked Q-Bank
   - Verify auto-enrollment works

## 📝 Quick Reference

### Seed Data Script
```bash
node scripts/seed-qbank-data.mjs
```

### Test Verification
```bash
node scripts/test-qbank-workflow.mjs
```

### Key URLs
- Student Browse: `http://localhost:3000/student/qbanks`
- Admin Management: `http://localhost:3000/admin/qbanks`
- Admin Requests: `http://localhost:3000/admin/qbank-requests`

### Database Queries
```sql
-- Check Q-Banks
SELECT id, name, status, is_public, is_requestable 
FROM question_banks 
WHERE status = 'published';

-- Check Enrollments
SELECT * FROM qbank_enrollments;

-- Check Requests
SELECT * FROM qbank_access_requests;
```

## ✅ Completion Checklist

- [ ] Seed data created successfully
- [ ] Student browse page loads
- [ ] Can enroll in public Q-Bank
- [ ] Can request access to private Q-Bank
- [ ] Q-Bank detail page works
- [ ] Analytics dashboard loads
- [ ] Admin Q-Bank page loads
- [ ] Admin request page loads
- [ ] Can approve/reject requests
- [ ] All data persists correctly

---

**Status**: ✅ Ready for Testing | 🎯 85% Complete


# Q-Bank Requests Feature - Testing Guide

## Overview
This document provides a comprehensive testing guide for the Q-Bank Requests feature, which allows students to request access to question banks and admins to approve/reject those requests.

## Feature Components

### 1. Student Side
- **Page**: `/student/qbanks/[id]` - Students can request access to Q-Banks
- **API**: 
  - `GET /api/student/qbank-requests` - List student's requests
  - `POST /api/student/qbank-requests` - Create new request

### 2. Admin Side
- **Page**: `/admin/qbank-requests` - Admin dashboard for managing requests
- **API**:
  - `GET /api/admin/qbank-requests` - List all requests (with filters)
  - `POST /api/admin/qbank-requests/[id]/approve` - Approve request
  - `POST /api/admin/qbank-requests/[id]/reject` - Reject request

## Test Scenarios

### Test 1: Student Creates Request
**Steps:**
1. Login as a student
2. Navigate to a Q-Bank page (`/student/qbanks/[id]`)
3. Click "Request Access" button
4. Optionally provide a reason
5. Submit the request

**Expected Results:**
- ✅ Request is created with status "pending"
- ✅ Student sees confirmation message
- ✅ Request appears in student's request list
- ✅ Request appears in admin's pending requests

**API Test:**
```bash
POST /api/student/qbank-requests
{
  "qbankId": 1,
  "reason": "I need access to prepare for my exam"
}
```

### Test 2: Admin Views Requests
**Steps:**
1. Login as admin
2. Navigate to `/admin/qbank-requests`
3. View the requests list

**Expected Results:**
- ✅ All requests are displayed
- ✅ Filter tabs work (All, Pending, Approved, Rejected)
- ✅ Request details are shown correctly:
  - Student name and email
  - Q-Bank name
  - Request reason (if provided)
  - Request date
  - Status badge

**API Test:**
```bash
GET /api/admin/qbank-requests?status=pending
GET /api/admin/qbank-requests?status=all
```

### Test 3: Admin Approves Request
**Steps:**
1. Admin views pending requests
2. Click "Approve" button on a pending request
3. Confirm the action

**Expected Results:**
- ✅ Request status changes to "approved"
- ✅ Q-Bank enrollment is created for the student
- ✅ Request is removed from pending list
- ✅ Student can now access the Q-Bank
- ✅ If student already enrolled, request is just marked approved

**API Test:**
```bash
POST /api/admin/qbank-requests/1/approve
```

**Database Checks:**
- `qbank_access_requests.status` = 'approved'
- `qbank_enrollments` has new record for student + qbank
- `qbank_access_requests.reviewedAt` is set
- `qbank_access_requests.reviewedBy` is set to admin ID

### Test 4: Admin Rejects Request
**Steps:**
1. Admin views pending requests
2. Click "Reject" button on a pending request
3. Optionally provide rejection reason
4. Confirm the action

**Expected Results:**
- ✅ Request status changes to "rejected"
- ✅ Rejection reason is saved (if provided)
- ✅ Request is removed from pending list
- ✅ Student does NOT get enrollment
- ✅ Student can see rejection status in their requests

**API Test:**
```bash
POST /api/admin/qbank-requests/1/reject
{
  "reason": "Insufficient prerequisites"
}
```

**Database Checks:**
- `qbank_access_requests.status` = 'rejected'
- `qbank_access_requests.rejectionReason` is set (if provided)
- `qbank_access_requests.reviewedAt` is set
- `qbank_access_requests.reviewedBy` is set to admin ID
- NO enrollment is created

### Test 5: Edge Cases

#### 5.1 Duplicate Request Prevention
**Test:**
- Student tries to create a second request for the same Q-Bank while first is pending

**Expected:**
- ✅ Error: "Request already pending"
- ✅ Only one pending request exists

#### 5.2 Request for Already Enrolled Q-Bank
**Test:**
- Student already enrolled tries to request access again

**Expected:**
- ✅ Error: "Already enrolled in this Q-Bank"
- ✅ Request is not created

#### 5.3 Approve Already Approved Request
**Test:**
- Admin tries to approve a request that's already approved

**Expected:**
- ✅ Error: "Request is not pending"
- ✅ No duplicate enrollment created

#### 5.4 Reject Already Rejected Request
**Test:**
- Admin tries to reject a request that's already rejected

**Expected:**
- ✅ Error: "Request is not pending"
- ✅ No changes made

#### 5.5 Approve Request for Already Enrolled Student
**Test:**
- Student is already enrolled, but request still exists
- Admin approves the request

**Expected:**
- ✅ Request is marked as approved
- ✅ No duplicate enrollment created
- ✅ Message: "Request approved (already enrolled)"

## Data Flow

```
Student Request Flow:
1. Student → POST /api/student/qbank-requests
2. Creates record in qbank_access_requests (status: 'pending')
3. Admin sees request in dashboard

Admin Approval Flow:
1. Admin → POST /api/admin/qbank-requests/[id]/approve
2. Checks if enrollment exists
3. If not, creates qbank_enrollments record
4. Updates qbank_access_requests (status: 'approved')
5. Student can now access Q-Bank

Admin Rejection Flow:
1. Admin → POST /api/admin/qbank-requests/[id]/reject
2. Updates qbank_access_requests (status: 'rejected', rejectionReason)
3. NO enrollment created
4. Student sees rejection status
```

## API Response Formats

### GET /api/admin/qbank-requests
```json
{
  "requests": [
    {
      "id": 1,
      "studentId": 5,
      "studentName": "John Doe",
      "studentEmail": "john@example.com",
      "qbankId": 1,
      "qbankName": "NCLEX-RN Practice Questions",
      "reason": "Need access for exam preparation",
      "status": "pending",
      "requestedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/admin/qbank-requests/[id]/approve
```json
{
  "message": "Request approved and enrollment created",
  "enrollment": {
    "id": 1,
    "studentId": 5,
    "qbankId": 1,
    "enrolledAt": "2024-01-15T11:00:00.000Z",
    "progress": 0
  }
}
```

### POST /api/admin/qbank-requests/[id]/reject
```json
{
  "message": "Request rejected successfully"
}
```

## Frontend Testing Checklist

- [ ] Page loads without errors
- [ ] Loading spinner shows while fetching
- [ ] Empty state displays when no requests
- [ ] Filter tabs work correctly
- [ ] Request cards display all information
- [ ] Status badges show correct colors
- [ ] Approve button works and refreshes list
- [ ] Reject button works and refreshes list
- [ ] Error messages display on failure
- [ ] Date formatting is correct
- [ ] Responsive design works on mobile

## Known Issues & Fixes

### ✅ Fixed Issues:
1. **API Response Format**: Fixed nested object structure to flat structure
2. **Variable Naming**: Fixed `request` variable shadowing in approve/reject routes
3. **Date Formatting**: Added proper ISO string conversion for `requestedAt`

### ⚠️ Potential Improvements:
1. **Transactions**: Consider adding database transactions for approve/reject operations
2. **Notifications**: Add email/notification system for request status changes
3. **Bulk Actions**: Add ability to approve/reject multiple requests at once
4. **Search/Filter**: Add search by student name or Q-Bank name
5. **Pagination**: Add pagination for large request lists

## Running Automated Tests

```bash
# Run the test script (requires server to be running)
node scripts/test-qbank-requests.mjs
```

## Manual Testing Steps

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create test data:**
   - Ensure you have at least one Q-Bank in the database
   - Ensure you have student and admin accounts

3. **Test as Student:**
   - Login at `http://localhost:3000/login`
   - Navigate to a Q-Bank
   - Create a request

4. **Test as Admin:**
   - Login at `http://localhost:3000/admin/login`
   - Navigate to `/admin/qbank-requests`
   - Approve or reject the request

5. **Verify Results:**
   - Check database tables
   - Verify student can access Q-Bank after approval
   - Verify student sees rejection status

## Database Schema Reference

### qbank_access_requests
- `id` (serial, PK)
- `student_id` (integer, FK → users.id)
- `qbank_id` (integer, FK → question_banks.id)
- `reason` (text, nullable)
- `status` (text: 'pending' | 'approved' | 'rejected')
- `requested_at` (timestamp)
- `reviewed_at` (timestamp, nullable)
- `reviewed_by` (integer, FK → users.id, nullable)
- `rejection_reason` (text, nullable)

### qbank_enrollments
- `id` (serial, PK)
- `student_id` (integer, FK → users.id)
- `qbank_id` (integer, FK → question_banks.id)
- `enrolled_at` (timestamp)
- `progress` (integer)
- ... (other progress fields)

## Success Criteria

✅ All API endpoints return correct status codes
✅ Data is correctly transformed and displayed
✅ Approve creates enrollment and updates request
✅ Reject updates request without creating enrollment
✅ Duplicate requests are prevented
✅ Edge cases are handled gracefully
✅ Frontend displays all information correctly
✅ Filtering and status management works
✅ No console errors or warnings


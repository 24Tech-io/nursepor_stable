# Data Flow Diagrams

This document details all critical data flows in the LMS platform.

---

## 1. Enrollment Flow

### 1.1 Request-Based Enrollment (Locked Course)

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ 1. POST /api/student/requests
       │    { courseId, reason }
       ▼
┌─────────────────────────┐
│  accessRequests Table   │
│  status: 'pending'      │
└──────┬──────────────────┘
       │
       │ 2. Shows in Admin Request List
       ▼
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ 3. PATCH /api/admin/requests/[id]
       │    { action: 'approve' }
       ▼
┌─────────────────────────┐
│ syncEnrollmentAfterApproval()
│ - Checks/Creates studentProgress
│ - Checks/Creates enrollments
│ - Handles race conditions
└──────┬──────────────────┘
       │
       │ 4. DELETE accessRequests
       │    (request fulfilled)
       ▼
┌─────────────────────────┐
│ studentProgress Table   │
│ enrollments Table       │
│ Both created/updated    │
└──────┬──────────────────┘
       │
       │ 5. Sync Client Poll
       │    /api/sync/connection
       ▼
┌─────────────┐
│   Student   │
│  Dashboard  │
│ Auto-refresh│
└─────────────┘
```

**Sync Points**:
- ✅ Request approval triggers enrollment sync
- ✅ Request deleted after enrollment
- ✅ Student view auto-refreshes
- ❌ Admin view does NOT auto-refresh

---

### 1.2 Direct Enrollment (Public Course)

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ 1. POST /api/student/enroll
       │    { courseId }
       ▼
┌─────────────────────────┐
│ Check for pending request│
│ Check if already enrolled│
└──────┬──────────────────┘
       │
       │ 2. Create Enrollment
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ - Insert new record     │
│ - totalProgress: 0      │
│                         │
│ enrollments             │
│ - Insert new record     │
│ - status: 'active'      │
│ - progress: 0           │
└──────┬──────────────────┘
       │
       │ 3. DELETE/REJECT pending request
       │    (if exists)
       ▼
┌─────────────────────────┐
│ accessRequests          │
│ - Delete or reject      │
└─────────────────────────┘
```

**Sync Points**:
- ✅ Both tables created simultaneously
- ✅ Pending requests handled
- ⚠️ No transaction wrapper (risk of partial failure)

---

### 1.3 Admin Direct Enrollment

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ POST /api/enrollment
       │ { studentId, courseId }
       ▼
┌─────────────────────────┐
│ Check pending request   │
└──────┬──────────────────┘
       │
       │ DELETE pending request
       │ (if exists)
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ enrollments             │
│ Both created            │
└─────────────────────────┘
```

**Sync Points**:
- ✅ Both tables created
- ✅ Pending request deleted
- ❌ No sync notification to student

---

### 1.4 Payment-Based Enrollment

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ 1. POST /api/payments/create-checkout
       ▼
┌─────────────────────────┐
│   Stripe Checkout       │
└──────┬──────────────────┘
       │
       │ 2. Payment Success
       ▼
┌─────────────────────────┐
│ Stripe Webhook          │
│ POST /api/payments/webhook│
│ Event: checkout.session.│
│       completed         │
└──────┬──────────────────┘
       │
       │ 3. Update Payment Status
       ▼
┌─────────────────────────┐
│ payments Table          │
│ status: 'completed'     │
└──────┬──────────────────┘
       │
       │ 4. Create Enrollment
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ enrollments             │
│ Both created            │
└─────────────────────────┘
```

**Sync Points**:
- ✅ Both tables created on payment
- ⚠️ No sync notification

---

## 2. Progress Update Flow

### 2.1 Chapter Completion

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ POST /api/student/chapters/complete
       │ { chapterId, courseId }
       ▼
┌─────────────────────────┐
│ Get/Create studentProgress│
└──────┬──────────────────┘
       │
       │ Update Progress
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ - completedChapters:    │
│   JSON array updated    │
│ - watchedVideos:        │
│   JSON array updated    │
│   (if video type)       │
│ - totalProgress:        │
│   Recalculated          │
└──────┬──────────────────┘
       │
       │ ⚠️ MISSING: Should also update
       │    enrollments.progress
       ▼
┌─────────────────────────┐
│ enrollments Table       │
│ ❌ progress NOT updated │
└─────────────────────────┘
```

**Issues**:
- ❌ `enrollments.progress` not synced
- ❌ No transaction wrapper
- ✅ `totalProgress` calculated correctly

---

### 2.2 Video Progress Tracking

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ POST /api/student/video-progress
       │ { chapterId, currentTime, duration }
       ▼
┌─────────────────────────┐
│ videoProgress Table     │
│ - currentTime updated   │
│ - watchedPercentage     │
│ - completed (if >=90%)  │
└──────┬──────────────────┘
       │
       │ ⚠️ MISSING: Should sync to
       │    studentProgress.watchedVideos
       │    AND update totalProgress
       │    if video completed
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ ❌ watchedVideos NOT    │
│    updated              │
│ ❌ totalProgress NOT    │
│    updated              │
└─────────────────────────┘
```

**Issues**:
- ❌ `videoProgress` isolated, not syncing to `studentProgress`
- ❌ Video completion doesn't update overall progress
- ❌ No link between detailed video tracking and course progress

---

### 2.3 Quiz Completion

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ POST /api/student/quizzes/[quizId]/submit
       │ { answers, timeTaken }
       ▼
┌─────────────────────────┐
│ Calculate Score         │
│ Check Pass Mark         │
└──────┬──────────────────┘
       │
       │ Save Attempt
       ▼
┌─────────────────────────┐
│ quizAttempts Table      │
│ - score, passed, etc    │
└──────┬──────────────────┘
       │
       │ ⚠️ MISSING: Should update
       │    studentProgress.quizAttempts
       │    AND recalculate totalProgress
       │    AND update enrollments.progress
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ ❌ quizAttempts NOT     │
│    updated              │
│ ❌ totalProgress NOT    │
│    recalculated         │
└─────────────────────────┘
┌─────────────────────────┐
│ enrollments             │
│ ❌ progress NOT updated │
└─────────────────────────┘
```

**Issues**:
- ❌ Quiz attempts isolated
- ❌ No progress recalculation
- ❌ No sync to `enrollments`

---

## 3. Request Management Flow

### 3.1 Request Creation

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ POST /api/student/requests
       │ { courseId, reason }
       ▼
┌─────────────────────────┐
│ Validate:               │
│ - Course exists         │
│ - Not already enrolled  │
│ - Not duplicate request │
└──────┬──────────────────┘
       │
       │ Create Request
       ▼
┌─────────────────────────┐
│ accessRequests          │
│ status: 'pending'       │
└──────┬──────────────────┘
       │
       │ 2. Show in Admin Panel
       ▼
┌─────────────┐
│ Admin       │
│ Request List│
└─────────────┘
```

**Sync Points**:
- ✅ Request appears in admin list
- ✅ Student sees in "Requested Courses"
- ✅ Prevents duplicates

---

### 3.2 Request Rejection

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ PATCH /api/admin/requests/[id]
       │ { action: 'reject' }
       ▼
┌─────────────────────────┐
│ accessRequests          │
│ - status: 'rejected'    │
│ - reviewedAt: now()     │
│ - reviewedBy: adminId   │
└──────┬──────────────────┘
       │
       │ Notification (if implemented)
       ▼
┌─────────────┐
│   Student   │
│ Notification│
└─────────────┘
```

---

## 4. Q-Bank Test Flow

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ 1. Create Test
       │ POST /api/qbank/[courseId]/tests
       ▼
┌─────────────────────────┐
│ qbankTests Table        │
│ status: 'pending'       │
└──────┬──────────────────┘
       │
       │ 2. Start Test
       │ Update status: 'in_progress'
       ▼
┌─────────────────────────┐
│ Student Takes Test      │
│ Answers Questions       │
└──────┬──────────────────┘
       │
       │ 3. Submit Each Question
       │ POST /api/qbank/[courseId]/questions
       │ (or bulk submit)
       ▼
┌─────────────────────────┐
│ qbankQuestionAttempts   │
│ - One per question      │
│ - isCorrect, points, etc│
└──────┬──────────────────┘
       │
       │ 4. Complete Test
       ▼
┌─────────────────────────┐
│ qbankTests              │
│ - status: 'completed'   │
│ - score, percentage     │
└──────┬──────────────────┘
       │
       │ 5. Update Statistics
       │ ⚠️ Should aggregate
       ▼
┌─────────────────────────┐
│ qbankQuestionStatistics │
│ - timesAttempted++      │
│ - timesCorrect++ (if yes)│
│ - confidenceLevel       │
└─────────────────────────┘
       │
       │ ⚠️ MISSING: Should update
       │    overall course progress
       ▼
┌─────────────────────────┐
│ studentProgress         │
│ ❌ totalProgress NOT    │
│    updated              │
└─────────────────────────┘
```

**Issues**:
- ⚠️ Statistics aggregation unclear
- ❌ No link to overall course progress
- ❌ No certificate generation trigger

---

## 5. Cross-App Sync Flow

### 5.1 Admin Action → Student View

```
┌─────────────┐
│ Admin App   │
│ (Port 3001) │
└──────┬──────┘
       │
       │ 1. Approve Request
       │    Create Enrollment
       ▼
┌─────────────────────────┐
│ Database (PostgreSQL)   │
│ - enrollments updated   │
│ - studentProgress updated│
└──────┬──────────────────┘
       │
       │ 2. Sync Client Poll
       │    (Every 15 seconds)
       ▼
┌─────────────┐
│ Student App │
│ (Port 3000) │
│ Sync Client │
└──────┬──────┘
       │
       │ 3. Auto-refresh UI
       ▼
┌─────────────┐
│ Student     │
│ Dashboard   │
│ (Updated)   │
└─────────────┘
```

**Current Status**:
- ✅ Student sync client works
- ❌ Admin sync client not implemented
- ⚠️ 15-second delay

---

### 5.2 Student Action → Admin View

```
┌─────────────┐
│ Student     │
│ Completes   │
│ Chapter     │
└──────┬──────┘
       │
       │ 1. Update Progress
       ▼
┌─────────────────────────┐
│ Database                │
│ studentProgress updated │
└──────┬──────────────────┘
       │
       │ ⚠️ Admin Sync Client
       │    NOT Implemented
       ▼
┌─────────────┐
│ Admin       │
│ Analytics   │
│ ❌ Stale    │
└─────────────┘
```

**Issues**:
- ❌ Admin analytics don't auto-refresh
- ❌ Real-time updates not visible to admin
- ⚠️ Must manually refresh

---

## 6. Certificate Generation Flow

```
┌─────────────┐
│ Progress    │
│ Tracking    │
└──────┬──────┘
       │
       │ 1. Check if progress = 100%
       │ ⚠️ NOT AUTOMATED
       ▼
┌─────────────────────────┐
│ Manual Trigger          │
│ OR Scheduled Check      │
└──────┬──────────────────┘
       │
       │ 2. Generate Certificate
       ▼
┌─────────────────────────┐
│ certificates Table      │
│ - certificateNumber     │
│ - pdfUrl (generated)    │
└──────┬──────────────────┘
       │
       │ 3. Update enrollments
       │    status: 'completed'
       ▼
┌─────────────────────────┐
│ enrollments             │
│ status: 'completed'     │
│ completedAt: now()      │
└─────────────────────────┘
       │
       │ 4. Send Notification
       │ ⚠️ NOT IMPLEMENTED
       ▼
┌─────────────┐
│ Student     │
│ Notification│
└─────────────┘
```

**Issues**:
- ❌ Certificate generation not automatic
- ❌ No completion detection
- ❌ No notification system

---

## 7. Status Normalization Flow

```
┌─────────────────────────┐
│ Course Status Values    │
│ - 'draft'               │
│ - 'published' (lower)   │
│ - 'Published' (capital) │
│ - 'active' (lower)      │
│ - 'Active' (capital)    │
└──────┬──────────────────┘
       │
       │ ⚠️ Inconsistent
       ▼
┌─────────────────────────┐
│ API Endpoints           │
│ Some: Case-sensitive    │
│ Some: Case-insensitive  │
│ (Fixed in some places)  │
└──────┬──────────────────┘
       │
       │ Should Normalize
       ▼
┌─────────────────────────┐
│ Standard Values:        │
│ - 'draft'               │
│ - 'published'           │
│ - 'active'              │
└─────────────────────────┘
```

**Solution**:
- Use case-insensitive checks everywhere
- Normalize on save (always lowercase)
- Update existing records

---

## Summary of Critical Flows

### ✅ Working Flows
1. Request → Approval → Enrollment (with sync)
2. Payment → Enrollment (dual-table)
3. Direct enrollment (dual-table)
4. Student sync client (auto-refresh)

### ❌ Broken/Missing Flows
1. Progress updates → `enrollments.progress` sync
2. Video progress → `studentProgress` sync
3. Quiz attempts → `studentProgress` sync
4. Admin sync client (not implemented)
5. Certificate auto-generation
6. Q-Bank → Overall progress sync
7. Transaction support for dual-table operations


# Complete LMS Platform Project Mapping

## Executive Summary
This document provides a comprehensive mapping of the entire LMS platform, including all database tables, API endpoints, frontend pages, data flows, and synchronization points.

---

## 1. DATABASE SCHEMA MAPPING (35 Tables)

### 1.1 Core User & Authentication Tables

#### `users`
- **Purpose**: User accounts (students and admins)
- **Key Fields**: id, email, password, role, isActive, faceIdEnrolled, fingerprintEnrolled
- **Relationships**:
  - One-to-Many: accessRequests (as student)
  - One-to-Many: studentProgress
  - One-to-Many: enrollments
  - One-to-Many: notifications
  - One-to-Many: sessions
  - One-to-Many: payments
  - One-to-Many: courseReviews
  - One-to-Many: certificates
  - One-to-Many: videoProgress
  - One-to-Many: qbankTests
  - One-to-Many: quizAttempts
- **Unique Constraints**: (email, role) - allows same email for student and admin
- **Sync Requirements**: lastLogin must sync, profilePicture changes must reflect everywhere

#### `sessions`
- **Purpose**: Session management for authentication
- **Relationships**: Many-to-One: users
- **Sync Requirements**: Session invalidation must sync across all devices

---

### 1.2 Course Structure Tables

#### `courses`
- **Purpose**: Course definitions
- **Key Fields**: id, title, status, isRequestable, isDefaultUnlocked, isPublic
- **Status Values**: 'draft', 'published', 'active', 'Published', 'Active' (case inconsistency!)
- **Relationships**:
  - One-to-Many: modules
  - One-to-Many: accessRequests
  - One-to-Many: studentProgress
  - One-to-Many: enrollments (via enrollments table)
  - One-to-Many: payments
  - One-to-Many: courseReviews
  - One-to-Many: certificates
  - One-to-Many: questionBanks
- **Sync Requirements**: Status changes must sync, course deletions must cascade properly

#### `modules`
- **Purpose**: Course modules (containers for chapters)
- **Relationships**: Many-to-One: courses, One-to-Many: chapters
- **Sync Requirements**: Order changes, publish status changes

#### `chapters`
- **Purpose**: Individual learning content units (video, text, quiz)
- **Key Fields**: type, order, isPublished, prerequisiteChapterId
- **Relationships**: Many-to-One: modules, Self-referential: prerequisiteChapterId
- **Sync Requirements**: Prerequisites must be respected, publish status sync

---

### 1.3 Enrollment & Progress Tables (CRITICAL SYNC POINTS)

#### `studentProgress` (Legacy Table)
- **Purpose**: Legacy enrollment and progress tracking
- **Key Fields**: studentId, courseId, completedChapters (JSON), watchedVideos (JSON), quizAttempts (JSON), totalProgress
- **Unique Constraint**: (studentId, courseId)
- **Relationships**: Many-to-One: users, courses
- **Sync Requirements**: 
  - MUST stay in sync with `enrollments` table
  - totalProgress must sync with videoProgress and quizAttempts
  - completedChapters JSON must be accurate

#### `enrollments` (New Source of Truth)
- **Purpose**: Modern enrollment tracking
- **Key Fields**: userId, courseId, status, progress
- **Status Values**: 'active', 'completed', 'cancelled'
- **Unique Constraint**: (userId, courseId)
- **Relationships**: Many-to-One: users, courses
- **Sync Requirements**:
  - MUST stay in sync with `studentProgress` table
  - progress must match studentProgress.totalProgress
  - status changes must sync

#### `accessRequests`
- **Purpose**: Course access request management
- **Key Fields**: studentId, courseId, status, requestedAt, reviewedAt, reviewedBy
- **Status Values**: 'pending', 'approved', 'rejected'
- **Relationships**: Many-to-One: users (student), users (reviewer), courses
- **Sync Requirements**:
  - MUST be deleted when enrollment is created
  - Status changes must sync across admin and student views
  - Approval must trigger enrollment sync

---

### 1.4 Progress Tracking Tables

#### `videoProgress`
- **Purpose**: Detailed video watching progress
- **Key Fields**: userId, chapterId, currentTime, duration, watchedPercentage, completed
- **Unique Constraint**: (userId, chapterId)
- **Relationships**: Many-to-One: users, chapters
- **Sync Requirements**:
  - MUST sync with studentProgress.watchedVideos
  - Completion must update studentProgress.totalProgress
  - Current time must persist across sessions

#### `quizAttempts`
- **Purpose**: Course quiz attempt tracking (separate from Q-Bank)
- **Key Fields**: userId, chapterId, score, passed, attemptedAt
- **Relationships**: Many-to-One: users, chapters
- **Sync Requirements**:
  - MUST sync with studentProgress.quizAttempts
  - Pass status must update progress
  - Score tracking for analytics

---

### 1.5 Q-Bank Tables

#### `questionBanks`
- **Purpose**: Q-Bank containers linked to courses
- **Relationships**: Many-to-One: courses, One-to-Many: qbankQuestions, qbankTests

#### `qbankQuestions`
- **Purpose**: Individual Q-Bank questions
- **Key Fields**: questionType, testType, difficulty, points

#### `qbankTests`
- **Purpose**: Q-Bank test sessions
- **Key Fields**: userId, questionBankId, status, score, percentage
- **Status Values**: 'pending', 'in_progress', 'completed', 'abandoned'
- **Sync Requirements**: Status changes, score updates must sync

#### `qbankQuestionAttempts`
- **Purpose**: Individual question attempts within tests
- **Sync Requirements**: Must aggregate to qbankQuestionStatistics

#### `qbankQuestionStatistics`
- **Purpose**: Aggregated question performance per user
- **Unique Constraint**: (userId, questionId)
- **Sync Requirements**: Must stay in sync with qbankQuestionAttempts

---

### 1.6 Content & Learning Tables

#### `quizzes`
- **Purpose**: Course chapter quizzes (not Q-Bank)
- **Relationships**: Many-to-One: chapters, One-to-Many: quizQuestions

#### `quizQuestions`
- **Purpose**: Questions within course quizzes

#### `dailyVideos`
- **Purpose**: Daily featured video content
- **Relationships**: Many-to-One: chapters

#### `dailyVideoSettings`
- **Purpose**: Configuration for daily video system
- **Relationships**: Many-to-One: courses (optional)

---

### 1.7 Social & Engagement Tables

#### `courseReviews`
- **Purpose**: Course reviews and ratings
- **Unique Constraint**: (userId, courseId)
- **Sync Requirements**: Rating averages must recalculate

#### `courseQuestions` & `courseAnswers`
- **Purpose**: Q&A system for courses
- **Sync Requirements**: Question/answer counts must sync

#### `courseAnnouncements`
- **Purpose**: Course-wide announcements
- **Sync Requirements**: New announcements must notify enrolled students

#### `courseNotes`
- **Purpose**: Timestamped notes on videos
- **Relationships**: Many-to-One: users, chapters

#### `courseBookmarks`
- **Purpose**: Video bookmarks with timestamps
- **Relationships**: Many-to-One: users, chapters

#### `wishlist`
- **Purpose**: Course wishlist/favorites
- **Unique Constraint**: (userId, courseId)

---

### 1.8 Payment & Commerce Tables

#### `payments`
- **Purpose**: Payment transactions
- **Key Fields**: userId, courseId, status, stripeSessionId
- **Status Values**: 'pending', 'completed', 'failed', 'refunded'
- **Sync Requirements**:
  - Payment completion MUST create enrollment entries
  - Must sync with both studentProgress and enrollments

#### `coupons` & `couponUsage`
- **Purpose**: Discount code management
- **Sync Requirements**: Usage count must stay accurate

---

### 1.9 Certification & Achievement Tables

#### `certificates`
- **Purpose**: Course completion certificates
- **Unique Constraint**: (userId, courseId)
- **Sync Requirements**: Must generate when progress reaches 100%

---

### 1.10 System Tables

#### `notifications`
- **Purpose**: User notifications
- **Sync Requirements**: Must sync across all user sessions

#### `blogPosts`
- **Purpose**: Blog content and announcements

#### `nursingCandidateForms`
- **Purpose**: NCLEX registration forms (specialized feature)

---

## 2. API ENDPOINT MAPPING (161 Endpoints)

### 2.1 Authentication APIs (18 endpoints)

#### Student App (`src/app/api/auth/`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/face-enroll` - Face ID enrollment
- `POST /api/auth/face-login` - Face ID login
- `POST /api/auth/fingerprint-enroll` - Fingerprint enrollment
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/switch-role` - Switch between student/admin
- `GET /api/auth/get-roles` - Get available roles
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/sessions` - List sessions
- `DELETE /api/auth/sessions/[sessionId]` - Revoke session

#### Admin App (`admin-app/src/app/api/auth/`)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Admin registration
- `GET /api/auth/me` - Get admin user
- `POST /api/auth/logout` - Admin logout
- `POST /api/auth/face-enroll` - Admin face enrollment
- `POST /api/auth/face-login` - Admin face login

**Sync Requirements**: Login/logout must sync sessions, role switches must update permissions

---

### 2.2 Student APIs (27 endpoints)

#### Course Management
- `GET /api/student/courses` - List all courses with enrollment status
  - **Data Sources**: courses, studentProgress, enrollments, payments, accessRequests
  - **Sync Points**: Enrollment status, pending requests
  - **Issues**: ✅ Has sync logic, ⚠️ Status filtering partially fixed

- `GET /api/student/enrolled-courses` - Get enrolled courses
  - **Data Sources**: studentProgress, courses, accessRequests
  - **Sync Points**: Approved request sync, pending request filtering
  - **Issues**: ✅ Has approved request sync

- `GET /api/student/courses/[courseId]` - Get course details
  - **Data Sources**: courses, modules, chapters
  - **Sync Points**: Course status, publish status

- `GET /api/student/courses/[courseId]/modules` - Get course modules
  - **Data Sources**: modules, chapters
  - **Sync Points**: Module/chapter publish status

- `POST /api/student/enroll` - Direct enrollment (public courses)
  - **Write Operations**: studentProgress, enrollments, accessRequests (delete)
  - **Sync Requirements**: ✅ Fixed - now creates in both tables, deletes requests

- `POST /api/student/enroll-free` - Free enrollment
  - **Write Operations**: studentProgress, enrollments

#### Progress Tracking
- `GET /api/student/progress` - Get progress summary
  - **Data Sources**: studentProgress, courses, accessRequests
  - **Sync Points**: Must exclude pending requests

- `GET /api/student/progress-details` - Get detailed progress
  - **Data Sources**: studentProgress, enrollments, courses, accessRequests
  - **Sync Points**: ✅ Fixed - has approved request sync, status filtering fixed

- `POST /api/student/chapters/complete` - Mark chapter complete
  - **Write Operations**: studentProgress (update totalProgress)
  - **Sync Requirements**: ⚠️ Must sync with enrollments.progress, videoProgress

- `GET /api/student/video-progress` - Get video progress
  - **Data Sources**: videoProgress
  - **Sync Requirements**: Must sync with studentProgress

- `POST /api/student/video-progress` - Update video progress
  - **Write Operations**: videoProgress
  - **Sync Requirements**: ⚠️ Should update studentProgress.watchedVideos

#### Requests
- `GET /api/student/requests` - Get student's requests
  - **Data Sources**: accessRequests, courses
  - **Sync Points**: Status changes, course deletions

- `POST /api/student/requests` - Create access request
  - **Write Operations**: accessRequests
  - **Sync Requirements**: ⚠️ Must check for existing enrollment in both tables

#### Quizzes
- `GET /api/student/quizzes/[quizId]` - Get quiz
- `POST /api/student/quizzes/[quizId]/submit` - Submit quiz
  - **Write Operations**: quizAttempts, studentProgress
  - **Sync Requirements**: ⚠️ Must update studentProgress.quizAttempts

- `GET /api/student/quizzes/chapter/[chapterId]` - Get chapter quiz
- `GET /api/student/quiz-history` - Get quiz history

#### Stats & Analytics
- `GET /api/student/stats` - Get student statistics
  - **Data Sources**: studentProgress, courses, accessRequests, users
  - **Sync Points**: ✅ Fixed - status filtering, pending request exclusion

- `GET /api/student/continue-learning` - Get continue learning suggestions

#### Daily Videos
- `GET /api/student/daily-video` - Get today's daily video

---

### 2.3 Admin APIs (45+ endpoints)

#### Student Management
- `GET /api/students` - List all students
  - **Data Sources**: users, studentProgress, courses, accessRequests
  - **Sync Points**: ✅ Fixed - status filtering, enrollment counts

- `GET /api/students/[id]` - Get student details
  - **Data Sources**: users, studentProgress, courses, accessRequests
  - **Sync Points**: ✅ Fixed - progress defaults to 0

- `GET /api/students/[id]/courses` - Get student courses
- `POST /api/students/[id]/toggle-active` - Toggle student active status
- `POST /api/students/[id]/reset-face` - Reset face ID
- `GET /api/students/[id]/activities` - Get student activities

#### Enrollment Management
- `GET /api/enrollment` - Get enrollment status (admin)
  - **Data Sources**: courses, studentProgress, accessRequests
  - **Sync Points**: Enrollment status, pending requests

- `POST /api/enrollment` - Direct enrollment (admin)
  - **Write Operations**: ✅ Fixed - now creates in both studentProgress and enrollments, deletes requests

- `DELETE /api/enrollment` - Unenroll student
  - **Write Operations**: ✅ Fixed - now deletes from both tables

#### Request Management
- `GET /api/requests` - Get all pending requests (admin)
  - **Data Sources**: accessRequests, users, courses, studentProgress
  - **Sync Points**: ✅ Fixed - enrollment cleanup, innerJoin, orphaned request deletion

- `PATCH /api/admin/requests/[id]` - Approve/deny request
  - **Write Operations**: accessRequests (update status), studentProgress, enrollments (via sync)
  - **Sync Points**: ✅ Has syncEnrollmentAfterApproval, deletes request

- `POST /api/admin/requests` - Create request (legacy)

#### Course Management
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `GET /api/courses/[courseId]` - Get course
- `PUT /api/courses/[courseId]` - Update course
- `DELETE /api/courses/[courseId]` - Delete course
- `POST /api/courses/publish-all` - Publish all courses

#### Analytics & Reports
- `GET /api/admin/reports/students` - Student reports
- `GET /api/admin/reports/enrollment` - Enrollment reports
- `GET /api/admin/reports/engagement` - Engagement reports
- `GET /api/admin/reports/export` - Export reports

**Sync Requirements**: Analytics must reflect real-time data, aggregate correctly

---

### 2.4 Q-Bank APIs (12 endpoints)

- `GET /api/qbank` - List question banks
- `GET /api/qbank/[courseId]` - Get question bank for course
- `POST /api/qbank/[courseId]/ensure` - Ensure question bank exists
- `GET /api/qbank/[courseId]/questions` - Get questions
- `GET /api/qbank/[courseId]/tests` - Get tests
- `POST /api/qbank/[courseId]/tests` - Create test
- `GET /api/qbank/[courseId]/statistics` - Get statistics
- `GET /api/qbank/[courseId]/remediation` - Get remediation data

**Sync Requirements**: Test completion must update statistics, statistics must sync with overall progress

---

### 2.5 Payment APIs (3 endpoints)

- `POST /api/payments/create-checkout` - Create Stripe checkout
- `GET /api/payments/verify` - Verify payment
- `POST /api/payments/webhook` - Stripe webhook
  - **Write Operations**: ✅ Fixed - now creates in both studentProgress and enrollments
  - **Sync Requirements**: Payment completion must create enrollments immediately

---

### 2.6 Sync APIs (8 endpoints)

- `GET /api/sync/connection` - Real-time sync connection
  - **Sync Points**: ✅ Fixed - status filtering
- `GET /api/sync/health` - Health check
- `GET /api/sync/validate` - Data validation
- `POST /api/sync/auto-fix` - Auto-fix inconsistencies
- `GET /api/sync/check` - Sync check
- `POST /api/sync/fix` - Manual fix

---

## 3. FRONTEND PAGE MAPPING (46 Pages)

### 3.1 Student Pages (15 pages)

#### Dashboard & Navigation
- `src/app/student/dashboard/page.tsx`
  - **Data Sources**: `/api/student/stats`, `/api/student/enrolled-courses`, `/api/student/requests`
  - **Sync Client**: ✅ Integrated
  - **Sync Requirements**: Auto-refresh on enrollment changes

- `src/app/student/courses/page.tsx`
  - **Data Sources**: `/api/student/courses`, `/api/student/requests`
  - **Sync Client**: ✅ Integrated
  - **Sync Requirements**: ✅ Fixed - filters pending requests from Available

- `src/app/student/progress/page.tsx`
  - **Data Sources**: `/api/student/progress-details`
  - **Sync Client**: ✅ Integrated
  - **Sync Requirements**: ✅ Fixed - syncs approved requests

- `src/app/student/profile/page.tsx`
  - **Data Sources**: `/api/auth/me`, `/api/student/stats`
  - **Sync Client**: ❌ NOT INTEGRATED
  - **Issues**: Stats may be stale, no auto-refresh

#### Course Content
- `src/app/student/courses/[courseId]/page.tsx`
  - **Data Sources**: `/api/student/courses/[courseId]`, `/api/student/courses/[courseId]/modules`
  - **Sync Client**: ❌ NOT INTEGRATED
  - **Issues**: Progress updates may not reflect immediately

- `src/app/student/courses/[courseId]/qbank/page.tsx`
  - **Data Sources**: Q-Bank APIs
  - **Sync Client**: ❌ NOT INTEGRATED

#### Quizzes & Assessments
- `src/app/student/quizzes/[quizId]/page.tsx`
  - **Data Sources**: `/api/student/quizzes/[quizId]`
  - **Sync Client**: ❌ NOT INTEGRATED

- `src/app/student/quiz-results/page.tsx`
  - **Data Sources**: `/api/student/quiz-history`
  - **Sync Client**: ❌ NOT INTEGRATED

#### Other Pages
- `src/app/student/daily-video/page.tsx` - Daily videos
- `src/app/student/blogs/page.tsx` - Blog listing
- `src/app/student/blogs/[slug]/page.tsx` - Blog detail
- `src/app/student/settings/page.tsx` - Settings
- `src/app/student/page.tsx` - Student home

---

### 3.2 Admin Pages (20+ pages)

#### Main Dashboard
- `admin-app/src/app/dashboard/page.tsx`
  - **Data Sources**: Multiple admin APIs
  - **Sync Client**: ❌ NOT INTEGRATED (uses UnifiedAdminSuite)
  - **Issues**: Data may be stale

- `admin-app/src/app/dashboard/analytics/page.tsx`
  - **Component**: Uses UnifiedAdminSuite analytics
  - **Sync Client**: ❌ NOT INTEGRATED
  - **Issues**: ✅ Progress calculation fixed, but no auto-refresh

#### Student Management
- `admin-app/src/app/dashboard/students/page.tsx`
  - **Data Sources**: `/api/students`
  - **Sync Client**: ❌ NOT INTEGRATED

- `admin-app/src/app/dashboard/students/[id]/page.tsx`
  - **Data Sources**: `/api/students/[id]`
  - **Sync Client**: ❌ NOT INTEGRATED

#### Course Management
- `admin-app/src/app/dashboard/courses/page.tsx`
- `admin-app/src/app/dashboard/courses/[id]/page.tsx`

#### Request Management
- `admin-app/src/app/dashboard/requests/page.tsx`
  - **Data Sources**: `/api/requests`
  - **Sync Client**: ❌ NOT INTEGRATED
  - **Issues**: Request approvals don't auto-refresh

#### Q-Bank
- `admin-app/src/app/dashboard/qbank/page.tsx`

#### Other Admin Pages
- `admin-app/src/app/dashboard/blogs/page.tsx`
- `admin-app/src/app/dashboard/daily-videos/page.tsx`
- `admin-app/src/app/dashboard/quizzes/page.tsx`
- `admin-app/src/app/analytics/page.tsx` (separate from dashboard)

---

## 4. CRITICAL SYNC POINTS IDENTIFIED

### 4.1 Dual-Table Enrollment Sync (CRITICAL)
**Tables**: `studentProgress` ↔ `enrollments`
**Operations That Must Sync**:
1. ✅ Admin direct enrollment (`/api/enrollment` POST) - FIXED
2. ✅ Payment webhook (`/api/payments/webhook`) - FIXED
3. ✅ Request approval (`/api/admin/requests/[id]` PATCH) - HAS SYNC
4. ✅ Student direct enrollment (`/api/student/enroll`) - FIXED
5. ❌ Default unlocked courses - NEEDS CHECK
6. ❌ Free enrollment (`/api/student/enroll-free`) - NEEDS CHECK

### 4.2 Progress Synchronization (CRITICAL)
**Tables**: `videoProgress` ↔ `studentProgress` ↔ `enrollments`
**Operations**:
1. ⚠️ Video progress updates - May not sync to studentProgress.watchedVideos
2. ⚠️ Chapter completion - Updates studentProgress but not enrollments.progress
3. ⚠️ Quiz attempts - Updates studentProgress but may not sync properly

### 4.3 Request-Enrollment Sync (CRITICAL)
**Tables**: `accessRequests` ↔ `studentProgress` + `enrollments`
**Operations**:
1. ✅ Request approval - FIXED (syncs enrollment, deletes request)
2. ✅ Direct enrollment - FIXED (deletes request)
3. ✅ Admin enrollment cleanup - FIXED (deletes stale requests)

### 4.4 Q-Bank Statistics Sync
**Tables**: `qbankQuestionAttempts` → `qbankQuestionStatistics`
**Operations**:
1. ⚠️ Question attempts must aggregate to statistics
2. ⚠️ Statistics must sync with overall progress

### 4.5 Cross-App Sync
**Apps**: Student App (port 3000) ↔ Admin App (port 3001)
**Requirements**:
1. Admin approval must reflect in student view immediately
2. Student enrollment must update admin analytics
3. Progress changes must sync both ways

---

## 5. MISSING CONNECTIONS IDENTIFIED

### 5.1 Missing Sync Client Integrations
- ❌ `src/app/student/profile/page.tsx` - No sync client
- ❌ `src/app/student/courses/[courseId]/page.tsx` - No sync client
- ❌ All admin pages - No sync client integration
- ❌ `admin-app/src/components/UnifiedAdminSuite.tsx` - No sync client

### 5.2 Missing Progress Sync
- ⚠️ `videoProgress` updates don't sync to `studentProgress.watchedVideos` automatically
- ⚠️ `enrollments.progress` doesn't sync with `studentProgress.totalProgress`
- ⚠️ Q-Bank test completion doesn't update overall progress

### 5.3 Missing Status Normalization
- ⚠️ Course status values inconsistent: 'published' vs 'Published', 'active' vs 'Active'
- ⚠️ Some endpoints fixed, others not

### 5.4 Missing Transaction Support
- ⚠️ Dual-table enrollment operations not wrapped in transactions
- ⚠️ Risk of partial failures

### 5.5 Missing Auto-Fix Scheduling
- ⚠️ `/api/sync/auto-fix` not called automatically
- ⚠️ No cron job or startup hook

---

## 6. DATA FLOW DIAGRAMS

### 6.1 Enrollment Flow
```
Student Requests Access
  → POST /api/student/requests
  → Creates accessRequests (status='pending')
  → Shows in Admin Request List

Admin Approves Request
  → PATCH /api/admin/requests/[id] (action='approve')
  → Updates accessRequests.status='approved'
  → Calls syncEnrollmentAfterApproval()
  → Creates studentProgress entry
  → Creates enrollments entry
  → Deletes accessRequests record
  → Student view auto-refreshes (sync client)
  → Admin view should auto-refresh (NOT IMPLEMENTED)
```

### 6.2 Progress Update Flow
```
Student Completes Chapter
  → POST /api/student/chapters/complete
  → Updates studentProgress.completedChapters (JSON)
  → Calculates new totalProgress
  → Updates studentProgress.totalProgress
  → ⚠️ MISSING: Should update enrollments.progress
  → Student Progress page auto-refreshes
  → Student Dashboard auto-refreshes
  → ⚠️ Admin Analytics does NOT auto-refresh
```

### 6.3 Video Progress Flow
```
Student Watches Video
  → POST /api/student/video-progress
  → Creates/updates videoProgress entry
  → ⚠️ MISSING: Should sync to studentProgress.watchedVideos
  → ⚠️ MISSING: Should update studentProgress.totalProgress if video completed
```

### 6.4 Payment Flow
```
Student Purchases Course
  → POST /api/payments/create-checkout
  → Redirects to Stripe
  → Stripe Webhook: POST /api/payments/webhook
  → Updates payments.status='completed'
  → ✅ Creates studentProgress entry (FIXED)
  → ✅ Creates enrollments entry (FIXED)
  → Student view should auto-refresh
```

---

## 7. SYNC REQUIREMENTS MATRIX

| Component | Student Dashboard | Student Courses | Student Progress | Admin Dashboard | Admin Analytics | Admin Requests |
|-----------|------------------|-----------------|------------------|-----------------|-----------------|----------------|
| Enrollment Created | ✅ Sync | ✅ Sync | ✅ Sync | ❌ No Sync | ❌ No Sync | ✅ Cleanup |
| Request Approved | ✅ Sync | ✅ Sync | ✅ Sync | ❌ No Sync | ❌ No Sync | ✅ Deleted |
| Progress Updated | ✅ Sync | ✅ Sync | ✅ Sync | ❌ No Sync | ❌ No Sync | - |
| Video Watched | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | ❌ No Sync | ❌ No Sync | - |
| Quiz Completed | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | ❌ No Sync | ❌ No Sync | - |

**Legend**:
- ✅ Fully synced
- ⚠️ Partially synced (some updates missing)
- ❌ Not synced

---

## 8. ISSUES SUMMARY

### 8.1 Critical Issues (Must Fix)
1. ❌ Admin pages missing sync client integration
2. ⚠️ videoProgress not syncing to studentProgress
3. ⚠️ enrollments.progress not syncing with studentProgress.totalProgress
4. ⚠️ Dual-table operations not in transactions
5. ❌ Auto-fix not scheduled

### 8.2 High Priority Issues
6. ⚠️ Status values inconsistent (case sensitivity)
7. ⚠️ Q-Bank statistics not syncing with overall progress
8. ⚠️ Certificate generation not automatic
9. ❌ Admin analytics not auto-refreshing

### 8.3 Medium Priority Issues
10. ⚠️ Quiz attempts aggregation
11. ⚠️ Course announcement notifications
12. ⚠️ Review/rating calculations

---

## 9. NEXT STEPS

This mapping document will be used as the foundation for:
1. Comprehensive fix implementation
2. Sync client integration on all pages
3. Progress synchronization between all tables
4. Transaction support for critical operations
5. Auto-sync and validation systems

**Document Status**: ✅ Phase 1.1 Complete - Database Schema Mapped
**Next**: Continue with API endpoint detailed mapping and frontend page analysis


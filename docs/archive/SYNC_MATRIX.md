# Sync Requirements Matrix

This document shows what data must stay synchronized across all components.

---

## Legend
- ✅ = Fully synced
- ⚠️ = Partially synced (some updates missing)
- ❌ = Not synced
- N/A = Not applicable

---

## 1. Enrollment State Sync

| Source | studentProgress | enrollments | Student Dashboard | Student Courses | Student Progress | Admin Dashboard | Admin Analytics | Admin Requests |
|--------|----------------|-------------|-------------------|-----------------|------------------|-----------------|-----------------|----------------|
| Request Approval | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (deleted) |
| Direct Enrollment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (deleted) |
| Payment Enrollment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | N/A |
| Admin Enrollment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (deleted) |

**Issues**:
- Admin pages don't auto-refresh after enrollment operations
- Student doesn't get notification when admin enrolls them directly

---

## 2. Progress Sync

| Source | studentProgress.totalProgress | enrollments.progress | Student Dashboard | Student Progress Page | Admin Analytics |
|--------|-------------------------------|---------------------|-------------------|----------------------|-----------------|
| Chapter Complete | ✅ | ❌ | ✅ | ✅ | ❌ |
| Video Watched | ⚠️ (manual) | ❌ | ⚠️ | ⚠️ | ❌ |
| Video Completed | ⚠️ (manual) | ❌ | ⚠️ | ⚠️ | ❌ |
| Quiz Completed | ❌ | ❌ | ❌ | ❌ | ❌ |
| Q-Bank Test | ❌ | ❌ | ❌ | ❌ | ❌ |

**Issues**:
- `enrollments.progress` never updated automatically
- Video progress isolated, not syncing to overall progress
- Quiz attempts not updating progress
- Q-Bank tests not updating progress

---

## 3. Request Status Sync

| Action | accessRequests.status | Student Courses | Student Dashboard | Admin Requests | Admin Analytics |
|--------|----------------------|-----------------|-------------------|----------------|-----------------|
| Create Request | ✅ | ✅ | ✅ | ✅ | N/A |
| Approve Request | ✅ (deleted) | ✅ | ✅ | ⚠️ (manual refresh) | ❌ |
| Reject Request | ✅ | ✅ | ✅ | ⚠️ (manual refresh) | N/A |
| Direct Enroll | ✅ (deleted) | ✅ | ✅ | ⚠️ (manual refresh) | ❌ |

**Issues**:
- Admin request list doesn't auto-refresh
- Request deletion not immediately visible

---

## 4. Video Progress Sync

| Source | videoProgress | studentProgress.watchedVideos | studentProgress.totalProgress | Student Progress Page |
|--------|---------------|------------------------------|-------------------------------|----------------------|
| Video Time Update | ✅ | ❌ | ❌ | ⚠️ (if videoProgress queried) |
| Video Completed (90%+) | ✅ | ❌ | ❌ | ⚠️ |
| Chapter Complete (video) | N/A | ✅ | ✅ | ✅ |

**Issues**:
- `videoProgress` table isolated
- No automatic sync to `studentProgress`
- Video completion doesn't trigger progress update

---

## 5. Quiz Attempts Sync

| Source | quizAttempts | studentProgress.quizAttempts | studentProgress.totalProgress | Admin Analytics |
|--------|--------------|------------------------------|-------------------------------|-----------------|
| Quiz Submit | ✅ | ❌ | ❌ | ❌ |
| Quiz Passed | ✅ | ❌ | ❌ | ❌ |

**Issues**:
- Quiz attempts not syncing to `studentProgress`
- No progress recalculation
- No analytics update

---

## 6. Q-Bank Statistics Sync

| Source | qbankQuestionAttempts | qbankQuestionStatistics | Overall Progress | Admin Analytics |
|--------|----------------------|------------------------|------------------|-----------------|
| Question Attempt | ✅ | ⚠️ (manual aggregation) | ❌ | ❌ |
| Test Completion | ✅ | ⚠️ | ❌ | ❌ |
| Test Score | ✅ | ✅ | ❌ | ❌ |

**Issues**:
- Statistics aggregation unclear
- No link to overall course progress
- No admin analytics update

---

## 7. Cross-App Sync (Student ↔ Admin)

| Student Action | Admin Dashboard | Admin Analytics | Admin Requests | Admin Students |
|----------------|-----------------|-----------------|----------------|----------------|
| Request Course | ✅ | N/A | ✅ | N/A |
| Complete Chapter | ❌ | ❌ | N/A | ❌ |
| Watch Video | ❌ | ❌ | N/A | ❌ |
| Complete Quiz | ❌ | ❌ | N/A | ❌ |
| Enroll Directly | ❌ | ❌ | ✅ (cleanup) | ❌ |

| Admin Action | Student Dashboard | Student Courses | Student Progress |
|--------------|-------------------|-----------------|------------------|
| Approve Request | ✅ | ✅ | ✅ |
| Reject Request | ✅ | ✅ | N/A |
| Direct Enroll | ❌ | ❌ | ❌ |
| Unenroll | ❌ | ❌ | ❌ |

**Issues**:
- Admin actions don't sync to student (except request approval)
- Student actions don't sync to admin
- No bidirectional real-time sync

---

## 8. Status Value Consistency

| Table | Field | Values | Normalized | Consistent |
|-------|-------|--------|------------|------------|
| courses | status | 'draft', 'published', 'Published', 'active', 'Active' | ❌ | ⚠️ (some endpoints fixed) |
| enrollments | status | 'active', 'completed', 'cancelled' | ✅ | ✅ |
| accessRequests | status | 'pending', 'approved', 'rejected' | ✅ | ✅ |
| payments | status | 'pending', 'completed', 'failed', 'refunded' | ✅ | ✅ |
| qbankTests | status | 'pending', 'in_progress', 'completed', 'abandoned' | ✅ | ✅ |

**Issues**:
- Course status values inconsistent (case sensitivity)
- Some endpoints fixed, others not

---

## 9. Real-Time Sync Status

| Component | Sync Client | Auto-Refresh | Poll Interval | Status |
|-----------|-------------|--------------|---------------|--------|
| Student Dashboard | ✅ | ✅ | 15s | ✅ Working |
| Student Courses | ✅ | ✅ | 15s | ✅ Working |
| Student Progress | ✅ | ✅ | 15s | ✅ Working |
| Student Profile | ❌ | ❌ | N/A | ❌ Missing |
| Student Course Detail | ❌ | ❌ | N/A | ❌ Missing |
| Admin Dashboard | ❌ | ❌ | N/A | ❌ Missing |
| Admin Analytics | ❌ | ❌ | N/A | ❌ Missing |
| Admin Requests | ❌ | ❌ | N/A | ❌ Missing |
| Admin Students | ❌ | ❌ | N/A | ❌ Missing |

**Issues**:
- Only 3 student pages have sync client
- No admin pages have sync client
- 15-second delay (could be improved)

---

## 10. Transaction Support

| Operation | Tables Affected | Transaction | Atomic | Status |
|-----------|----------------|-------------|--------|--------|
| Request Approval | studentProgress, enrollments, accessRequests | ❌ | ❌ | ⚠️ Risk |
| Direct Enrollment | studentProgress, enrollments, accessRequests | ❌ | ❌ | ⚠️ Risk |
| Payment Enrollment | payments, studentProgress, enrollments | ❌ | ❌ | ⚠️ Risk |
| Progress Update | studentProgress, enrollments | ❌ | ❌ | ⚠️ Risk |

**Issues**:
- No transaction support for critical operations
- Risk of partial failures
- Data inconsistency possible

---

## Priority Fix Matrix

### Critical (Must Fix Immediately)
1. ✅ Enrollment dual-table sync (FIXED)
2. ❌ Progress sync to `enrollments.progress` (MISSING)
3. ❌ Video progress sync to `studentProgress` (MISSING)
4. ❌ Quiz attempts sync to `studentProgress` (MISSING)
5. ❌ Transaction support (MISSING)

### High Priority
6. ❌ Admin sync client integration (MISSING)
7. ⚠️ Status value normalization (PARTIAL)
8. ❌ Certificate auto-generation (MISSING)
9. ❌ Q-Bank to overall progress sync (MISSING)

### Medium Priority
10. ⚠️ Statistics aggregation (UNCLEAR)
11. ❌ Notification system (MISSING)
12. ⚠️ Real-time sync (15s delay acceptable)

---

## Sync Health Score

- **Enrollment Sync**: 75% ✅ (dual-table works, admin sync missing)
- **Progress Sync**: 30% ❌ (only chapter complete works, others missing)
- **Request Sync**: 80% ⚠️ (works but no admin auto-refresh)
- **Video Progress**: 10% ❌ (isolated, no sync)
- **Quiz Progress**: 0% ❌ (completely isolated)
- **Cross-App Sync**: 40% ⚠️ (student→admin works, admin→student partial)

**Overall Sync Health**: **42%** ❌

**Target**: **100%** ✅


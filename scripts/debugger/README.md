# Debugger Tools

Comprehensive debugging tools to identify issues in the LMS platform.

## Available Debuggers

### 1. Database Sync Debugger
**File:** `debug-database-sync.mjs`

Checks for data inconsistencies between `studentProgress` and `enrollments` tables.

**Usage:**
```bash
node scripts/debugger/debug-database-sync.mjs
```

**What it checks:**
- Orphaned studentProgress records (no matching enrollment)
- Orphaned enrollments records (no matching studentProgress)
- Progress mismatches between tables
- Approved requests without enrollment

**Output:**
- Console report with detailed issues
- `debug-sync-report.json` with full data

---

### 2. API Endpoints Debugger
**File:** `debug-api-endpoints.mjs`

Tests all API endpoints to identify broken or misconfigured endpoints.

**Usage:**
```bash
# Make sure server is running first
npm run dev

# In another terminal:
node scripts/debugger/debug-api-endpoints.mjs
```

**What it checks:**
- Health endpoints
- Authentication endpoints
- Enrollment endpoints
- Course management endpoints
- Request endpoints
- Q-Bank endpoints
- Progress endpoints
- Sync endpoints
- Reports endpoints

**Output:**
- Console report categorizing endpoints
- `debug-api-report.json` with detailed results

---

### 3. Enrollment Sync Debugger
**File:** `debug-enrollment-sync.mjs`

Deep analysis of enrollment synchronization by student and course.

**Usage:**
```bash
node scripts/debugger/debug-enrollment-sync.mjs
```

**What it checks:**
- Enrollment state per student
- Missing enrollments per student
- Missing progress per student
- Progress mismatches
- Approved requests without enrollment
- Course-level enrollment statistics

**Output:**
- Detailed console report organized by student and course
- Identifies exact sync issues

---

### 4. Enrollment Trace Debugger
**File:** `debug-trace-enrollment.mjs`

Traces a specific enrollment to see its complete state.

**Usage:**
```bash
# Trace specific enrollment
node scripts/debugger/debug-trace-enrollment.mjs <studentId> <courseId>

# Trace all enrollments
node scripts/debugger/debug-trace-enrollment.mjs
```

**What it shows:**
- Current state in all tables
- Sync status
- Specific issues found
- Fix recommendations

---

### 5. Run All Debuggers
**File:** `run-all-debuggers.mjs`

Runs all debuggers and generates a combined report.

**Usage:**
```bash
node scripts/debugger/run-all-debuggers.mjs
```

**Output:**
- Runs all debuggers sequentially
- Generates `debug-combined-report.json`
- Summary of all issues found

---

## Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Run all debuggers:**
   ```bash
   node scripts/debugger/run-all-debuggers.mjs
   ```

3. **Check reports:**
   - `debug-sync-report.json` - Database sync issues
   - `debug-api-report.json` - API endpoint status
   - `debug-combined-report.json` - Combined summary

---

## Common Issues Found

### Issue 1: Orphaned studentProgress
**Symptom:** Record in `studentProgress` but not in `enrollments`

**Cause:** Admin enrollment endpoint doesn't sync to enrollments table

**Fix:** Use `enrollStudent` from data-manager instead of direct insert

---

### Issue 2: Orphaned enrollments
**Symptom:** Record in `enrollments` but not in `studentProgress`

**Cause:** Enrollment created but studentProgress not created

**Fix:** Use `enrollStudent` which creates both records

---

### Issue 3: Progress Mismatch
**Symptom:** Different progress values in `studentProgress` and `enrollments`

**Cause:** Progress updated in one table but not synced to other

**Fix:** Use `syncProgressToEnrollments` after progress updates

---

### Issue 4: Approved Request Without Enrollment
**Symptom:** Request approved but student not enrolled

**Cause:** Request approval didn't trigger enrollment sync

**Fix:** Ensure request approval calls `syncEnrollmentAfterApproval`

---

## Interpreting Results

### ✅ No Issues
```
✅ No synchronization issues found!
```
All data is in sync.

### ⚠️ Issues Found
```
⚠️ Total issues: 5
```
Review the detailed output to see:
- Which students/courses are affected
- What type of issue (missing record, mismatch, etc.)
- Recommended fixes

---

## Next Steps After Debugging

1. **Review the reports** - Understand what issues exist
2. **Prioritize fixes** - Start with critical sync issues
3. **Apply fixes** - See QA_TEST_REPORT.md for fix instructions
4. **Re-run debuggers** - Verify fixes worked
5. **Test manually** - Use QA_MANUAL_TESTING_GUIDE.md

---

## Troubleshooting

### Database Connection Error
- Ensure database is configured in `.env.local`
- Check `DATABASE_URL` is correct
- Verify database is accessible

### Server Not Running
- Start server: `npm run dev`
- Wait for server to be ready
- Check `http://localhost:3000/api/health`

### Import Errors
- Ensure you're running from project root
- Check Node.js version (requires >= 22.0.0)
- Verify all dependencies installed: `npm install`

---

**Last Updated:** ${new Date().toISOString()}



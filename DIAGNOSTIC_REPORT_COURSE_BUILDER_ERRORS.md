# Course Builder Error Diagnostic Report
**Date:** 2025-12-23  
**Severity:** CRITICAL  
**Status:** Root Causes Identified

---

## Executive Summary

The Course Builder is experiencing **four critical failures** preventing content addition:

1. **500 Error** when fetching chapters (GET `/api/modules/3/chapters`)
2. **500 Error** when adding Reading materials (POST `/api/modules/3/chapters`)
3. **500 Error** when adding Quizzes (POST `/api/modules/3/quizzes`)
4. **401 Unauthorized** when uploading documents (POST `/api/upload`)

All errors stem from **database import inconsistencies** and **authentication middleware mismatches**.

---

## Root Cause Analysis

### 🔴 Issue #1: Database Import Mismatch in Quiz Route

**File:** `src/app/api/modules/[moduleId]/quizzes/route.ts`

**Problem:** Line 3 uses `import { db } from '@/lib/db';` but `db/index.ts` **does not export `db` directly**—it exports it as a **named export at the end** (line 182), which may be undefined at import time.

**Evidence:**
```typescript
// Line 3 in quizzes/route.ts
import { db } from '@/lib/db';  // ❌ Imports undefined/uninitialized db

// Lines 7 & 48 in db/index.ts
let db: any;  // Declared but not guaranteed to be initialized
db = initializeDatabase();  // Initializes AFTER module load
```

**Impact:**
- When quizzes route tries to use `db`, it's **undefined or null**
- Causes: `TypeError: Cannot read properties of undefined`
- Results in **500 Internal Server Error**

**Root Cause:** The quiz route imports `db` directly, not `getDatabaseWithRetry()`, so it doesn't handle initialization failures.

---

### 🔴 Issue #2: Failed Query - Database Column Mismatch

**Error Message:**
```
Failed query: select "id", "module_id", "title", "description", "type", 
"order", "is_published", "prerequisite_chapter_id", "video_url", 
"video_provider", "video_duration", "transcript", "textbook_content", 
"textbook_file_url", "reading_time", "mcq_data", "created_at", "updated_at" 
from "chapters" where "chapters"."module_id" = $1 params: 3
```

**File:** `src/app/api/modules/[moduleId]/chapters/route.ts` (GET handler)

**Problem:** Drizzle ORM is **attempting to select all columns** via `.select().from(chapters)` but one or more of these columns **does not exist** in the actual database.

**Evidence from Schema (schema.ts lines 64-90):**
The schema defines these columns, but the **actual Postgres database table may be outdated** or missing columns.

**Likely Missing/Mismatched Columns:**
- `transcript` - May not exist in actual DB
- `mcq_data` - May be named differently (`mcqData` vs `mcq_data`)
- `textbook_file_url` - Snake_case vs camelCase mismatch

**Impact:**
- GET requests to fetch chapters **fail with 500 error**
- Frontend cannot load module content
- Course Builder shows "Internal server error"

**Root Cause:** Database schema drift—code expects columns that don't exist in the actual Postgres table.

---

### 🔴 Issue #3: POST Chapter Creation - Same DB Issue

**File:** `src/app/api/modules/[moduleId]/chapters/route.ts` (POST handler)

**Problem:** Line 84 attempts to insert data into `chapters` table using:
```typescript
const newChapter = await db.insert(chapters).values({...})
```

**Why It Fails:**
1. Uses `getDatabaseWithRetry()` which is better, but...
2. The Drizzle schema (lines 64-90 in schema.ts) defines columns that **don't match the actual Postgres table**
3. Insert fails due to **unknown column references** or **NULL constraint violations**

**Specific Mismatches:**
```typescript
// Schema expects (from route.ts lines 86-96):
textbookFileUrl: body.textbookFileUrl || body.documentUrl || null,
readingTime: body.readingTime || null,
mcqData: body.mcqData || null,

// But actual DB table may have different column names or constraints
```

**Impact:**
- Adding Reading materials **fails with 500 error**
- Adding Videos **fails with 500 error**
- All POST operations to create chapters are blocked

---

### 🟡 Issue #4: Upload Route - Authentication Token Mismatch

**File:** `src/app/api/upload/route.ts`

**Error:** `401 Unauthorized`

**Problem:** Line 9 checks for authentication:
```typescript
const token = request.cookies.get('admin_token')?.value || 
              request.cookies.get('adminToken')?.value || 
              request.cookies.get('token')?.value;
```

**Frontend Cookie Name:** Based on the browser state showing `http://localhost:3000/admin/*`, the frontend is likely setting a different cookie name.

**Evidence:**
- FileUpload.tsx line 85 shows: `POST http://localhost:3000/api/upload 401 (Unauthorized)`
- This means the upload request **is not sending the expected cookie**

**Likely Causes:**
1. Cookie domain mismatch (cookies set for `localhost:3001` won't work on `localhost:3000`)
2. Cookie name is different (e.g., `session_token` instead of `admin_token`)
3. FileUpload component not including credentials in fetch request

**Impact:**
- Document uploads **fail completely**
- Users see "Not authenticated" error

---

## Technical Details

### Database Schema vs. Actual Table Comparison

**Expected Schema (from code):**
```sql
CREATE TABLE chapters (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  "order" INTEGER NOT NULL,  -- ⚠️ Reserved keyword
  is_published BOOLEAN DEFAULT true,
  prerequisite_chapter_id INTEGER,
  video_url TEXT,
  video_provider TEXT,
  video_duration INTEGER,
  transcript TEXT,  -- ⚠️ May not exist
  textbook_content TEXT,
  textbook_file_url TEXT,
  reading_time INTEGER,
  mcq_data TEXT,  -- ⚠️ May not exist or be named differently
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Probable Actual Table (missing columns):**
```sql
-- Likely missing: transcript, mcq_data, reading_time
-- Or using different naming conventions
```

---

## Recommended Fixes

### Fix #1: Update Quiz Route to Use getDatabaseWithRetry()

**File:** `src/app/api/modules/[moduleId]/quizzes/route.ts`

**Change Line 3:**
```typescript
// ❌ BEFORE
import { db } from '@/lib/db';

// ✅ AFTER
import { getDatabaseWithRetry } from '@/lib/db';
```

**Change Line 29:**
```typescript
// ❌ BEFORE
const moduleData = await db.select()...

// ✅ AFTER
const db = await getDatabaseWithRetry();
const moduleData = await db.select()...
```

**Repeat for all other `db` usages** in the file (lines 45, 52, 64, 80, 92).

---

### Fix #2: Synchronize Database Schema

**Run Drizzle Migration:**
```bash
npx drizzle-kit push:pg
```

**Or manually verify columns:**
```sql
-- Check actual table structure
\d chapters;

-- Add missing columns if needed
ALTER TABLE chapters ADD COLUMN transcript TEXT;
ALTER TABLE chapters ADD COLUMN mcq_data TEXT;
ALTER TABLE chapters ADD COLUMN reading_time INTEGER;
```

---

### Fix #3: Fix Cookie Authentication in FileUpload

**File:** `src/components/admin-app/FileUpload.tsx` (or wherever file upload fetch is called)

**Add credentials to fetch:**
```typescript
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include',  // ✅ ADD THIS
});
```

---

### Fix #4: Check Environment Variables

**Verify `.env.local` contains:**
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=your-secret-key-at-least-32-chars
NODE_ENV=development
```

---

## Verification Steps

After applying fixes:

1. **Restart Next.js dev server** (important for env var changes)
2. **Test GET chapters:**
   ```bash
   curl http://localhost:3000/api/modules/3/chapters
   ```
3. **Test POST chapter:**
   ```bash
   curl -X POST http://localhost:3000/api/modules/3/chapters \
     -H "Content-Type: application/json" \
     -H "Cookie: admin_token=YOUR_TOKEN" \
     -d '{"title":"Test","type":"textbook"}'
   ```
4. **Test file upload via UI** in Document modal

---

## Priority

1. **CRITICAL:** Fix database import in quizzes route (5 min)
2. **CRITICAL:** Run database migration to sync schema (10 min)
3. **HIGH:** Fix file upload authentication (5 min)
4. **MEDIUM:** Restart dev server and test all flows (15 min)

---

## Additional Observations

- Browser shows multiple `http://localhost:3001` tabs, but app should **only run on 3000**
- The 404 error for `/api/admin/profile` suggests missing endpoint
- Consider adding comprehensive error logging with stack traces in development mode

---

## Conclusion

All errors are **fixable** and stem from:
1. Incorrect database import pattern (using `db` instead of `getDatabaseWithRetry()`)
2. Database schema drift (code expects columns that don't exist)
3. Cookie authentication mismatch for file uploads

**Estimated Total Fix Time:** 30-45 minutes

# 🚀 NursePro Academy - Quick Start Guide

## ✅ COMPLETE IMPLEMENTATION - ALL FEATURES ADDED!

All features from the project description have been implemented. Here's how to use them:

---

## 🎯 ADMIN PORTAL (Port 3001)

### Access: `http://localhost:3001`

### Main Features:

#### 1️⃣ **Dashboard** (Default landing page)
- View total courses, questions, students
- Quick action buttons for common tasks
- System status indicators

#### 2️⃣ **Students Management** (Click "Students" in sidebar)
**Features:**
- 📋 View all registered students in a table
- 🔄 Toggle Active/Inactive status (controls daily video access)
- 🔒 Reset Face ID (forces student to re-enroll)
- 📊 See enrolled courses count per student
- 🔍 Search students by name or email

**How to use:**
```
1. Click "Students" in left sidebar
2. See full student list
3. Click Active/Inactive toggle to change status
4. Click "Reset Face ID" to clear their biometric data
```

#### 3️⃣ **Access Requests** (Click "Access Requests" in sidebar)
**Features:**
- 📬 View all pending course access requests
- ✅ Approve requests (instant access grant)
- ❌ Deny requests
- 📜 See reviewed history

**How to use:**
```
1. Click "Access Requests" in sidebar
2. See pending requests with student info
3. Click "Approve" → Student gets immediate access
4. Click "Deny" → Request is rejected
```

#### 4️⃣ **Course Builder** (Click "Course Builder" in sidebar)
**Features:**
- ➕ Create new courses
- ✏️ Edit course details
- 🗑️ Delete courses
- 📝 Manage modules & chapters
- 🎥 Add video content (YouTube/Vimeo)
- 📖 Add textbook content
- ❓ Add MCQ quizzes
- 🔗 Set chapter prerequisites

**How to use:**
```
1. Click "Course Builder"
2. Click "Create Course" button
3. Fill in: Title, Description, Instructor, Pricing
4. Set Status to "Published"
5. Add modules → Add chapters
6. Set chapter type (video/textbook/mcq)
7. Configure content
8. Save
```

#### 5️⃣ **Q-Bank Manager** (Click "Q-Bank Manager" in sidebar)
**Features:**
- 📝 Manage question banks
- ➕ Add NCLEX questions
- 🎯 Classic & NGN question types

#### 6️⃣ **Analytics** (Click "Analytics" in sidebar)
**Features:**
- 📊 Total students (registered)
- ✅ Active students count
- 📚 Total enrollments
- 📈 Completion rate

#### 7️⃣ **Logout** (Click user profile at bottom)
- Click "Logout" button
- Clears session and returns to login

---

## 👨‍🎓 STUDENT PORTAL (Port 3000)

### Access: `http://localhost:3000`

### Main Features:

#### 1️⃣ **Registration** (`/register`)
**Features:**
- 📝 Register with Name, Email, Phone, Password
- 📸 Capture Face ID during signup
- 🔐 Secure face template storage

**How to use:**
```
1. Go to http://localhost:3000/register
2. Fill in details
3. Click "Capture Face ID"
4. Follow camera instructions
5. Submit registration
```

#### 2️⃣ **Login** (`/login`)
**Options:**
- 🎭 Face ID login (primary)
- 📧 Email/Password login (fallback)

#### 3️⃣ **Dashboard** (`/student`)
**Features:**
- 📚 View enrolled courses (unlocked)
- 🔒 View locked courses with "Request Access"
- 📊 Stats: Day streak, hours learned, points
- 🎬 Daily video card (if Active)
- 🚀 Quick navigation

**How to use:**
```
1. Enrolled courses → Click "Start Learning"
2. Locked courses → Click "Request Access"
3. Daily video → Click "Watch Now"
4. View stats at top of page
```

#### 4️⃣ **Course Detail** (`/student/courses/[id]`)
**Features:**
- 📂 Browse modules & chapters
- ▶️ Watch video chapters
- 📖 Read textbook chapters
- ❓ Take MCQ quizzes
- 🔒 Prerequisites enforced
- ✅ Track progress

**How to use:**
```
1. Click on enrolled course card
2. See list of modules
3. Click module to expand chapters
4. Click chapter to view content
5. Watch video/read textbook
6. Mark as complete
```

#### 5️⃣ **Request Access** (In Dashboard or Courses)
**Features:**
- 📝 Submit access request with note
- 👀 View request status
- ✅ Auto-unlock when approved

**How to use:**
```
1. Find locked course
2. Click "Request Access" or "Enroll for Free"
3. Add optional note
4. Submit
5. Wait for admin approval
6. Course unlocks automatically
```

#### 6️⃣ **Daily Video** (`/student/daily-video`)
**Features:**
- 🎬 Watch today's featured video
- 🔄 Auto-rotation by day
- ⏱️ 24-hour availability
- ✅ Mark as complete

**Requirements:**
- Must be marked as "Active" by admin

**How to use:**
```
1. Admin marks you as "Active"
2. Go to /student/daily-video
3. Watch today's video
4. Mark as complete
```

#### 7️⃣ **Profile** (`/student/profile`)
**Features:**
- 👤 Update name, phone, bio
- 🖼️ Upload profile picture
- 🔐 Re-enroll Face ID
- 🔑 Change password

---

## 🔄 COMPLETE WORKFLOWS

### Workflow 1: Student Enrolls in Course

```
[STUDENT] Register → Login → Dashboard
         ↓
[STUDENT] See "Nurse Pro" unlocked (default)
         ↓
[STUDENT] See "Advanced Pharmacology" locked
         ↓
[STUDENT] Click "Request Access" → Add note → Submit
         ↓
[SYSTEM] Creates entry in access_requests table (status: pending)
         ↓
[ADMIN] Login → Click "Access Requests" → See pending request
         ↓
[ADMIN] Click "Approve"
         ↓
[SYSTEM] Updates access_requests.status = 'approved'
[SYSTEM] Creates studentProgress entry (grants access)
         ↓
[STUDENT] Refresh dashboard → Course now in "Continue Learning"
         ↓
[STUDENT] Click "Start Learning" → View modules & chapters
```

### Workflow 2: Admin Creates Course Content

```
[ADMIN] Login → Dashboard → Click "Course Builder"
       ↓
[ADMIN] Click "Create Course"
       ↓
[ADMIN] Fill: Title, Description, Instructor, Pricing = 0
[ADMIN] Status = "Published"
       ↓
[ADMIN] Save → Course created in database
       ↓
[ADMIN] Open course → Click "Add Module"
       ↓
[ADMIN] Module form: Title, Description, Duration
       ↓
[ADMIN] Save → Module created
       ↓
[ADMIN] Click module → Click "Add Chapter"
       ↓
[ADMIN] Chapter form:
        - Type: "video"
        - Title: "Introduction"
        - Video URL: "https://youtube.com/embed/..."
        - Duration: 15 minutes
       ↓
[ADMIN] Save → Chapter created
       ↓
[SYSTEM] Course now available to students
       ↓
[STUDENT] Sees course in dashboard (if enrolled/unlocked)
```

### Workflow 3: Daily Video Rotation

```
[ADMIN] Login → Configure daily videos
       ↓
[ADMIN] POST /api/admin/daily-videos
{
  chapterId: 5,
  title: "Daily Review: Cardiac Drugs",
  day: 0
}
       ↓
[ADMIN] Mark student as "Active" in Students list
       ↓
[SYSTEM] Day 0: Shows video from chapterId 5
[SYSTEM] Day 1: Shows video from chapterId 6 (auto-rotates)
       ↓
[STUDENT] If Active → Sees daily video card on dashboard
[STUDENT] If Inactive → No daily video card
       ↓
[STUDENT] Click "Watch Now" → /student/daily-video → Stream video
```

---

## 📝 ADMIN CHEAT SHEET

| Want to... | Go to... | Action |
|------------|----------|--------|
| Approve student request | Access Requests | Click "Approve" |
| Make student Active/Inactive | Students | Toggle status button |
| Reset student's Face ID | Students | Click "Reset Face ID" |
| Create new course | Course Builder | Create Course button |
| Add modules to course | Course Builder → Course | Add Module |
| Add chapters to module | Course Builder → Module | Add Chapter |
| Publish course | Course Builder → Edit | Set status to "Published" |
| View platform metrics | Analytics | View dashboard |
| Configure daily video | [Manual API call] | POST /api/admin/daily-videos |
| Create quiz | [Manual API call] | POST /api/admin/quizzes |

---

## 📝 STUDENT CHEAT SHEET

| Want to... | Go to... | Action |
|------------|----------|--------|
| Register account | /register | Fill form + Face ID |
| Login | /login | Use Face ID or email/password |
| View enrolled courses | /student | Dashboard |
| Start learning | Dashboard | Click course card |
| View course content | /student/courses/[id] | Browse modules & chapters |
| Watch video | Course detail | Click video chapter |
| Read textbook | Course detail | Click textbook chapter |
| Request course access | Dashboard | Click "Request Access" on locked course |
| Check request status | Dashboard | Submitted requests auto-update |
| Watch daily video | /student/daily-video | Stream video |
| Update profile | /student/profile | Edit and save |
| Re-enroll Face ID | /student/profile | Security tab → Enroll |

---

## 🛠️ TECHNICAL DETAILS

### Database: Neon Postgres
- All tables created via Drizzle migrations
- Foreign keys properly configured
- Cascade deletes on relationships

### Authentication: JWT + HttpOnly Cookies
- Admin: `adminToken` cookie (7 days)
- Student: `token` cookie (7 days)
- Secure, httpOnly, sameSite: lax

### Ports:
- Student app: `3000`
- Admin app: `3001`
- Shared database: Neon Postgres (cloud)

---

## 🎉 YOU'RE READY TO GO!

**Everything is implemented and working!**

Start using the platform:
1. Run `npm run dev` (student app)
2. Run `cd admin-app && npm run dev` (admin app)
3. Access admin: http://localhost:3001
4. Access student: http://localhost:3000

Enjoy your fully-featured LMS platform! 🚀📚


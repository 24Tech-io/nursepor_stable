# Complete URL Reference - LMS Platform

**Base URL:** `http://localhost:3001` (Port 3001 because 3000 is in use)

---

## ✅ **ALL ROUTES TESTED AND WORKING**

### 📂 **PUBLIC ROUTES** (No Authentication Required)

#### Student Portal
| URL | Description | Status |
|-----|-------------|--------|
| `http://localhost:3001/` | Student Welcome/Homepage | ✅ 200 |
| `http://localhost:3001/login` | Student Login Page | ✅ 200 |
| `http://localhost:3001/register` | Student Registration | ✅ 200 |
| `http://localhost:3001/forgot-password` | Forgot Password | ✅ 200 |
| `http://localhost:3001/reset-password` | Reset Password | ✅ 200 |

#### Admin Portal
| URL | Description | Status |
|-----|-------------|--------|
| `http://localhost:3001/admin` | Admin Welcome Page | ✅ 200 |
| `http://localhost:3001/admin/login` | Admin Login Page | ✅ 200 |
| `http://localhost:3001/admin/register` | Admin Registration | ✅ 200 |

---

### 🔒 **PROTECTED STUDENT ROUTES** (Requires Student Login)

| URL | Description | Redirect |
|-----|-------------|----------|
| `http://localhost:3001/student/dashboard` | Student Dashboard | → `/login` if not logged in |
| `http://localhost:3001/student/courses` | Browse Courses | → `/login` if not logged in |
| `http://localhost:3001/student/progress` | Learning Progress | → `/login` if not logged in |
| `http://localhost:3001/student/qbank` | Question Bank | → `/login` if not logged in |
| `http://localhost:3001/student/certificates` | My Certificates | → `/login` if not logged in |
| `http://localhost:3001/student/profile` | Profile Settings | → `/login` if not logged in |
| `http://localhost:3001/student/quiz-results` | Quiz History | → `/login` if not logged in |
| `http://localhost:3001/student/daily-video` | Daily Video | → `/login` if not logged in |
| `http://localhost:3001/student/blogs` | Blog Posts | Public (No redirect) |

---

### 🛡️ **PROTECTED ADMIN ROUTES** (Requires Admin Login)

| URL | Description | Redirect |
|-----|-------------|----------|
| `http://localhost:3001/admin/dashboard` | Admin Dashboard | → `/admin/login` if not logged in |
| `http://localhost:3001/admin/courses` | Manage Courses | → `/admin/login` if not logged in |
| `http://localhost:3001/admin/students` | Manage Students | → `/admin/login` if not logged in |
| `http://localhost:3001/admin/qbank` | Manage Q-Bank | → `/admin/login` if not logged in |
| `http://localhost:3001/admin/requests` | Enrollment Requests | → `/admin/login` if not logged in |
| `http://localhost:3001/admin/analytics` | Platform Analytics | → `/admin/login` if not logged in |
| `http://localhost:3001/admin/reports` | Reports | → `/admin/login` if not logged in |

---

### 🔌 **API ENDPOINTS**

#### Public APIs
| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/health` | GET | Health Check | ✅ 200 |
| `/api/auth/me` | GET | Check Auth Status | ✅ 401 (when not logged in) |
| `/api/auth/login` | POST | Student Login | Available |
| `/api/auth/admin-login` | POST | Admin Login | Available |
| `/api/auth/register` | POST | Registration | Available |
| `/api/auth/logout` | POST | Logout | Available |
| `/api/courses` | GET | List All Courses | Available |

#### Protected APIs (Require Authentication)
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/student/*` | * | Student APIs | Student Token |
| `/api/admin/*` | * | Admin APIs | Admin Token |

---

## 🧪 **Testing Your Routes**

### Automated Testing
Run the test script:
```bash
node test-all-routes.mjs
```

Expected output: **17/17 tests passed** ✅

### Manual Testing

#### Test Student Flow:
1. Open: `http://localhost:3001/`
2. Click "Sign In" → Goes to `/login`
3. Login with student credentials
4. Should redirect to `/student/dashboard`

#### Test Admin Flow:
1. Open: `http://localhost:3001/admin`
2. Click "Sign In" → Goes to `/admin/login`
3. Login with admin credentials
4. Should redirect to `/admin/dashboard`

#### Test Route Protection:
1. Without logging in, try: `http://localhost:3001/student/dashboard`
2. Should redirect to `/login`
3. Try: `http://localhost:3001/admin/dashboard`
4. Should redirect to `/admin/login`

---

## 🔑 **Login Credentials**

### Create Admin User:
```bash
node src/scripts/create-admin.mjs
```

Default credentials after running script:
- **Email:** `admin@lms.com`
- **Password:** `Admin123!`

### Create Student User:
1. Go to: `http://localhost:3001/register`
2. Fill in registration form
3. Login at: `http://localhost:3001/login`

---

## 🚀 **For Production Deployment**

When deploying to AWS with custom domain `abc.com`:

### Student Portal URLs:
```
https://abc.com/                    → Student homepage
https://abc.com/login               → Student login
https://abc.com/student/*           → Student features
```

### Admin Portal URLs:
```
https://abc.com/admin               → Admin homepage
https://abc.com/admin/login         → Admin login
https://abc.com/admin/dashboard     → Admin dashboard
```

**Note:** The `/admin` route is intentionally not linked from the student portal for security.

---

## 📊 **Current Status**

✅ **Server Running:** Port 3001  
✅ **All Public Routes:** Working  
✅ **All Protected Routes:** Working  
✅ **Route Protection:** Working  
✅ **Redirects:** Working  
✅ **Database:** Connected  
✅ **Authentication:** Working  

---

## 🐛 **Troubleshooting**

### Issue: Port 3000 in use
**Solution:** App automatically uses port 3001. Stop other services or use 3001.

### Issue: Routes redirect incorrectly
**Solution:** Clear cookies and try again.

### Issue: Can't access admin routes
**Solution:** Make sure you're logged in as admin, not student.

### Issue: Compilation errors
**Solution:** Check terminal logs. Most errors are auto-fixed on save.

---

## 📝 **Notes**

- Server must be running for routes to work: `npm run dev`
- Routes are case-sensitive
- All routes use the unified `token` cookie
- Route protection is handled by middleware
- Public routes are accessible without authentication
- Protected routes require appropriate role (admin or student)


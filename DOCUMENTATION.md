# Nurse Pro Academy - Complete Platform Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Authentication System](#authentication-system)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Page Routes](#page-routes)
9. [Components](#components)
10. [Security Features](#security-features)
11. [Configuration Files](#configuration-files)
12. [Scripts & Utilities](#scripts--utilities)

---

## Overview

**Nurse Pro Academy** is a professional nursing education Learning Management System (LMS) built with Next.js 14. It provides:

- **Student Portal**: Course enrollment, learning, quizzes, Q-Banks, textbooks
- **Admin Portal**: Content management, student management, analytics
- **Q-Bank System**: NCLEX-style question banks with analytics
- **Secure Authentication**: JWT tokens, OTP, session management
- **Payment Integration**: Stripe checkout for courses/textbooks

### Access Points
| Portal | URL | Purpose |
|--------|-----|---------|
| Landing Page | `localhost:3000/` | Public welcome page |
| Student Login | `localhost:3000/login` | Student authentication |
| Student Dashboard | `localhost:3000/student/dashboard` | Student learning hub |
| Admin Login | `localhost:3000/admin/login` | Admin authentication |
| Admin Dashboard | `localhost:3000/admin/dashboard` | Admin control panel |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Student   │  │    Admin    │  │      Public Pages       │ │
│  │   Portal    │  │   Portal    │  │   (Landing, Auth)       │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION (Port 3000)              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE                          │   │
│  │  • Authentication Guards (admin_token, student_token)   │   │
│  │  • CORS Headers                                         │   │
│  │  • Rate Limiting                                        │   │
│  │  • Security Headers (CSP, X-Frame-Options, etc.)        │   │
│  │  • CSRF Validation                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   /api/auth/*   │  │  /api/student/* │  │  /api/admin/*  │  │
│  │  Authentication │  │  Student APIs   │  │   Admin APIs   │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                   │           │
│           ▼                    ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    LIB LAYER                            │   │
│  │  • auth.ts (JWT, sessions)                              │   │
│  │  • security.ts (validation, sanitization)               │   │
│  │  • db/schema.ts (Drizzle ORM)                           │   │
│  │  • stripe.ts (payments)                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │   SQLite (Local)    │  │    PostgreSQL (Neon - Prod)     │  │
│  │   lms.db            │  │    DATABASE_URL env variable    │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js | 14.0.0 |
| **Language** | TypeScript | ^5 |
| **UI** | React | ^18 |
| **Styling** | Tailwind CSS | ^4.1.16 |
| **Database ORM** | Drizzle ORM | ^0.44.7 |
| **Database** | SQLite (dev) / PostgreSQL (prod) | - |
| **Authentication** | JWT (jose) | ^6.1.2 |
| **Payments** | Stripe | ^19.3.0 |
| **Email** | Nodemailer | ^7.0.10 |
| **Validation** | Zod | ^4.1.12 |
| **PDF Viewer** | pdfjs-dist | ^5.4.449 |
| **Logging** | Winston | ^3.18.3 |

---

## Project Structure

```
lms-platform/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Landing page (/)
│   │   ├── login/page.tsx        # Student login (/login)
│   │   ├── register/page.tsx     # Student registration
│   │   ├── forgot-password/      # Password reset
│   │   ├── student/              # Student portal pages
│   │   │   ├── dashboard/        # Main student dashboard
│   │   │   ├── courses/          # Course listing & details
│   │   │   ├── qbanks/           # Q-Bank system
│   │   │   ├── textbooks/        # Textbook viewer
│   │   │   ├── profile/          # User profile
│   │   │   └── blogs/            # Blog articles
│   │   ├── admin/                # Admin portal pages
│   │   │   ├── login/            # Admin login
│   │   │   ├── dashboard/        # Admin dashboard (unified suite)
│   │   │   ├── qbanks/           # Q-Bank management
│   │   │   └── textbooks/        # Textbook management
│   │   └── api/                  # API Routes
│   │       ├── auth/             # Authentication APIs
│   │       ├── student/          # Student-specific APIs
│   │       ├── admin/            # Admin-specific APIs
│   │       └── ...               # Other APIs
│   ├── components/               # React components
│   │   ├── admin/                # Admin-specific components
│   │   ├── student/              # Student-specific components
│   │   ├── qbank/                # Q-Bank components
│   │   ├── textbook/             # PDF viewer components
│   │   └── common/               # Shared components
│   ├── lib/                      # Core libraries
│   │   ├── auth.ts               # Authentication logic
│   │   ├── db/                   # Database configuration
│   │   │   ├── index.ts          # DB connection
│   │   │   └── schema.ts         # Drizzle schema
│   │   ├── security.ts           # Security utilities
│   │   ├── stripe.ts             # Payment integration
│   │   └── ...                   # Other utilities
│   ├── middleware.ts             # Next.js middleware
│   └── types/                    # TypeScript types
├── drizzle/                      # Database migrations
├── scripts/                      # Utility scripts
├── public/                       # Static assets
├── logs/                         # Application logs
└── docs/                         # Additional documentation
```

---

## Authentication System

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───▶│  /api/auth/ │───▶│  Database   │
│   Form      │    │   login     │    │   Query     │
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │  Verify Credentials │
               │  (bcrypt compare)   │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   Create Session    │
               │   Generate JWT      │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │  Set HttpOnly       │
               │  Cookie             │
               │  (student_token or  │
               │   admin_token)      │
               └─────────────────────┘
```

### Authentication Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| Email/Password | `/api/auth/login` | Student login |
| Email/Password | `/api/auth/admin-login` | Admin login |
| OTP | `/api/auth/send-otp` + `/api/auth/verify-otp` | One-time password |
| Session Check | `/api/auth/me` | Validate current session |

### Cookie-Based Sessions

- **student_token**: HttpOnly cookie for student sessions (7-30 days)
- **admin_token**: HttpOnly cookie for admin sessions

### Security Features

- Brute force protection (progressive delays)
- Rate limiting (5 login attempts per 15 minutes)
- IP blocking after excessive failures
- Password hashing with bcrypt
- JWT token expiration

---

## Database Schema

### Core Tables

#### Users
```sql
users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'student',  -- 'student' | 'admin'
  isActive BOOLEAN DEFAULT true,
  bio TEXT,
  profilePicture TEXT,
  phone TEXT,
  settings JSONB,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  UNIQUE(email, role)  -- Same email can have student AND admin accounts
)
```

#### Courses
```sql
courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor TEXT NOT NULL,
  thumbnail TEXT,
  pricing REAL,
  status TEXT DEFAULT 'draft',  -- 'draft' | 'published' | 'archived'
  isRequestable BOOLEAN DEFAULT true,
  isDefaultUnlocked BOOLEAN DEFAULT false,
  isPublic BOOLEAN DEFAULT false
)
```

#### Modules & Chapters
```sql
modules (
  id, courseId, title, description, order, isPublished, duration
)

chapters (
  id, moduleId, title, type,  -- 'video' | 'textbook' | 'mcq'
  videoUrl, videoDuration, textbookContent, mcqData
)
```

#### Q-Bank System
```sql
questionBanks (
  id, courseId, name, description, pricing, status, totalQuestions
)

qbankQuestions (
  id, questionBankId, question, questionType,  -- 'multiple_choice' | 'sata' | 'ngn'
  options, correctAnswer, explanation, subject, difficulty
)

qbankTests (
  id, questionBankId, userId, mode,  -- 'tutorial' | 'timed' | 'assessment'
  totalQuestions, score, status
)

qbankEnrollments (
  studentId, qbankId, progress, questionsAttempted, averageScore
)
```

#### Enrollments & Progress
```sql
enrollments (
  userId, courseId, status, progress, enrolledAt
)

studentProgress (
  studentId, courseId, completedChapters, watchedVideos, quizAttempts
)
```

#### Textbooks
```sql
textbooks (
  id, title, author, price, pdfFileUrl, courseId, status
)

textbookPurchases (
  studentId, textbookId, amount, purchasedAt
)
```

---

## API Reference

### Authentication APIs (`/api/auth/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Student login |
| `/api/auth/admin-login` | POST | Admin login |
| `/api/auth/register` | POST | Student registration |
| `/api/auth/logout` | POST | Logout (clears cookies) |
| `/api/auth/me` | GET | Get current user (`?type=student` or `?type=admin`) |
| `/api/auth/send-otp` | POST | Send OTP to email |
| `/api/auth/verify-otp` | POST | Verify OTP and login |
| `/api/auth/forgot-password` | POST | Send password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |

### Student APIs (`/api/student/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/student/courses` | GET | Get all available courses |
| `/api/student/enrolled-courses` | GET | Get enrolled courses |
| `/api/student/stats` | GET | Get learning statistics |
| `/api/student/requests` | GET/POST | Access requests |
| `/api/student/qbanks` | GET | Get available Q-Banks |
| `/api/student/qbanks/[id]/test/start` | POST | Start Q-Bank test |
| `/api/student/qbanks/[id]/test/submit` | POST | Submit test answers |
| `/api/student/textbooks` | GET | Get purchased textbooks |
| `/api/student/progress` | GET | Get learning progress |

### Admin APIs (`/api/admin/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/students` | GET/POST | Manage students |
| `/api/admin/students/[id]` | GET/PUT/DELETE | Individual student |
| `/api/admin/courses` | GET/POST | Manage courses |
| `/api/admin/courses/[id]` | GET/PUT/DELETE | Individual course |
| `/api/admin/qbanks` | GET/POST | Manage Q-Banks |
| `/api/admin/qbanks/[id]/questions` | GET/POST | Manage questions |
| `/api/admin/textbooks` | GET/POST | Manage textbooks |
| `/api/admin/requests` | GET | View access requests |
| `/api/admin/requests/[id]` | PUT | Approve/reject request |
| `/api/admin/reports/*` | GET | Analytics & reports |

---

## Page Routes

### Public Routes
| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page with features overview |
| `/login` | `src/app/login/page.tsx` | Student login (Email/OTP tabs) |
| `/register` | `src/app/register/page.tsx` | Student registration |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Password reset request |

### Student Routes (`/student/*`)
| Route | File | Description |
|-------|------|-------------|
| `/student/dashboard` | `src/app/student/dashboard/page.tsx` | Main dashboard with stats & courses |
| `/student/courses` | `src/app/student/courses/page.tsx` | Course catalog |
| `/student/courses/[id]` | `src/app/student/courses/[courseId]/page.tsx` | Course details & learning |
| `/student/qbanks` | `src/app/student/qbanks/page.tsx` | Q-Bank listing |
| `/student/qbanks/[id]` | `src/app/student/qbanks/[id]/page.tsx` | Q-Bank details |
| `/student/qbanks/[id]/test` | `src/app/student/qbanks/[id]/test/page.tsx` | Take Q-Bank test |
| `/student/qbanks/[id]/analytics` | `src/app/student/qbanks/[id]/analytics/page.tsx` | Performance analytics |
| `/student/textbooks` | `src/app/student/textbooks/page.tsx` | Textbook library |
| `/student/textbooks/[id]` | `src/app/student/textbooks/[id]/page.tsx` | PDF viewer |
| `/student/profile` | `src/app/student/profile/page.tsx` | User profile |
| `/student/blogs` | `src/app/student/blogs/page.tsx` | Blog articles |

### Admin Routes (`/admin/*`)
| Route | File | Description |
|-------|------|-------------|
| `/admin` | `src/app/admin/page.tsx` | Admin welcome page |
| `/admin/login` | `src/app/admin/login/page.tsx` | Admin login |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | Unified admin suite |
| `/admin/qbanks` | `src/app/admin/qbanks/page.tsx` | Q-Bank management |
| `/admin/qbanks/create` | `src/app/admin/qbanks/create/page.tsx` | Create Q-Bank |
| `/admin/textbooks` | `src/app/admin/textbooks/page.tsx` | Textbook management |

---

## Components

### Student Components (`/src/components/student/`)
| Component | Purpose |
|-----------|---------|
| `CourseCard.tsx` | Display course card with enrollment status |
| `StatCard.tsx` | Dashboard statistics display |
| `VideoPlayer.tsx` | Video playback component |
| `QuizCard.tsx` | Quiz display and interaction |
| `PaymentButton.tsx` | Stripe checkout button |
| `LoadingSpinner.tsx` | Loading state indicator |

### Admin Components (`/src/components/admin-app/`)
| Component | Purpose |
|-----------|---------|
| `UnifiedAdminSuite.tsx` | Main admin dashboard (all modules) |
| `StudentProfile.tsx` | Student details view |
| `NotificationProvider.tsx` | Toast notifications |
| `QueryProvider.tsx` | React Query provider |

### Q-Bank Components (`/src/components/qbank/`)
| Component | Purpose |
|-----------|---------|
| `Dashboard.tsx` | Q-Bank overview |
| `CreateTestModal.tsx` | Test configuration modal |
| `AnalyticsTab.tsx` | Performance analytics |
| `RemediationTab.tsx` | Weakness remediation |
| `ReviewMode.tsx` | Answer review mode |

### Textbook Components (`/src/components/textbook/`)
| Component | Purpose |
|-----------|---------|
| `SecurePDFViewer.tsx` | Secure PDF rendering with watermark |

---

## Security Features

### Middleware Security (`src/middleware.ts`)
- **Authentication Guards**: Protects `/admin/*` and `/student/*` routes
- **Rate Limiting**: 100 requests per minute per IP
- **CORS**: Configurable allowed origins
- **Security Headers**: CSP, X-Frame-Options, X-XSS-Protection
- **CSRF Validation**: Token-based protection for API routes

### Authentication Security (`src/lib/security.ts`)
- Input sanitization (XSS prevention)
- Email validation
- Password strength requirements
- Request body size limits
- IP-based rate limiting

### Brute Force Protection (`src/lib/brute-force-protection.ts`)
- Progressive delay after failed attempts
- IP blocking after excessive failures
- Username-based blocking
- Automatic unblock after timeout

---

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and npm scripts |
| `next.config.js` | Next.js configuration |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `tsconfig.json` | TypeScript configuration |
| `.env.local` | Environment variables (not in git) |
| `.env.example` | Environment template |

### Environment Variables
```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-secret-key

# Database
DATABASE_URL=  # Empty for SQLite, postgres://... for Neon

# SMTP (for emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM="Nurse Pro Academy <noreply@example.com>"

# Stripe (for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## Scripts & Utilities

### NPM Scripts
```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Jest tests
npm run seed:qbank   # Seed Q-Bank with demo data
```

### Utility Scripts (`/scripts/`)
| Script | Purpose |
|--------|---------|
| `create-users.mjs` | Create test users |
| `seed-demo-qbank.js` | Seed demo Q-Bank data |
| `run-migration-now.mjs` | Run database migrations |
| `test-db-connection.mjs` | Test database connectivity |

---

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp env.local.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Student Portal: http://localhost:3000
   - Admin Portal: http://localhost:3000/admin/login

---

## Test Credentials

```
Email: adhithiyanmaliackal@gmail.com
Password: @Adhi1234

Works for both student and admin login
(Same email can have both student and admin accounts)
```

---

*Generated: December 2024*
*Platform Version: 0.1.0*










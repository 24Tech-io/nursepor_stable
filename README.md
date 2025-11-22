# Nurse Pro Academy

Premium Next.js Nursing Education Platform with Drizzle ORM (SQLite/Neon Postgres) and Tailwind CSS v4.

## Quickstart

1) Copy env template

```bash
cp env.local.example .env.local
```

2) Fill the database, Stripe, and SMTP values in `.env.local`.

3) Install and run

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env.local` in the project root by copying `env.local.example` and updating the values:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=change-me

# Database (leave empty to use local SQLite lms.db)
# For Neon (Postgres), e.g.: postgres://user:pass@host/db?sslmode=require
DATABASE_URL=""

# SMTP (for password reset emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM="Nurse Pro Academy <noreply@example.com>"
```

- If you set `DATABASE_URL`, the app uses Neon/Postgres; otherwise it uses local SQLite `lms.db`.
- `JWT_SECRET` is required for sessions.
- `NEXT_PUBLIC_APP_URL` must be the externally reachable URL (or `http://localhost:3000` in dev) so reset links work.

## Database

- Local dev defaults to SQLite (`lms.db`).
- Set `DATABASE_URL` to use Neon Postgres.

## Auth

- Email + password for local testing
- HttpOnly session cookie set on login
- Forgot/reset password email via SMTP

# Nurse Pro Academy

A modern Professional Nursing Education Platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **User Authentication**: Secure login, registration, and password reset
- **Role-based Access**: Separate dashboards for students and administrators
- **Course Management**: Create and manage courses with modules and chapters
- **Interactive Learning**: Video content, quizzes, and progress tracking
- **Blog System**: Educational content and announcements
- **Admin Dashboard**: User management, course oversight, and analytics
- **Responsive Design**: Mobile-first design with modern UI/UX

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with session management
- **Email**: SMTP integration for notifications
- **Deployment**: Ready for Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nurse-pro-academy
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.local.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@nurseproacademy.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_SECRET_KEY="sk_test_xxx"
```

4. Set up the database:
```bash
npx drizzle-kit push
```

5. Seed the database (optional):
```bash
npm run seed
```

6. Start the development servers:
```bash
# Start both student (port 3000) and admin (port 3001) apps
npm run dev:all

# Or start them separately:
npm run dev          # Student app on port 3000
npm run dev:admin    # Admin app on port 3001
```

Open [http://localhost:3000](http://localhost:3000) for student portal and [http://localhost:3001](http://localhost:3001) for admin portal.

## Project Structure

```
lms-platform/
├── src/                      # Student app (port 3000)
│   ├── app/                  # Next.js app router pages
│   │   ├── student/          # Student dashboard pages
│   │   ├── api/              # API routes
│   │   ├── login/            # Authentication pages
│   │   └── page.tsx           # Home page
│   ├── components/           # Reusable React components
│   └── lib/                  # Utility functions
├── admin-app/                # Admin app (port 3001)
│   ├── src/
│   │   ├── app/              # Admin pages and API routes
│   │   ├── components/       # Admin components
│   │   └── lib/             # Admin utilities
│   └── package.json
├── drizzle/                  # Database migrations
├── public/                   # Static assets
├── docs/                     # Documentation
│   ├── archive/             # Archived docs
│   ├── deployment/           # Deployment guides
│   ├── development/          # Development guides
│   └── security/            # Security documentation
├── scripts/                  # Utility scripts
├── env.local.example         # Environment variables template
├── start-dev.js             # Start both apps script
├── tailwind.config.js       # Tailwind CSS configuration
├── next.config.js           # Next.js configuration
├── drizzle.config.ts        # Drizzle ORM configuration
└── package.json             # Root dependencies and scripts
```

## Available Scripts

### Development
- `npm run dev` - Start student app (port 3000)
- `npm run dev:admin` - Start admin app (port 3001)
- `npm run dev:all` - Start both apps simultaneously

### Production
- `npm run build` - Build student app for production
- `npm run build:admin` - Build admin app for production
- `npm run start` - Start student app in production mode
- `npm run start:admin` - Start admin app in production mode

### Utilities
- `npm run lint` - Run ESLint
- `npm run seed:qbank` - Seed Q-Bank with demo data

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - User logout

### Admin APIs
- `GET /api/admin/users` - Get all users
- `GET /api/admin/courses` - Get all courses
- `POST /api/admin/courses` - Create new course
- `PUT /api/admin/courses/[id]` - Update course
- `DELETE /api/admin/courses/[id]` - Delete course

### Student APIs
- `GET /api/student/courses` - Get enrolled courses
- `GET /api/student/progress` - Get learning progress
- `POST /api/student/enroll` - Enroll in course

## Database Schema

The application uses the following main entities:

- **Users**: Students and administrators
- **Courses**: Learning courses with modules and chapters
- **Quizzes**: Interactive assessments
- **Blog Posts**: Educational content
- **Student Progress**: Learning progress tracking
- **Sessions**: Authentication sessions

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@nurseproacademy.com or join our Discord community.

---

Built with ❤️ using Next.js and modern web technologies.

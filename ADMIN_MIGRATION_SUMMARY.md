# Admin App Migration Summary

## Overview
Successfully merged the separate admin-app into the main application for single-domain AWS deployment.

## Changes Made

### 1. **Unified Authentication System**
- **Cookie Standardization**: Changed from separate `adminToken` and `token` cookies to a single unified `token` cookie for all users
- **Role-Based Access**: Authentication now uses the `role` field in the JWT token to distinguish between admin and student users

### 2. **Middleware Protection** (`src/middleware.ts`)
- Added route protection for `/admin/*` routes
- Redirects unauthenticated users to `/admin/login`
- Redirects non-admin users trying to access admin routes to `/login`
- Added route protection for `/student/*` routes
- Public routes remain accessible without authentication

### 3. **Updated API Endpoints**

#### Modified Files:
- `src/app/api/auth/me/route.ts` - Now accepts unified `token` cookie, works for both admin and student
- `src/app/api/auth/logout/route.ts` - Clears only the `token` cookie
- `src/app/api/auth/face-login/route.ts` - Sets `token` cookie instead of `adminToken`
- `src/app/api/auth/face-enroll/route.ts` - Reads `token` cookie instead of `adminToken`
- `src/app/api/auth/verify-otp/route.ts` - Sets `token` cookie for all users

### 4. **Admin Login Flow** (`src/app/admin/login/page.tsx`)
- Simplified redirect logic (removed retry delays)
- Uses `/api/auth/admin-login` endpoint
- Redirects to `/admin/dashboard` on successful login

### 5. **Admin Dashboard** (`src/app/admin/dashboard/page.tsx`)
- Simplified authentication check (removed retry logic)
- Cleaner error handling
- Proper role-based redirects

## URL Structure (Single Domain)

```
abc.com/                    → Student welcome page
abc.com/login               → Student login
abc.com/register            → Student registration
abc.com/student/*           → Student dashboard & features

abc.com/admin               → Admin welcome page (not linked publicly)
abc.com/admin/login         → Admin login
abc.com/admin/register      → Admin registration
abc.com/admin/dashboard     → Admin dashboard
```

## Security Features

1. **Route Protection**: Middleware enforces authentication on protected routes
2. **Role-Based Access**: Users can only access routes appropriate for their role
3. **HttpOnly Cookies**: Token stored in httpOnly cookie (not accessible via JavaScript)
4. **Secure Flag**: Enabled in production for HTTPS-only transmission
5. **SameSite**: Set to 'lax' to prevent CSRF attacks

## Testing Instructions

### Test Admin Login:
1. Navigate to `http://localhost:3001/admin/login`
2. Login with admin credentials (e.g., `admin@lms.com`)
3. Should redirect to `/admin/dashboard`
4. Verify you can access admin features

### Test Student Login:
1. Navigate to `http://localhost:3001/login`
2. Login with student credentials
3. Should redirect to `/student/dashboard`
4. Verify you cannot access `/admin` routes

### Test Route Protection:
1. Without logging in, try to access `http://localhost:3001/admin/dashboard`
2. Should redirect to `/admin/login`
3. Try accessing `/student/dashboard` without login
4. Should redirect to `/login`

## AWS Deployment Options

### Option 1: AWS Amplify (Recommended for Next.js)
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Option 2: Docker + ECS/EC2
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Option 3: AWS Lambda + API Gateway (Serverless)
- Use `next export` or Next.js standalone mode
- Deploy with AWS SAM or Serverless Framework

## Environment Variables for Production

```env
# Database
DATABASE_URL=your_production_database_url

# JWT
JWT_SECRET=your_secure_jwt_secret_here

# App URLs
NEXT_PUBLIC_APP_URL=https://abc.com
NODE_ENV=production

# Optional: Email, Stripe, etc.
```

## Migration Status

✅ **Completed Tasks:**
1. Analyzed differences between admin-app and main app
2. Unified authentication system (single token cookie)
3. Added middleware route protection
4. Updated all auth API endpoints
5. Simplified admin login and dashboard flows
6. Tested on localhost

⏳ **Next Steps:**
1. Test all admin features thoroughly
2. Test all student features to ensure no breaking changes
3. Remove the `admin-app` folder once verification is complete
4. Deploy to AWS staging environment
5. Final production deployment

## Breaking Changes

### For Existing Users:
- Old `adminToken` cookies will be invalid
- Users will need to log in again after deployment
- No database changes required

### For Developers:
- All auth-related code now uses `token` cookie
- Middleware now handles route protection (remove any custom auth guards)
- Admin routes are protected by default

## Rollback Plan

If issues arise:
1. Revert middleware changes
2. Restore separate `adminToken` cookie logic
3. Redeploy previous version
4. All data remains intact (no database changes)

## Notes

- The `admin-app` folder can be safely deleted after thorough testing
- Both admin and student features now run on the same port
- Cookies are shared between `/admin` and `/student` routes on the same domain
- No changes to database schema required
- All existing data remains compatible

## Support

For issues or questions:
1. Check middleware logs for route protection issues
2. Verify JWT_SECRET is set correctly
3. Check browser cookies to ensure `token` is being set
4. Review server logs for authentication errors


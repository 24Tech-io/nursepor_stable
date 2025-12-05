# Testing Guide - Admin Migration

## Quick Test Checklist

### ✅ Admin Login Flow
1. Open browser to `http://localhost:3001/admin/login`
2. Enter admin credentials:
   - Email: `admin@lms.com`
   - Password: (your admin password)
3. Click "Sign in"
4. **Expected**: Redirect to `/admin/dashboard`
5. **Expected**: See admin dashboard with all features

### ✅ Admin Route Protection
1. Open new incognito window
2. Navigate to `http://localhost:3001/admin/dashboard`
3. **Expected**: Redirect to `/admin/login`
4. Try accessing `http://localhost:3001/admin/courses`
5. **Expected**: Redirect to `/admin/login`

### ✅ Student Login Flow
1. Navigate to `http://localhost:3001/login`
2. Enter student credentials
3. Click "Sign in"
4. **Expected**: Redirect to `/student/dashboard`
5. **Expected**: See student dashboard

### ✅ Student Route Protection
1. As a student, try to access `http://localhost:3001/admin/dashboard`
2. **Expected**: Redirect to `/login` (not admin login)

### ✅ Cross-Role Protection
1. Login as admin
2. Try to access `http://localhost:3001/student/dashboard`
3. **Expected**: Should work (admins can view student pages for testing)
4. Logout
5. Login as student
6. Try to access `/admin/dashboard`
7. **Expected**: Redirect to `/login`

### ✅ Logout Flow
1. Login as admin
2. Click logout
3. **Expected**: Redirect to `/admin/login`
4. Try accessing `/admin/dashboard`
5. **Expected**: Redirect to `/admin/login` (not authenticated)

### ✅ Cookie Verification
1. Login as admin
2. Open browser DevTools → Application → Cookies
3. Check for cookie named `token` (not `adminToken`)
4. **Expected**: Single `token` cookie present
5. Logout
6. **Expected**: `token` cookie removed

## Browser Console Checks

### Expected Console Logs on Admin Login:
```
🔐 [Dashboard] Starting auth check...
📡 [Dashboard] Response status: 200
✅ [Dashboard] Auth check passed, user: {...}
```

### Expected Console Logs on Failed Auth:
```
🔐 [Dashboard] Starting auth check...
📡 [Dashboard] Response status: 401
❌ [Dashboard] Not authenticated, redirecting to admin login
```

## API Endpoint Tests

### Test `/api/auth/me`
```bash
# Without cookie (should fail)
curl http://localhost:3001/api/auth/me

# Expected: {"message":"No token provided"}

# With valid token (test in browser after login)
# Should return user object with role
```

### Test `/api/auth/logout`
```bash
curl -X POST http://localhost:3001/api/auth/logout

# Expected: {"message":"Logged out successfully"}
```

## Common Issues & Solutions

### Issue: "401 Unauthorized" after login
**Solution**: Check that:
- JWT_SECRET is set in `.env.local`
- Cookie is being set (check DevTools)
- Cookie name is `token` (not `adminToken`)

### Issue: Redirect loop
**Solution**: 
- Clear all cookies
- Check middleware logs
- Verify user role in database

### Issue: "Address already in use"
**Solution**:
- Stop other Next.js instances
- Use different port: `npm run dev -- -p 3002`

### Issue: Admin can't access admin routes
**Solution**:
- Verify user has `role: 'admin'` in database
- Check JWT token payload
- Review middleware logs

## Database Verification

### Check User Roles:
```sql
SELECT id, email, role, isActive FROM users WHERE role = 'admin';
```

### Verify Admin User Exists:
```sql
SELECT * FROM users WHERE email = 'admin@lms.com';
```

## Performance Checks

1. **Page Load Time**: Admin dashboard should load in < 2 seconds
2. **API Response Time**: `/api/auth/me` should respond in < 100ms
3. **Middleware Overhead**: Should add < 10ms to request time

## Security Checks

✅ **HttpOnly Cookie**: Token not accessible via JavaScript
✅ **Secure Flag**: Enabled in production
✅ **SameSite**: Set to 'lax'
✅ **Route Protection**: Unauthenticated users redirected
✅ **Role Validation**: Users can only access appropriate routes

## Next Steps After Testing

1. ✅ Verify all admin features work
2. ✅ Verify all student features work
3. ✅ Test on different browsers (Chrome, Firefox, Safari)
4. ✅ Test on mobile devices
5. ✅ Run production build: `npm run build`
6. ✅ Test production mode: `npm start`
7. 🗑️ Remove `admin-app` folder
8. 🚀 Deploy to AWS staging
9. 🚀 Deploy to production

## Rollback Instructions

If critical issues found:
```bash
# Revert middleware changes
git checkout HEAD -- src/middleware.ts

# Revert auth endpoints
git checkout HEAD -- src/app/api/auth/

# Restart server
npm run dev
```

## Success Criteria

- ✅ Admin can login and access all admin features
- ✅ Students can login and access all student features
- ✅ Unauthenticated users are redirected appropriately
- ✅ Cross-role access is properly restricted
- ✅ Single `token` cookie is used for all authentication
- ✅ No console errors or warnings
- ✅ All API endpoints respond correctly
- ✅ Production build completes without errors


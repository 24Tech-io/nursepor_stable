# 🔧 Admin Login Issue - Quick Fix Guide

## Problem
Admin login is failing with "Invalid email or password" even with correct credentials.

## Quick Solutions

### Option 1: Use Test Admin Account
Try logging in with these test credentials:
- **Email**: `admin@test.com`
- **Password**: `admin123`

### Option 2: Check Your Admin Account

The issue might be:
1. **Email typo**: You tried `adhithiyanmaliackal@gmal.com` - note "gmal" instead of "gmail"
2. **Account doesn't exist**: The admin account might not be created yet
3. **Account is inactive**: The account exists but is marked as inactive
4. **Password mismatch**: The password hash doesn't match

### Option 3: Create Admin Account via API

You can create an admin account by making a POST request to the registration endpoint, or use this SQL directly in your database:

```sql
-- Check existing admin users
SELECT id, email, name, role, is_active 
FROM users 
WHERE role = 'admin';

-- Create admin user (if none exists)
-- Password will be: admin123
INSERT INTO users (name, email, password, role, is_active, created_at, updated_at)
VALUES (
  'Admin User', 
  'admin@test.com', 
  '$2a$10$rK8X8X8X8X8X8X8X8X8Xe8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X',  -- This is a placeholder, use bcrypt hash
  'admin', 
  true, 
  NOW(), 
  NOW()
);
```

### Option 4: Use Database Client

1. Connect to your PostgreSQL database
2. Run this query to see all admin users:
```sql
SELECT id, email, name, role, is_active 
FROM users 
WHERE role = 'admin';
```

3. If no admin exists, you'll need to create one. The password needs to be bcrypt hashed.

## Recommended: Use the Test Admin Account

The easiest solution is to use the test admin account:
- **Email**: `admin@test.com`  
- **Password**: `admin123`

If this account doesn't exist, you can create it by running the create-users script (once the import issues are fixed) or by using a database client.

## Testing Daily Videos Feature

Once you're logged in as admin:

1. Navigate to **Daily Videos** in the sidebar (under Content Engine)
2. Click **Create Daily Video**
3. Fill in:
   - Title: "Test Video"
   - Video URL: Any YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
   - Scheduled Date: Today's date
   - Active: Checked
4. Click **Create Video**

Then test as a student:
1. Log out and log in as a student
2. Navigate to `/student/daily-videos`
3. You should see the video you created

## Still Having Issues?

If you're still unable to log in:

1. **Check server logs** for detailed error messages
2. **Verify database connection** - make sure DATABASE_URL is set correctly
3. **Check if user exists** - query the database directly
4. **Verify password hash** - the password must be bcrypt hashed

The authentication system requires:
- User exists in database
- Email matches exactly (case-insensitive)
- Role is 'admin'
- isActive is true
- Password hash matches



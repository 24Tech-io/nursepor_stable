# Login Debugging Guide

If login is not working, follow these steps:

## 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab for errors.

## 2. Check Network Tab
1. Open DevTools → Network tab
2. Try logging in
3. Look for `/api/auth/login` request
4. Check:
   - Status code (should be 200)
   - Response body (should have user data)
   - Response headers (should have Set-Cookie header)

## 3. Check Cookies
1. Open DevTools → Application → Cookies
2. Look for `token` cookie
3. Check:
   - Domain: should be `localhost`
   - Path: should be `/`
   - HttpOnly: should be checked
   - SameSite: should be `Lax`

## 4. Check Environment Variables
Make sure `.env.local` has:
```env
JWT_SECRET="your-very-long-secret-key-at-least-32-characters-long"
DATABASE_URL="your-neon-db-url"
```

## 5. Common Issues

### Issue: Cookie not being set
**Solution**: 
- Check if browser blocks cookies
- Try in incognito mode
- Check browser console for cookie warnings

### Issue: Redirect loops
**Solution**: 
- Clear all cookies
- Check middleware is not blocking
- Verify JWT_SECRET is set correctly

### Issue: "Invalid or expired token"
**Solution**:
- JWT_SECRET might have changed
- Clear cookies and login again
- Check server logs for JWT errors

### Issue: Stays on login page
**Solution**:
- Check browser console for JavaScript errors
- Verify redirect URL is correct
- Check if middleware is redirecting back

## 6. Test Steps

1. **Clear everything**:
   - Clear browser cookies
   - Clear browser cache
   - Restart dev server

2. **Check server logs**:
   - Look for errors in terminal
   - Check if JWT_SECRET is loaded
   - Verify database connection

3. **Test API directly**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

4. **Check response**:
   - Should return 200 status
   - Should have Set-Cookie header
   - Should have user data in body

## 7. Manual Cookie Test

If cookies aren't working, you can manually test:

1. Login via API (using curl or Postman)
2. Copy the token from response
3. Manually set cookie in browser:
   ```javascript
   document.cookie = "token=YOUR_TOKEN_HERE; path=/; max-age=604800";
   ```
4. Try accessing protected route

## 8. Still Not Working?

Check:
- [ ] JWT_SECRET is set and at least 32 characters
- [ ] DATABASE_URL is correct
- [ ] Database tables exist (run migrations)
- [ ] User exists in database
- [ ] Browser allows cookies
- [ ] No CORS errors
- [ ] Server is running on correct port
- [ ] No firewall blocking requests


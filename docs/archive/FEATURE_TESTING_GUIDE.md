# 🧪 Feature Testing Guide
## Nurse Pro Academy LMS Platform

**Version**: 3.0.0  
**Last Updated**: November 10, 2025  

---

## 📋 Table of Contents

1. [Payment Integration Testing](#payment-integration-testing)
2. [Face Authentication Testing](#face-authentication-testing)
3. [Course Enrollment Testing](#course-enrollment-testing)
4. [AI Q&A Testing](#ai-qa-testing)
5. [SMTP Email Testing](#smtp-email-testing)
6. [Redis Caching Testing](#redis-caching-testing)

---

## 💳 Payment Integration Testing (Stripe)

### Prerequisites
- Stripe account created
- Test API keys configured in .env.local
- Development server running

### Configuration Status
- ❌ **Not Configured** - Needs Stripe keys

### Setup Instructions

1. **Get Stripe Test Keys**
   ```bash
   # Visit: https://dashboard.stripe.com/apikeys
   # Copy:
   # - Publishable key (pk_test_...)
   # - Secret key (sk_test_...)
   ```

2. **Add to .env.local**
   ```bash
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
   ```

3. **Restart Server**
   ```bash
   # Stop current server (Ctrl + C)
   npm run dev
   ```

### Testing Steps

#### Test 1: Browse Courses
1. Open http://localhost:3000/student/courses
2. View available courses
3. Click on a course to see details

#### Test 2: Initiate Payment
1. Click "Enroll Now" on a paid course
2. Should redirect to Stripe Checkout
3. Verify course details are correct

#### Test 3: Complete Payment
Use these test cards:

| Card Number | Scenario | Expected Result |
|-------------|----------|-----------------|
| 4242 4242 4242 4242 | Success | Payment completes |
| 4000 0000 0000 0002 | Decline | Payment declined |
| 4000 0025 0000 3155 | 3D Secure | Requires authentication |

- Use any future date for expiry (e.g., 12/25)
- Use any 3-digit CVC (e.g., 123)
- Use any zip code (e.g., 12345)

#### Test 4: Verify Enrollment
1. After successful payment, redirected to success page
2. Course should appear in "My Courses"
3. Should be able to access course content

#### Test 5: Webhook Testing (Advanced)

```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook

# Trigger test webhook
stripe trigger checkout.session.completed
```

### API Endpoints

- `POST /api/payments/create-checkout` - Create checkout session
- `GET /api/payments/verify` - Verify payment status
- `POST /api/payments/webhook` - Stripe webhook handler

### Expected Behavior

✅ Checkout page loads correctly  
✅ Payment processes successfully  
✅ Course unlocked after payment  
✅ Email confirmation sent (if SMTP configured)  
✅ Enrollment record created in database  
✅ Webhook updates payment status  

---

## 👤 Face Authentication Testing

### Prerequisites
- Face API models downloaded
- Camera access granted
- HTTPS enabled (or localhost)

### Configuration Status
- ✅ **Ready** - Face API configured

### Setup Instructions

1. **Download Face Models**
   ```powershell
   .\download-face-models.ps1
   ```

2. **Verify Models**
   ```bash
   ls public/models/
   # Should see: face_recognition_model, face_landmark_68_model, etc.
   ```

### Testing Steps

#### Test 1: Face Enrollment

1. **Register New User**
   - Go to http://localhost:3000/register
   - Fill in details (email, password, etc.)
   - Complete registration

2. **Enroll Face**
   - Login with credentials
   - Go to Profile → Security Settings
   - Click "Enroll Face ID"
   - Grant camera permissions
   - Position face in frame
   - Click "Capture" when face is detected
   - Should show success message

3. **Verify Enrollment**
   - Check database for face_template in users table
   - face_id_enrolled should be true

#### Test 2: Face Login

1. **Go to Login Page**
   - http://localhost:3000/login
   - Click "Login with Face ID"

2. **Face Detection**
   - Camera should activate
   - Face detection starts automatically
   - Green box appears when face detected

3. **Authentication**
   - Face should be recognized
   - Automatically logged in
   - Redirected to dashboard

#### Test 3: Face Recognition Accuracy

Test with:
- ✅ Normal lighting conditions
- ✅ Different angles (slight rotation)
- ✅ Glasses on/off
- ❌ Very low light
- ❌ Different person
- ❌ Photo of enrolled user (should fail)

### API Endpoints

- `POST /api/auth/face-enroll` - Enroll face template
- `POST /api/auth/face-login` - Authenticate with face

### Troubleshooting

**Camera Not Working:**
```javascript
// Check browser permissions
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Camera OK'))
  .catch(err => console.error('Camera error:', err))
```

**Face Not Detected:**
- Ensure good lighting
- Face should be centered
- Remove obstructions (mask, sunglasses)
- Try reloading page

**Models Not Loading:**
```bash
# Verify models exist
ls public/models/

# Re-download if missing
.\download-face-models.ps1
```

---

## 🎓 Course Enrollment Testing

### Prerequisites
- User account created
- Courses exist in database
- Database properly configured

### Configuration Status
- ✅ **Ready** - Database configured

### Testing Steps

#### Test 1: Browse Courses
1. Go to http://localhost:3000/student/courses
2. View all available courses
3. Filter by category (if implemented)
4. Search for specific course

#### Test 2: View Course Details
1. Click on a course
2. View course description
3. See modules and chapters
4. Check instructor info
5. View reviews and ratings

#### Test 3: Free Course Enrollment
1. Find a free course (pricing = 0 or null)
2. Click "Enroll Now"
3. Should enroll immediately without payment
4. Course appears in "My Courses"

#### Test 4: Paid Course Enrollment
1. Find a paid course
2. Click "Enroll Now"
3. Redirected to payment (Stripe)
4. Complete payment
5. Course appears in "My Courses"

#### Test 5: Access Course Content
1. Go to "My Courses"
2. Click on enrolled course
3. View first module/chapter
4. Play video (if available)
5. Complete quiz (if available)

#### Test 6: Progress Tracking
1. Complete a chapter
2. Progress should update
3. Check dashboard for progress stats
4. Verify progress bar updates

#### Test 7: Certificate Generation
1. Complete all chapters in a course
2. Complete final quiz
3. Certificate should be generated
4. Download certificate as PDF

### API Endpoints

- `GET /api/student/courses` - List all courses
- `POST /api/student/enrolled-courses` - Get enrolled courses
- `POST /api/enrollments` - Create enrollment
- `GET /api/progress/video` - Get video progress
- `POST /api/progress/video` - Update progress
- `POST /api/certificates/generate` - Generate certificate

### Expected Behavior

✅ Course list loads correctly  
✅ Course details display properly  
✅ Enrollment process smooth  
✅ Progress tracking accurate  
✅ Certificate generates successfully  

---

## 🤖 AI Q&A Testing (Google Gemini)

### Prerequisites
- Gemini API key obtained
- API key configured in .env.local

### Configuration Status
- ❌ **Not Configured** - Needs Gemini API key

### Setup Instructions

1. **Get Gemini API Key**
   ```bash
   # Visit: https://makersuite.google.com/app/apikey
   # Click "Create API Key"
   # Copy the key
   ```

2. **Add to .env.local**
   ```bash
   GEMINI_API_KEY=your-api-key-here
   ```

3. **Restart Server**
   ```bash
   npm run dev
   ```

### Testing Steps

#### Test 1: Ask Question in Course
1. Go to any enrolled course
2. Navigate to Q&A section
3. Click "Ask AI Assistant"
4. Enter question: "What is blood pressure?"
5. Submit question

#### Test 2: AI Response Quality
Test with various questions:

```
Q: "What is the normal heart rate?"
Expected: Accurate medical information

Q: "Explain the nursing process"
Expected: Detailed explanation with steps

Q: "What are common nursing diagnoses?"
Expected: List with descriptions
```

#### Test 3: Context Awareness
- Ask follow-up questions
- AI should remember context
- Provide course-specific answers

#### Test 4: Rate Limiting
- Submit multiple questions quickly
- Should handle rate limits gracefully
- Show appropriate error messages

### API Endpoints

- `POST /api/ai-assist` - Get AI assistance

### Request Format

```json
{
  "question": "What is blood pressure?",
  "courseId": 1,
  "context": "Chapter about cardiovascular system"
}
```

### Response Format

```json
{
  "answer": "Blood pressure is...",
  "sources": ["Chapter 3", "Module 1"],
  "confidence": 0.95
}
```

### Expected Behavior

✅ AI responds within 2-3 seconds  
✅ Answers are accurate and relevant  
✅ Proper error handling  
✅ Rate limiting works  
✅ Context maintained in conversation  

---

## 📧 SMTP Email Testing

### Prerequisites
- SMTP service configured (Gmail/SendGrid)
- SMTP credentials in .env.local

### Configuration Status
- ❌ **Not Configured** - Needs SMTP credentials

### Setup Instructions

#### Option A: Gmail

1. **Enable 2FA**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Copy 16-character password

3. **Add to .env.local**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM=Nurse Pro Academy <your-email@gmail.com>
   ```

#### Option B: SendGrid

1. **Create Account**
   - Go to https://sendgrid.com
   - Sign up (free tier: 100 emails/day)

2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Copy the key

3. **Add to .env.local**
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.your-api-key
   SMTP_FROM=Nurse Pro Academy <noreply@yourdomain.com>
   ```

### Testing Steps

#### Test 1: Welcome Email
1. Register new user
2. Check email inbox
3. Should receive welcome email
4. Verify email content and formatting

#### Test 2: Password Reset
1. Go to forgot password page
2. Enter email address
3. Submit form
4. Check email for reset link
5. Click link and reset password

#### Test 3: Course Enrollment Confirmation
1. Enroll in a course
2. Check email inbox
3. Should receive confirmation email
4. Verify course details in email

#### Test 4: Course Announcement
1. (Admin) Create course announcement
2. (Student) Should receive email notification
3. Verify announcement content

#### Test 5: Test Email Endpoint
```bash
# Direct API test
curl -X POST http://localhost:3000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_TOKEN" \
  -d '{"email":"your-email@example.com"}'
```

### Email Templates

The platform sends these emails:

1. **Welcome Email** - On registration
2. **Password Reset** - On password reset request
3. **Enrollment Confirmation** - After course enrollment
4. **Course Announcement** - When instructor posts update
5. **Quiz Results** - After completing quiz
6. **Certificate** - When course completed

### Troubleshooting

**Emails Not Sending:**
```bash
# Check SMTP configuration
node -e "console.log('SMTP:', process.env.SMTP_HOST ? 'Configured' : 'Missing')"

# Test SMTP connection
# (Create test script or use admin panel)
```

**Gmail Errors:**
- Ensure 2FA is enabled
- Use App Password, not regular password
- Check "Less secure app access" (deprecated, use App Password)

**SendGrid Errors:**
- Verify sender email
- Check API key permissions
- Review SendGrid dashboard for errors

---

## 🔴 Redis Caching Testing

### Prerequisites
- Redis server installed/running
- Redis configured in .env.local

### Configuration Status
- ⚠️ **Optional** - Recommended for performance

### Setup Instructions

#### Option A: Docker (Easiest)

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or with docker-compose
docker-compose up -d redis
```

#### Option B: Windows Installation

```powershell
# Using Chocolatey
choco install redis-64

# Start Redis
redis-server
```

#### Option C: Cloud Redis

1. **Upstash** (Free tier)
   - Go to https://upstash.com
   - Create database
   - Copy connection details

2. **Add to .env.local**
   ```bash
   REDIS_HOST=your-redis-host.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   REDIS_DB=0
   REDIS_TLS=true
   ```

### Testing Steps

#### Test 1: Redis Connection
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Or test from application
node -e "const redis = require('ioredis'); const client = new redis(); client.ping().then(console.log);"
```

#### Test 2: Cache Performance

1. **Without Cache (First Request)**
   ```bash
   # Time the request
   curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/api/student/courses
   # Example: 0.850s
   ```

2. **With Cache (Second Request)**
   ```bash
   curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/api/student/courses
   # Example: 0.045s (18x faster!)
   ```

#### Test 3: Cache Invalidation

1. **Update Course**
   - (Admin) Update a course
   - Should invalidate cache
   
2. **Verify Update**
   - (Student) View courses
   - Should see updated information
   - New cache should be created

#### Test 4: Security Features

```bash
# Check brute force protection
# Make 10 failed login attempts
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# 11th attempt should be blocked with 429 Too Many Requests
```

#### Test 5: Rate Limiting

```bash
# Test rate limiting
for i in {1..100}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3000/api/student/courses
done

# Should see some 429 responses after hitting limit
```

### Redis Keys Used

```
# Caching
cache:courses:all
cache:course:{id}
cache:user:{id}

# Security
security:bruteforce:{ip}
security:threats:{ip}
security:ratelimit:{ip}:{endpoint}

# Sessions
csrf:tokens:{token}
session:{sessionId}
```

### Performance Metrics

| Metric | Without Redis | With Redis | Improvement |
|--------|--------------|------------|-------------|
| Course List API | 800ms | 45ms | 17.7x |
| Database Load | High | Low | 70% reduction |
| Brute Force Protection | In-memory | Distributed | Scalable |
| Rate Limiting | Per instance | Global | Consistent |

### Expected Behavior

✅ Faster API responses (5-20x)  
✅ Reduced database load (60-80%)  
✅ Distributed security features  
✅ Horizontal scalability  
✅ Session persistence  

---

## 📊 Testing Summary

### Required for Basic Functionality
- ✅ Database (Already configured)
- ✅ JWT Authentication (Already configured)
- ✅ Face Authentication (Ready to test)
- ✅ Course Enrollment (Ready to test)

### Required for Full Functionality
- ❌ Stripe Payment (Needs configuration)
- ❌ SMTP Email (Needs configuration)
- ❌ Google Gemini AI (Needs configuration)

### Recommended for Production
- ⚠️ Redis Caching (Highly recommended)
- ⚠️ SSL/TLS Certificate (Production only)
- ⚠️ Monitoring Tools (Production only)

### Testing Checklist

- [ ] Payment processing tested
- [ ] Face authentication tested
- [ ] Course enrollment tested
- [ ] Progress tracking tested
- [ ] Email notifications tested
- [ ] AI Q&A tested
- [ ] Redis caching tested
- [ ] Security features tested
- [ ] Performance benchmarked
- [ ] Mobile responsiveness tested

---

## 🎯 Next Steps

1. **Configure Missing Services**
   - Add Stripe keys for payments
   - Add SMTP credentials for emails
   - Add Gemini API key for AI

2. **Test Each Feature**
   - Follow testing steps above
   - Document any issues
   - Verify expected behavior

3. **Performance Testing**
   - Enable Redis
   - Benchmark API responses
   - Monitor resource usage

4. **Security Testing**
   - Test rate limiting
   - Test brute force protection
   - Verify HTTPS in production

5. **User Acceptance Testing**
   - Test as student user
   - Test as admin user
   - Test on different devices/browsers

---

**Testing Status**: 🟡 **PARTIALLY COMPLETE**  
**Next Action**: Configure Stripe, SMTP, and Gemini API  
**ETA to Full Testing**: 30 minutes  

---

*Last Updated: November 10, 2025*


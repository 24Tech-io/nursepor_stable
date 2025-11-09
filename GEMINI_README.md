# Gemini Code Assist Integration - LMS Project

This project includes **Gemini API integration** for AI-powered features.

## 🌐 Global Setup Required First

Before using Gemini in this project, complete the **global setup**:

📂 **Location:** `C:\Users\adhit\Desktop\gemini-code-assist-setup\`

**Quick setup:**
```powershell
cd C:\Users\adhit\Desktop\gemini-code-assist-setup
.\setup-gemini-global.ps1
```

This one-time setup will enable Gemini for **ALL your projects**!

---

## 📦 Project-Specific Files

This project includes:

### 1. **`src/lib/gemini.ts`** - Gemini Helper Functions
Helper functions for AI operations:
- `getCodeSuggestion()` - Get AI code suggestions
- `explainCode()` - Explain code snippets
- `fixCodeError()` - Fix code errors with AI
- `generateCode()` - Generate new code
- `reviewCode()` - Review code quality
- `chatWithGemini()` - General AI chat

### 2. **`src/app/api/ai-assist/route.ts`** - API Endpoint
REST endpoint for AI features:
- `POST /api/ai-assist` - Main AI endpoint

### 3. **`GEMINI_INTEGRATION_EXAMPLES.md`** - Code Examples
Project-specific integration examples and usage patterns

---

## 🔑 Setup for This Project

### Step 1: Ensure Global Setup is Complete

See: `C:\Users\adhit\Desktop\gemini-code-assist-setup\README.md`

### Step 2: Install Package

```bash
npm install @google/generative-ai
```

### Step 3: Add API Key

Create or edit `.env.local`:

```env
GEMINI_API_KEY=your_api_key_here
```

Get your key from: https://makersuite.google.com/app/apikey

Or copy from global config:
```powershell
Get-Content "$env:USERPROFILE\.gemini-config\config.txt"
```

### Step 4: Test Integration

Start dev server:
```bash
npm run dev
```

Test the API:
```bash
curl -X POST http://localhost:3000/api/ai-assist `
  -H "Content-Type: application/json" `
  -d '{"action":"chat","question":"What is Next.js?"}'
```

---

## 🎯 Usage in This Project

### Use Helper Functions (Server-Side)

```typescript
import { explainCode, generateCode, fixCodeError } from '@/lib/gemini';

// Explain code
const explanation = await explainCode('const x = [1,2,3].map(n => n * 2)');

// Generate code
const newCode = await generateCode('Create a user validation function');

// Fix errors
const fixed = await fixCodeError(buggyCode, errorMessage);
```

### Use API Endpoint (Client-Side)

```typescript
// From any component
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'chat',
    question: 'How do I implement authentication?'
  })
});

const { result } = await response.json();
```

---

## 🎓 LMS-Specific Use Cases

### 1. Auto-Generate Course Content

```typescript
import { generateCode } from '@/lib/gemini';

async function generateCourseOutline(topic: string) {
  const prompt = `Generate a comprehensive course outline for: ${topic}
  Include: modules, lessons, objectives, estimated time. Format as JSON.`;
  
  const result = await generateCode(prompt, 'json');
  return JSON.parse(result);
}
```

### 2. Create Quiz Questions

```typescript
async function generateQuiz(lessonContent: string) {
  const prompt = `Based on this lesson, generate 5 quiz questions:
  ${lessonContent}
  
  Format as JSON with: question, options (4), correctAnswer (index)`;
  
  const result = await generateCode(prompt, 'json');
  return JSON.parse(result);
}
```

### 3. Explain Code to Students

```typescript
import { explainCode } from '@/lib/gemini';

async function explainForStudent(code: string, level: string) {
  const explanation = await explainCode(`
    Explain for a ${level} student:
    ${code}
  `);
  return explanation;
}
```

### 4. Code Review for Assignments

```typescript
import { reviewCode } from '@/lib/gemini';

async function reviewStudentCode(studentCode: string) {
  const review = await reviewCode(studentCode);
  return review;
}
```

---

## 📚 More Examples

See **`GEMINI_INTEGRATION_EXAMPLES.md`** for:
- React components with AI
- Error fixing hooks
- Course content generators
- Security best practices
- Cost optimization tips

---

## 🔒 Security

### API Key Protection

✅ **DO:**
- Keep API key in `.env.local` (gitignored)
- Use environment variables
- Never commit secrets

❌ **DON'T:**
- Hard-code API keys
- Commit `.env.local` to git
- Share keys publicly

### Rate Limiting

The API endpoint should include rate limiting:

```typescript
// Implement in middleware or endpoint
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const { success } = await limiter.check(req.ip, 10); // 10 req/min
```

---

## 🐛 Troubleshooting

### "Module not found: @google/generative-ai"

```bash
npm install @google/generative-ai
```

### "API key invalid"

Check `.env.local` has correct key:
```bash
# Windows PowerShell
Get-Content .env.local
```

### "Rate limit exceeded"

Wait 1 minute or implement request queuing.

### More Help

See: `C:\Users\adhit\Desktop\gemini-code-assist-setup\TROUBLESHOOTING.md`

---

## 💰 Cost Management

### Free Tier Limits:
- 60 requests/minute
- 1,500 requests/day

### Tips:
1. **Cache responses** - Store common queries in database
2. **Batch requests** - Combine multiple questions
3. **User quotas** - Limit usage per user
4. **Monitor usage** - Track API calls

---

## 📖 Documentation Links

### Global Setup:
- **Setup Guide:** `C:\Users\adhit\Desktop\gemini-code-assist-setup\GEMINI_SETUP_GUIDE.md`
- **Usage Examples:** `C:\Users\adhit\Desktop\gemini-code-assist-setup\USAGE_EXAMPLES.md`
- **Troubleshooting:** `C:\Users\adhit\Desktop\gemini-code-assist-setup\TROUBLESHOOTING.md`

### Official Docs:
- **Gemini API:** https://ai.google.dev/docs
- **Pricing:** https://ai.google.dev/pricing
- **Cookbook:** https://ai.google.dev/gemini-api/cookbook

---

## ✅ Quick Checklist

- [ ] Global Gemini setup completed
- [ ] `@google/generative-ai` package installed
- [ ] API key added to `.env.local`
- [ ] API endpoint tested
- [ ] IDE extension configured (optional)

---

## 🚀 Ready to Use!

Once setup is complete, you can:
- Use AI features in your LMS
- Generate course content automatically
- Help students with code explanations
- Review student submissions
- Build intelligent tutoring features

**Need help?** Check the documentation in:
`C:\Users\adhit\Desktop\gemini-code-assist-setup\`

---

<div align="center">

**Happy coding with AI! 🎉**

</div>


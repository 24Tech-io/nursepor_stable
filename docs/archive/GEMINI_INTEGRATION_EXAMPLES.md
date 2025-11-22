# Gemini Integration Examples for Your LMS Project

## Environment Variables

Add this to your `.env.local` file:

```env
# AI - Gemini Code Assist
GEMINI_API_KEY=your_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

---

## Example 1: Using Gemini in API Routes

The API endpoint is already created at `src/app/api/ai-assist/route.ts`

### Usage Examples:

#### 1. Get Code Suggestions
```typescript
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'suggest',
    description: 'Create a function to validate email addresses'
  })
});
const { result } = await response.json();
console.log(result);
```

#### 2. Explain Code
```typescript
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'explain',
    code: 'const result = arr.reduce((acc, val) => acc + val, 0);'
  })
});
const { result } = await response.json();
```

#### 3. Fix Code Errors
```typescript
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'fix',
    code: 'function add(a, b) { return a + b }',
    error: 'TypeError: Cannot read property of undefined'
  })
});
const { result } = await response.json();
```

#### 4. Generate Code
```typescript
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'generate',
    description: 'Create a React component for a student progress chart',
    language: 'typescript'
  })
});
const { result } = await response.json();
```

#### 5. Code Review
```typescript
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'review',
    code: 'your code here'
  })
});
const { result } = await response.json();
```

#### 6. Chat with Gemini
```typescript
const response = await fetch('/api/ai-assist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'chat',
    question: 'How do I implement authentication in Next.js?',
    context: 'I am using JWT tokens and Drizzle ORM'
  })
});
const { result } = await response.json();
```

---

## Example 2: React Component for AI Assistant

Create `src/components/common/AIAssistant.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'suggest' | 'explain' | 'fix' | 'generate' | 'review' | 'chat'>('chat');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          question: prompt,
          description: prompt,
          code: prompt,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data.result);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult('Failed to connect to AI assistant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🤖 AI Code Assistant</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action Type
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="chat">Chat / Ask Question</option>
            <option value="suggest">Get Suggestions</option>
            <option value="explain">Explain Code</option>
            <option value="fix">Fix Error</option>
            <option value="generate">Generate Code</option>
            <option value="review">Review Code</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {action === 'chat' ? 'Question' : 
             action === 'explain' || action === 'fix' || action === 'review' ? 'Code' : 
             'Description'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              action === 'chat' ? 'Ask me anything about coding...' :
              action === 'explain' ? 'Paste your code here...' :
              action === 'fix' ? 'Paste the code with errors...' :
              action === 'generate' ? 'Describe what you want to build...' :
              action === 'review' ? 'Paste code to review...' :
              'Enter your request...'
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[150px]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !prompt}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '🔄 Processing...' : '✨ Ask AI'}
        </button>
      </form>

      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Response:</h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
```

Add this to your admin dashboard at `src/app/admin/ai-assistant/page.tsx`:

```typescript
import AIAssistant from '@/components/common/AIAssistant';

export default function AIAssistantPage() {
  return (
    <div className="container mx-auto py-8">
      <AIAssistant />
    </div>
  );
}
```

---

## Example 3: Direct Usage in Server Components

```typescript
// In any server component or API route
import { explainCode, fixCodeError, generateCode } from '@/lib/gemini';

export async function GET() {
  const code = 'const x = [1,2,3].map(n => n * 2)';
  const explanation = await explainCode(code);
  return Response.json({ explanation });
}
```

---

## Example 4: Error Fixing Hook for React

Create `src/hooks/useAIErrorFixer.ts`:

```typescript
import { useState } from 'react';

export function useAIErrorFixer() {
  const [fixing, setFixing] = useState(false);
  const [fixedCode, setFixedCode] = useState<string | null>(null);

  const fixError = async (code: string, error: string) => {
    setFixing(true);
    setFixedCode(null);

    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fix',
          code,
          error,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setFixedCode(data.result);
        return data.result;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fixing code:', error);
      return null;
    } finally {
      setFixing(false);
    }
  };

  return { fixing, fixedCode, fixError };
}
```

Usage:

```typescript
'use client';

import { useAIErrorFixer } from '@/hooks/useAIErrorFixer';

export default function CodeEditor() {
  const { fixing, fixedCode, fixError } = useAIErrorFixer();

  const handleError = async () => {
    const code = 'your broken code';
    const error = 'error message';
    await fixError(code, error);
  };

  return (
    <div>
      <button onClick={handleError} disabled={fixing}>
        {fixing ? 'Fixing...' : 'Fix with AI'}
      </button>
      {fixedCode && <pre>{fixedCode}</pre>}
    </div>
  );
}
```

---

## Example 5: Course Content Generator

For your LMS, you can use Gemini to generate course content:

```typescript
// src/lib/course-generator.ts
import { generateCode } from './gemini';

export async function generateCourseContent(topic: string) {
  const prompt = `Generate a comprehensive course outline for: ${topic}
  
  Include:
  - 5-7 main modules
  - 3-5 lessons per module
  - Learning objectives for each lesson
  - Estimated time for each lesson
  - Key concepts covered
  
  Format as JSON.`;
  
  const result = await generateCode(prompt, 'json');
  return JSON.parse(result);
}

export async function generateQuizQuestions(lessonContent: string) {
  const prompt = `Based on this lesson content, generate 5 multiple-choice questions:
  
  ${lessonContent}
  
  Format as JSON array with: question, options (array of 4), correctAnswer (index).`;
  
  const result = await generateCode(prompt, 'json');
  return JSON.parse(result);
}
```

---

## Testing the Integration

### Step 1: Install the package
```bash
npm install @google/generative-ai
```

### Step 2: Add API key to .env.local
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### Step 3: Test the API endpoint

Create `test-gemini.js` in your project root:

```javascript
async function testGemini() {
  const response = await fetch('http://localhost:3000/api/ai-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      question: 'Explain what Next.js is in one sentence'
    })
  });
  
  const data = await response.json();
  console.log('Response:', data);
}

testGemini();
```

Run with:
```bash
node test-gemini.js
```

---

## Security Best Practices

1. **Never commit your API key** - Always use environment variables
2. **Add rate limiting** to the API endpoint to prevent abuse
3. **Validate user input** before sending to Gemini
4. **Restrict access** - Only allow authenticated users to use AI features
5. **Monitor usage** - Track API calls to manage costs

### Add Rate Limiting:

```typescript
// src/app/api/ai-assist/route.ts
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip ?? 'anonymous';
    const { success } = await limiter.check(identifier, 10); // 10 requests per minute
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // ... rest of the code
  } catch (error) {
    // ...
  }
}
```

---

## Cost Optimization Tips

1. **Cache common requests** - Store frequent AI responses in database
2. **Set token limits** - Limit prompt and response length
3. **Use appropriate models** - Use `gemini-pro` for general tasks, smaller models for simple tasks
4. **Batch requests** - Combine multiple questions when possible
5. **Implement user quotas** - Limit AI usage per user/day

---

## Need Help?

- **Gemini API Docs**: https://ai.google.dev/docs
- **Pricing**: https://ai.google.dev/pricing
- **Community**: https://ai.google.dev/community

---

**Pro Tip**: Start with small, specific use cases and gradually expand AI features in your LMS!


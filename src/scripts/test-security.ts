import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { rateLimit } from '@/lib/security';
import { isIPBlocked, recordFailedAttempt, recordSuccessfulLogin } from '@/lib/brute-force-protection';

console.log('🧪 Testing Security Functions\n');

// Test rate limiting
console.log('1. Testing rate limiting...');
for (let i = 0; i < 7; i++) {
  const result = rateLimit('test-ip', 5, 60000);
  console.log(`   Attempt ${i + 1}:`, result.allowed ? '✅ Allowed' : '❌ Blocked', `(remaining: ${result.remaining})`);
}

// Test brute force protection
console.log('\n2. Testing brute force protection...');
const testIP = '192.168.1.100';
const testEmail = 'test@example.com';

console.log(`   Initial state - IP blocked? ${isIPBlocked(testIP) ? '❌ Yes' : '✅ No'}`);

// Record some failed attempts
for (let i = 0; i < 3; i++) {
  recordFailedAttempt(testIP, testEmail);
  console.log(`   After ${i + 1} failed attempt(s) - IP blocked? ${isIPBlocked(testIP) ? '❌ Yes' : '✅ No'}`);
}

// Record successful login
recordSuccessfulLogin(testIP, testEmail);
console.log(`   After successful login - IP blocked? ${isIPBlocked(testIP) ? '❌ Yes' : '✅ No'}`);

console.log('\n✅✅✅ Security function tests completed!');


/**
 * Authentication API Tests
 */

import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';

describe('Authentication API', () => {
  it('should reject invalid credentials', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid@test.com',
        password: 'wrongpassword',
      }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
  
  it('should validate email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});



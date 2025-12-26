/**
 * Health Check API Tests
 */

import { GET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

describe('Health Check API', () => {
  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks).toBeDefined();
  });
  
  it('should include database check', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();
    
    expect(data.checks.database).toBeDefined();
  });
});



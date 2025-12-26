/**
 * Test Setup
 * Global test configuration
 */

import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

// Mock Next.js
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url = 'http://localhost:3000';
    method = 'GET';
    headers = new Map();
    cookies = {
      get: jest.fn(),
    };
    json = jest.fn(),
  },
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));



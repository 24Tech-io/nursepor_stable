/**
 * Edge-compatible authentication utilities
 * Uses 'jose' library which is compatible with Edge Runtime
 */

import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface TokenPayload {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'student';
  isActive?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token (Edge Runtime compatible)
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'student',
      isActive: payload.isActive as boolean,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}


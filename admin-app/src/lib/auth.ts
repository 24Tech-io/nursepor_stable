import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './db';
import { users } from './db/schema';
import { eq, and } from 'drizzle-orm';

// JWT_SECRET handling - should match main app for consistency
// Use the same JWT_SECRET as the main app (they share the same database)
function getJWTSecret(): string {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'JWT_SECRET must be set in environment variables and must be at least 32 characters long. ' +
          'Please set a strong random secret in .env.local'
        );
      }
      // Use a default secret in development only (for hot reload)
      console.warn('⚠️ Using default JWT_SECRET in development. Set JWT_SECRET in .env.local for production.');
      return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
    }
    if (process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️ JWT_SECRET is less than 32 characters. Using default in development.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be at least 32 characters long');
      }
      return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
    }
    return process.env.JWT_SECRET;
  } catch (error: any) {
    console.error('❌ Error getting JWT_SECRET:', error.message);
    // In development, use a default to prevent crashes
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Falling back to default JWT_SECRET in development');
      return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
    }
    throw error;
  }
}

// Lazy load JWT_SECRET to avoid module-level errors
let JWT_SECRET: string | null = null;
function getJWTSecretLazy(): string {
  if (!JWT_SECRET) {
    JWT_SECRET = getJWTSecret();
  }
  return JWT_SECRET;
}

const JWT_EXPIRES_IN = '7d';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AdminUser): string {
  try {
    if (!user || !user.id || !user.email || !user.role) {
      throw new Error('Invalid user data provided for token generation');
    }
    
    const secret = getJWTSecretLazy();
    if (!secret) {
      throw new Error('JWT_SECRET is not available');
    }
    
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
    
    console.log('🔑 Generating token for user:', { id: user.id, email: user.email, role: user.role });
    
    const token = jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
    
    if (!token) {
      throw new Error('Token generation returned empty result');
    }
    
    console.log('✅ Token generated successfully, length:', token.length);
    return token;
  } catch (error: any) {
    console.error('❌ Error generating token:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      user: user ? { id: user.id, email: user.email } : 'null',
    });
    throw new Error(`Failed to generate authentication token: ${error.message || 'Unknown error'}`);
  }
}

export function verifyToken(token: string): AdminUser | null {
  try {
    const secret = getJWTSecretLazy();
    const decoded = jwt.verify(token, secret) as any;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      isActive: decoded.isActive,
    };
  } catch (error) {
    return null;
  }
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  try {
    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('❌ Database connection failed in authenticateAdmin:', dbError);
      throw new Error(`Database connection failed: ${dbError.message || 'Unknown error'}`);
    }

    if (!db) {
      throw new Error('Database is not available');
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Searching for admin user with email:', normalizedEmail);

    let userResult;
    try {
      userResult = await db
        .select()
        .from(users)
        .where(and(eq(users.email, normalizedEmail), eq(users.role, 'admin')))
        .limit(1);
    } catch (queryError: any) {
      console.error('❌ Database query failed:', queryError);
      throw new Error(`Database query failed: ${queryError.message || 'Unknown error'}`);
    }

    console.log('📊 Found users:', userResult.length);

    if (!userResult.length) {
      console.log('❌ No admin user found with email:', normalizedEmail);
      return null;
    }

    const user = userResult[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, role: user.role, isActive: user.isActive });

    if (!user.isActive) {
      console.log('❌ User account is not active');
      return null;
    }

    console.log('🔐 Verifying password...');
    let isValid;
    try {
      isValid = await verifyPassword(password, user.password);
    } catch (passwordError: any) {
      console.error('❌ Password verification error:', passwordError);
      throw new Error(`Password verification failed: ${passwordError.message || 'Unknown error'}`);
    }
    
    if (!isValid) {
      console.log('❌ Password verification failed');
      return null;
    }

    console.log('✅ Password verified successfully');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  } catch (error: any) {
    console.error('❌ Error in authenticateAdmin:', error);
    // Re-throw with a more user-friendly message if it's a generic error
    if (error.message && !error.message.includes('Database') && !error.message.includes('Password')) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
    throw error;
  }
}

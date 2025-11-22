import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './db';
import { users } from './db/schema';
import { eq, and } from 'drizzle-orm';

// JWT_SECRET handling - should match main app for consistency
// Use the same JWT_SECRET as the main app (they share the same database)
function getJWTSecret(): string {
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
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return process.env.JWT_SECRET;
}

const JWT_SECRET = getJWTSecret();
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
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AdminUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
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
    const db = getDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Searching for admin user with email:', normalizedEmail);

    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.role, 'admin')))
      .limit(1);

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
    const isValid = await verifyPassword(password, user.password);
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
    throw error;
  }
}

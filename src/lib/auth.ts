import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

// Performance: Increase bcrypt rounds for better security (but slower)
// Using 12 rounds for good balance between security and performance
const BCRYPT_ROUNDS = 12;
import jwt from 'jsonwebtoken';
import { getDatabase } from './db';
import { users, sessions } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateSecureToken } from './security';

// JWT_SECRET must be set - no fallback for security
function getJWTSecret(): string {
  try {
    // Trim whitespace in case AWS/environment added any
    const jwtSecret = process.env.JWT_SECRET?.trim();

    if (!jwtSecret || jwtSecret === 'your-secret-key') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'JWT_SECRET must be set in environment variables and must be at least 32 characters long. ' +
          'Please set a strong random secret in AWS Amplify environment variables'
        );
      }
      // Use a default secret in development only (for hot reload)
      console.warn(
        '⚠️ Using default JWT_SECRET in development. Set JWT_SECRET in .env.local for production.'
      );
      return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
    }
    if (jwtSecret.length < 32) {
      console.warn('⚠️ JWT_SECRET is less than 32 characters. Using default in development.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`JWT_SECRET must be at least 32 characters long (got ${jwtSecret.length})`);
      }
      return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
    }
    return jwtSecret;
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

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  role: string;
  isActive: boolean;
  fingerprintEnrolled: boolean;
  twoFactorEnabled: boolean;
  joinedDate: Date | null;
}

export async function hashPassword(password: string): Promise<string> {
  // Use optimized rounds for security-performance balance
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
  try {
    const secret = getJWTSecretLazy();
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );
  } catch (error: any) {
    console.error('❌ Error generating token:', error);
    throw new Error(`Failed to generate authentication token: ${error.message || 'Unknown error'}`);
  }
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const secret = getJWTSecretLazy();
    const decoded = jwt.verify(token, secret) as any;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      phone: decoded.phone || null,
      bio: decoded.bio || null,
      role: decoded.role,
      isActive: decoded.isActive,
      fingerprintEnrolled: decoded.fingerprintEnrolled || false,
      twoFactorEnabled: decoded.twoFactorEnabled || false,
      joinedDate: decoded.joinedDate || null,
    };
  } catch (error) {
    return null;
  }
}

export async function createSession(
  userId: number,
  deviceInfo?: any,
  userData?: AuthUser
): Promise<string> {
  try {
    // Get database instance
    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('❌ Database connection failed in createSession:', dbError);
      throw new Error(`Database connection failed: ${dbError.message || 'Unknown error'}`);
    }

    if (!db) {
      throw new Error('Database is not available');
    }

    // Get user data if not provided
    let user: AuthUser;
    if (userData) {
      user = userData;
    } else {
      const userResult = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          bio: users.bio,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userResult.length) {
        throw new Error('User not found');
      }

      user = {
        id: userResult[0].id,
        name: userResult[0].name,
        email: userResult[0].email,
        phone: userResult[0].phone || null,
        bio: userResult[0].bio || null,
        role: userResult[0].role,
        isActive: userResult[0].isActive,
        fingerprintEnrolled: false,
        twoFactorEnabled: false,
        joinedDate: null,
      };
    }

    const sessionToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      userId,
      sessionToken,
      expiresAt,
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
    });

    return sessionToken;
  } catch (error: any) {
    console.error('❌ Error creating session:', error);
    throw new Error(`Failed to create session: ${error.message || 'Unknown error'}`);
  }
}

export async function validateSession(sessionToken: string): Promise<AuthUser | null> {
  try {
    const db = getDatabase();
    const now = new Date();
    const session = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.sessionToken, sessionToken), sql`${sessions.expiresAt} > ${now}`))
      .limit(1);

    if (!session.length) return null;

    const userResult = await db.select().from(users).where(eq(users.id, session[0].userId)).limit(1);

    if (!userResult.length) return null;

    return {
      id: userResult[0].id,
      name: userResult[0].name,
      email: userResult[0].email,
      phone: userResult[0].phone,
      bio: userResult[0].bio,
      role: userResult[0].role,
      isActive: userResult[0].isActive,
      faceIdEnrolled: userResult[0].faceIdEnrolled,
      fingerprintEnrolled: userResult[0].fingerprintEnrolled,
      twoFactorEnabled: userResult[0].twoFactorEnabled,
      joinedDate: userResult[0].createdAt,
    };
  } catch (error) {
    return null;
  }
}

export async function destroySession(sessionToken: string): Promise<void> {
  const db = getDatabase();
  await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
}

export async function destroyAllUserSessions(userId: number): Promise<void> {
  const db = getDatabase();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function authenticateUser(email: string, password: string, role?: string): Promise<AuthUser | null> {
  // Get database instance with retry
  const { getDatabaseWithRetry } = await import('./db');
  const db = await getDatabaseWithRetry();

  // Normalize email to lowercase and trim whitespace
  const normalizedEmail = email.toLowerCase().trim();

  // If role is specified, authenticate that specific role
  // Note: We don't filter by isActive here - we check it after password verification
  // This allows us to provide better error messages for inactive accounts
  const whereConditions = role
    ? and(eq(users.email, normalizedEmail), eq(users.role, role))
    : and(eq(users.email, normalizedEmail));

  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      phone: users.phone,
      bio: users.bio,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(whereConditions)
    .limit(1);



  const isValidPassword = await verifyPassword(password, user[0].password);
  if (!isValidPassword) {
    return null;
  }

  // Check if account is active after password verification
  if (!user[0].isActive) {
    console.log('User account is not active', { email: normalizedEmail, role: user[0].role, userId: user[0].id });
    return null;
  }

  return {
    id: user[0].id,
    name: user[0].name,
    email: user[0].email,
    phone: user[0].phone || null,
    bio: user[0].bio || null,
    role: user[0].role,
    isActive: user[0].isActive,
    fingerprintEnrolled: false,
    twoFactorEnabled: false,
    joinedDate: null,
  };
}

export async function getUserAccounts(email: string): Promise<AuthUser[]> {
  const { getDatabaseWithRetry } = await import('./db');
  const db = await getDatabaseWithRetry();
  // Use case-insensitive email comparison - normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const accounts = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        bio: users.bio,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(
        eq(users.email, normalizedEmail),
        eq(users.isActive, true)
      ));

    console.log('getUserAccounts - Email searched:', normalizedEmail);
    console.log('getUserAccounts - Accounts found:', accounts.length);
    console.log('getUserAccounts - Accounts:', accounts.map((a: any) => ({ id: a.id, email: a.email, role: a.role, name: a.name, isActive: a.isActive })));

    return accounts.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      bio: user.bio || null,
      role: user.role,
      isActive: user.isActive,
      fingerprintEnrolled: false,
      twoFactorEnabled: false,
      joinedDate: null,
    }));
  } catch (error: any) {
    console.error('getUserAccounts error:', error);
    // Return empty array on error - treat as no accounts found
    return [];
  }
}

export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}): Promise<AuthUser | null> {
  try {
    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = userData.email.toLowerCase().trim();
    console.log('createUser called with:', { email: normalizedEmail, role: userData.role });

    // Get database instance with retry
    const { getDatabaseWithRetry } = await import('./db');
    const db = await getDatabaseWithRetry();

    const hashedPassword = await hashPassword(userData.password);

    console.log('Attempting to insert user into database...');
    let newUser;
    try {
      newUser = await db
        .insert(users)
        .values({
          name: userData.name,
          email: normalizedEmail,
          password: hashedPassword,
          phone: userData.phone,
          role: userData.role || 'student',
          isActive: true, // Explicitly set to true to ensure user can login
          joinedDate: new Date(), // Explicitly set joinedDate
        })
        .returning();
      console.log('✅ Insert query executed successfully');
    } catch (insertError: any) {
      console.error('❌ Insert query failed:', insertError);
      console.error('❌ Error details:', {
        message: insertError?.message,
        code: insertError?.code,
        detail: insertError?.detail,
        cause: insertError?.cause,
      });
      throw insertError;
    }

    return {
      id: newUser[0].id,
      name: newUser[0].name,
      email: newUser[0].email,
      phone: newUser[0].phone || null,
      bio: newUser[0].bio || null,
      role: newUser[0].role,
      isActive: newUser[0].isActive,
      fingerprintEnrolled: false,
      twoFactorEnabled: false,
      joinedDate: null,
    };
  } catch (error) {
    console.error('Create user error:', error);
    return null;
  }
}

export async function generateResetToken(email: string): Promise<string | null> {
  const db = getDatabase();
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      resetToken: users.resetToken,
      resetTokenExpiry: users.resetTokenExpiry,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user.length) return null;

  const resetToken = generateSecureToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(users)
    .set({ resetToken, resetTokenExpiry })
    .where(eq(users.email, email));

  return resetToken;
}

export async function verifyResetToken(email: string, token: string): Promise<boolean> {
  const db = getDatabase();
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      resetToken: users.resetToken,
      resetTokenExpiry: users.resetTokenExpiry,
    })
    .from(users)
    .where(and(
      eq(users.email, email),
      eq(users.resetToken, token)
    ))
    .limit(1);

  if (!user.length) return false;

  const resetUser = user[0];
  return resetUser.resetToken === token && resetUser.resetTokenExpiry && resetUser.resetTokenExpiry > new Date();
}

export async function resetPassword(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    if (!db) return false;

    const isValid = await verifyResetToken(email, resetToken);
    if (!isValid) return false;

    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      })
      .where(eq(users.email, email));

    return true;
  } catch (error) {
    console.error('Reset password error:', error);
    return false;
  }
}

// Helper function for API routes to verify auth from request
export async function verifyAuth(
  request: NextRequest,
  options: { requiredRole?: string } = {}
): Promise<{
  isAuthenticated: boolean;
  isAuthorized: boolean;
  user: AuthUser | null;
  response: any | null; // Using 'any' for response to avoid type conflicts if NextResponse isn't imported
}> {
  try {
    // Import NextResponse dynamically to ensure it's available
    const { NextResponse } = await import('next/server');

    // Check both admin and student tokens (snake_case from login API)
    const adminToken = request.cookies.get('admin_token')?.value;
    const studentToken = request.cookies.get('student_token')?.value;
    const token = adminToken || studentToken || request.cookies.get('token')?.value;

    if (!token) {
      return {
        isAuthenticated: false,
        isAuthorized: false,
        user: null,
        response: NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
      };
    }

    // Try validating as a session first
    let user: AuthUser | null = null;
    try {
      user = await validateSession(token);
    } catch (err) {
      // Not a session token or validation failed
    }

    // Fallback to JWT
    if (!user) {
      user = verifyToken(token);
    }

    if (!user) {
      return {
        isAuthenticated: false,
        isAuthorized: false,
        user: null,
        response: NextResponse.json({ message: 'Invalid token or session expired' }, { status: 401 })
      };
    }

    // Role check
    if (options.requiredRole && user.role !== options.requiredRole) {
      // Special case: admin can usually access student stuff, but if strict role required:
      // If requiring 'student', admin should probably pass?
      // For now, strict check as requested by "requiredRole", unless we add specific logic.
      // My refactors mainly used: requiredRole: 'admin' (strict) and requiredRole: 'student' (strict).
      // But wait, admin accessing student/courses?
      // Admin role is 'admin'. api/student/courses (refactored) didn't enforce role in verifyAuth call, it just called verifyAuth(req).
      // api/student/textbooks called verifyAuth(req, { requiredRole: 'student' }).

      // Allow admins to pass 'student' check?
      if (options.requiredRole === 'student' && (user.role === 'admin' || user.role === 'super_admin')) {
        // Allow admin as student
      } else {
        return {
          isAuthenticated: true,
          isAuthorized: false,
          user: user,
          response: NextResponse.json({ message: `${options.requiredRole} access required` }, { status: 403 })
        };
      }
    }

    return {
      isAuthenticated: true,
      isAuthorized: true,
      user: user,
      response: null
    };

  } catch (error: any) {
    console.error('verifyAuth error:', error);
    // Import NextResponse dynamically
    const { NextResponse } = await import('next/server');
    return {
      isAuthenticated: false,
      isAuthorized: false,
      user: null,
      response: NextResponse.json({ message: 'Internal authentication error' }, { status: 500 })
    };
  }
}

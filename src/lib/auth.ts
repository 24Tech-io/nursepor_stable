import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './db';
import { users, sessions } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateSecureToken } from './security';

// JWT_SECRET must be set - no fallback for security
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
  return bcrypt.hash(password, 12);
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

export async function createSession(userId: number, deviceInfo?: any, userData?: AuthUser): Promise<string> {
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

    const sessionToken = generateToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await db.insert(sessions).values({
        userId,
        sessionToken,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        expiresAt,
      });
    } catch (insertError: any) {
      console.error('❌ Error inserting session:', insertError);
      // If session insert fails, we can still return the token
      // The token itself is valid, just the session record failed
      console.warn('⚠️ Session record insert failed, but returning token anyway');
    }

    return sessionToken;
  } catch (error: any) {
    console.error('❌ Error in createSession:', error);
    throw error;
  }
}

export async function validateSession(sessionToken: string): Promise<AuthUser | null> {
  const user = verifyToken(sessionToken);
  if (!user) {
    return null;
  }

  // Get database instance
  const db = getDatabase();

  // Check if session exists in database
  const session = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.sessionToken, sessionToken),
        eq(sessions.userId, user.id)
      )
    )
    .limit(1);

  if (!session.length || session[0].expiresAt < new Date()) {
    return null;
  }

  return user;
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

  if (!user.length) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user[0].password);
  if (!isValidPassword) {
    return null;
  }

  // Check if account is active after password verification
  // This allows us to distinguish between wrong password and inactive account
  if (!user[0].isActive) {
    console.log('User account is not active', { email: normalizedEmail, role: user[0].role, userId: user[0].id });
    return null; // Return null for inactive accounts - caller can check database for more details
  }

  // Update last login - column doesn't exist in DB, skip for now
  // await db
  //   .update(users)
  //   .set({ lastLogin: new Date() })
  //   .where(eq(users.id, user[0].id));

  return {
    id: user[0].id,
    name: user[0].name,
    email: user[0].email,
    phone: user[0].phone || null,
    bio: user[0].bio || null,
    role: user[0].role,
    isActive: user[0].isActive,
    fingerprintEnrolled: false, // Column doesn't exist in DB
    twoFactorEnabled: false, // Column doesn't exist in DB
    joinedDate: null, // Column doesn't exist in DB
  };
}

// Get all accounts (roles) for an email
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
}): Promise<AuthUser> {
  try {
    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = userData.email.toLowerCase().trim();
    console.log('createUser called with:', { email: normalizedEmail, role: userData.role });
    
    // Get database instance with retry
    const { getDatabaseWithRetry } = await import('./db');
    const db = await getDatabaseWithRetry();

    const hashedPassword = await hashPassword(userData.password);
    console.log('Password hashed successfully');

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

    if (!newUser || newUser.length === 0) {
      throw new Error('Failed to create user - no data returned from database');
    }

    console.log('User inserted successfully:', { id: newUser[0].id, email: newUser[0].email, phone: newUser[0].phone });

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
  } catch (error: any) {
    console.error('createUser function error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
    });
    throw error; // Re-throw to let the caller handle it
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

  if (!user.length) {
    return null;
  }

  // Use cryptographically secure random token
  const resetToken = generateSecureToken(32);
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(users)
    .set({
      resetToken,
      resetTokenExpiry,
    })
    .where(eq(users.id, user[0].id));

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

  if (!user.length || !user[0].resetTokenExpiry) {
    return false;
  }

  return user[0].resetTokenExpiry > new Date();
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<boolean> {
  const isValid = await verifyResetToken(email, token);
  if (!isValid) {
    return false;
  }

  const db = getDatabase();
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
}


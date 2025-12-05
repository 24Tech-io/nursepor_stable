import bcrypt from 'bcryptjs';

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
  faceIdEnrolled: boolean;
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
      faceIdEnrolled: decoded.faceIdEnrolled || false,
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
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!userResult.length) {
        throw new Error('User not found');
      }

      user = {
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
    const session = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.sessionToken, sessionToken), sql`${sessions.expiresAt} > NOW()`))
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

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string } | null> {
  try {
    const db = getDatabase();
    if (!db) {
      console.error('❌ Database not available');
      return null;
    }

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!userResult.length) {
      console.log('❌ User not found:', email);
      return null;
    }

    const user = userResult[0];
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return null;
    }

    if (!user.isActive) {
      console.log('❌ User is not active:', email);
      return null;
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      role: user.role,
      isActive: user.isActive,
      faceIdEnrolled: user.faceIdEnrolled,
      fingerprintEnrolled: user.fingerprintEnrolled,
      twoFactorEnabled: user.twoFactorEnabled,
      joinedDate: user.createdAt,
    };

    const token = generateToken(authUser);

    return { user: authUser, token };
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    return null;
  }
}

export async function getUserAccounts(email: string): Promise<AuthUser[]> {
  try {
    const db = getDatabase();
    if (!db) return [];

    const userResults = await db.select().from(users).where(eq(users.email, email));

    return userResults.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      role: user.role,
      isActive: user.isActive,
      faceIdEnrolled: user.faceIdEnrolled,
      fingerprintEnrolled: user.fingerprintEnrolled,
      twoFactorEnabled: user.twoFactorEnabled,
      joinedDate: user.createdAt,
    }));
  } catch (error) {
    console.error('Get user accounts error:', error);
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
    const db = getDatabase();
    if (!db) return null;

    const hashedPassword = await hashPassword(userData.password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone || null,
        role: userData.role || 'student',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        faceIdEnrolled: false,
        fingerprintEnrolled: false,
        twoFactorEnabled: false,
      })
      .returning();

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      bio: newUser.bio,
      role: newUser.role,
      isActive: newUser.isActive,
      faceIdEnrolled: newUser.faceIdEnrolled,
      fingerprintEnrolled: newUser.fingerprintEnrolled,
      twoFactorEnabled: newUser.twoFactorEnabled,
      joinedDate: newUser.createdAt,
    };
  } catch (error) {
    console.error('Create user error:', error);
    return null;
  }
}

export async function generateResetToken(email: string): Promise<string | null> {
  try {
    const db = getDatabase();
    if (!db) return null;

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!userResult.length) return null;

    const resetToken = generateSecureToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({ resetToken, resetTokenExpiry })
      .where(eq(users.email, email));

    return resetToken;
  } catch (error) {
    console.error('Generate reset token error:', error);
    return null;
  }
}

export async function verifyResetToken(email: string, token: string): Promise<boolean> {
  try {
    const db = getDatabase();
    if (!db) return false;

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!userResult.length) return false;

    const user = userResult[0];
    return user.resetToken === token && user.resetTokenExpiry && user.resetTokenExpiry > new Date();
  } catch (error) {
    return false;
  }
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
export async function verifyAuth(request: any): Promise<AuthUser | null> {
  try {
    // Check both admin and student tokens
    const adminToken = request.cookies.get('adminToken')?.value;
    const studentToken = request.cookies.get('studentToken')?.value;
    const token = adminToken || studentToken;

    if (!token) {
      return null;
    }

    const user = verifyToken(token);
    return user;
  } catch (error) {
    console.error('verifyAuth error:', error);
    return null;
  }
}

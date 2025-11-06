import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, sessions } from './db/schema';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
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

export function verifyToken(token: string): AuthUser | null {
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

export async function createSession(userId: number, deviceInfo?: any): Promise<string> {
  const sessionToken = generateToken({ id: userId, name: '', email: '', role: '', isActive: true });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessions).values({
    userId,
    sessionToken,
    deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
    expiresAt,
  });

  return sessionToken;
}

export async function validateSession(sessionToken: string): Promise<AuthUser | null> {
  const user = verifyToken(sessionToken);
  if (!user) return null;

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
  await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
}

export async function destroyAllUserSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1);

  if (!user.length) return null;

  const isValidPassword = await verifyPassword(password, user[0].password);
  if (!isValidPassword) return null;

  // Update last login
  await db
    .update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, user[0].id));

  return {
    id: user[0].id,
    name: user[0].name,
    email: user[0].email,
    role: user[0].role,
    isActive: user[0].isActive,
  };
}

export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}): Promise<AuthUser> {
  const hashedPassword = await hashPassword(userData.password);

  const newUser = await db
    .insert(users)
    .values({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      phone: userData.phone,
      role: userData.role || 'student',
    })
    .returning();

  return {
    id: newUser[0].id,
    name: newUser[0].name,
    email: newUser[0].email,
    role: newUser[0].role,
    isActive: newUser[0].isActive,
  };
}

export async function generateResetToken(email: string): Promise<string | null> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user.length) return null;

  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
  const user = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, email),
      eq(users.resetToken, token)
    ))
    .limit(1);

  if (!user.length || !user[0].resetTokenExpiry) return false;

  return user[0].resetTokenExpiry > new Date();
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<boolean> {
  const isValid = await verifyResetToken(email, token);
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
}

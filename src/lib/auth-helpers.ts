import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, validateSession, generateToken } from './auth';
import { AuthUser } from './auth';
import { getDatabase } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

// Get authenticated user from request
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return null;
  }

  try {
    // First try to verify token directly (faster, works even if session expired)
    const user = verifyToken(token);
    if (user) {
      // Optionally validate session in database (more strict)
      // For now, we'll trust the JWT token if it's valid
      return user;
    }
  } catch (error) {
    // Token is invalid or expired
    console.log('Token verification failed:', error);
  }

  // Fallback: try to validate session in database
  try {
    const user = await validateSession(token);
    return user;
  } catch (error) {
    console.log('Session validation failed:', error);
    return null;
  }
}

// Check if user is admin
export async function requireAdmin(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
  const token = request.cookies.get('token')?.value;
  
  console.log('🔐 requireAdmin check - Token exists:', !!token, 'Path:', request.nextUrl.pathname);
  
  if (!token) {
    console.log('❌ requireAdmin - No token found');
    return NextResponse.json(
      { 
        error: 'Authentication required',
        message: 'Please log in to continue. Your session may have expired.'
      },
      { status: 401 }
    );
  }

  // Try to verify token directly first
  let user: AuthUser | null = null;
  try {
    user = verifyToken(token);
    if (user) {
      console.log('✅ requireAdmin - Token verified, User:', user.email, 'Role:', user.role);
    }
  } catch (error) {
    console.log('⚠️ Token verification error:', error);
  }

  // If token verification failed, try session validation
  if (!user) {
    try {
      user = await validateSession(token);
      if (user) {
        console.log('✅ requireAdmin - Session validated, User:', user.email, 'Role:', user.role);
      }
    } catch (error) {
      console.log('⚠️ Session validation error:', error);
    }
  }

  // If still no user, token is invalid or expired - but check if they have admin account
  if (!user) {
    console.log('⚠️ requireAdmin - Token invalid or expired, checking for admin account...');
    // Try to extract email from token payload even if expired
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.email) {
        const { getUserAccounts } = await import('@/lib/auth');
        const accounts = await getUserAccounts(payload.email);
        const adminAccount = accounts.find(acc => acc.role === 'admin' && acc.isActive);
        if (adminAccount) {
          console.log('✅ requireAdmin - Found admin account from expired token');
          user = {
            id: adminAccount.id,
            name: adminAccount.name,
            email: adminAccount.email,
            phone: adminAccount.phone || null,
            bio: adminAccount.bio || null,
            role: adminAccount.role,
            isActive: adminAccount.isActive,
            faceIdEnrolled: adminAccount.faceIdEnrolled || false,
            fingerprintEnrolled: adminAccount.fingerprintEnrolled || false,
            twoFactorEnabled: adminAccount.twoFactorEnabled || false,
            joinedDate: adminAccount.joinedDate || null,
          };
        } else {
          console.log('❌ requireAdmin - No admin account found');
          return NextResponse.json(
            { 
              error: 'Invalid or expired token',
              message: 'Your session has expired. Please log in again.'
            },
            { status: 401 }
          );
        }
      } else {
        console.log('❌ requireAdmin - Cannot extract email from token');
        return NextResponse.json(
          { 
            error: 'Invalid or expired token',
            message: 'Your session has expired. Please log in again.'
          },
          { status: 401 }
        );
      }
    } catch (e) {
      console.log('❌ requireAdmin - Cannot parse token');
      return NextResponse.json(
        { 
          error: 'Invalid or expired token',
          message: 'Your session has expired. Please log in again.'
        },
        { status: 401 }
      );
    }
  }

  // If user is not admin, check if they have an admin account with the same email
  if (user.role !== 'admin') {
    console.log('⚠️ requireAdmin - User role is not admin, checking for admin account...');
    try {
      const { getUserAccounts } = await import('@/lib/auth');
      const accounts = await getUserAccounts(user.email);
      const adminAccount = accounts.find(acc => acc.role === 'admin' && acc.isActive);
      
      if (adminAccount) {
        console.log('✅ requireAdmin - Found admin account, switching to admin role');
        // User has an admin account - use it instead
        user = {
          id: adminAccount.id,
          name: adminAccount.name,
          email: adminAccount.email,
          phone: adminAccount.phone || null,
          bio: adminAccount.bio || null,
          role: adminAccount.role,
          isActive: adminAccount.isActive,
          faceIdEnrolled: adminAccount.faceIdEnrolled || false,
          fingerprintEnrolled: adminAccount.fingerprintEnrolled || false,
          twoFactorEnabled: adminAccount.twoFactorEnabled || false,
          joinedDate: adminAccount.joinedDate || null,
        };
      } else {
        console.log('❌ requireAdmin - No admin account found for this email');
        return NextResponse.json(
          { 
            error: 'Admin access required',
            message: 'You do not have permission to access this resource. Please log in with an admin account.'
          },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error checking for admin account:', error);
      return NextResponse.json(
        { 
          error: 'Admin access required',
          message: 'You do not have permission to access this resource.'
        },
        { status: 403 }
      );
    }
  }

  if (!user.isActive) {
    return NextResponse.json(
      { 
        error: 'Account is deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      },
      { status: 403 }
    );
  }

  return { user };
}

// Check if user is authenticated
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Account is deactivated' },
      { status: 403 }
    );
  }

  return { user };
}

// Check if user owns resource or is admin
export async function requireOwnershipOrAdmin(
  request: NextRequest,
  resourceUserId: number
): Promise<{ user: AuthUser } | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult.user;

  // Admin can access anything
  if (user.role === 'admin') {
    return { user };
  }

  // User can only access their own resources
  if (user.id !== resourceUserId) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  return { user };
}

// Check if user is student or admin
export async function requireStudentOrAdmin(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult.user;

  if (user.role !== 'student' && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Student or admin access required' },
      { status: 403 }
    );
  }

  return { user };
}

// Verify authentication and return user (alias for requireAuth)
export async function verifyAuth(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
  return requireAuth(request);
}


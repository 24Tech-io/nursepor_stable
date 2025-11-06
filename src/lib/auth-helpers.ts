import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, validateSession } from './auth';
import { AuthUser } from './auth';

// Get authenticated user from request
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;

  // Validate session in database
  const user = await validateSession(token);
  return user;
}

// Check if user is admin
export async function requireAdmin(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
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
  if (authResult instanceof NextResponse) return authResult;

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


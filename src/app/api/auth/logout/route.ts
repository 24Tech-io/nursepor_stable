import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (token) {
      await destroySession(token);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

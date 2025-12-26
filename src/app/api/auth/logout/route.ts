import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get type from query parameter (admin, student, or null for both)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'admin') {
      // Logout admin only
      const adminToken = request.cookies.get('admin_token')?.value;
      if (adminToken) {
        try {
          await destroySession(adminToken);
        } catch (error) {
          logger.error('Error destroying admin session:', error);
        }
      }
      const response = NextResponse.json({ message: 'Logged out successfully' });
      response.cookies.delete('admin_token');
      response.cookies.delete('token');
      return response;
    } else if (type === 'student') {
      // Logout student only
      const studentToken = request.cookies.get('student_token')?.value;
      if (studentToken) {
        try {
          await destroySession(studentToken);
        } catch (error) {
          logger.error('Error destroying student session:', error);
        }
      }
      const response = NextResponse.json({ message: 'Logged out successfully' });
      response.cookies.delete('student_token');
      response.cookies.delete('token');
      return response;
    } else {
      // Clear both (default behavior for backward compatibility)
      const studentToken = request.cookies.get('student_token')?.value;
      const adminToken = request.cookies.get('admin_token')?.value;

      if (studentToken) {
        try {
          await destroySession(studentToken);
        } catch (error) {
          logger.error('Error destroying student session:', error);
        }
      }

      if (adminToken) {
        try {
          await destroySession(adminToken);
        } catch (error) {
          logger.error('Error destroying admin session:', error);
        }
      }

      const response = NextResponse.json({ message: 'Logged out successfully' });
      response.cookies.delete('student_token');
      response.cookies.delete('admin_token');
      response.cookies.delete('token');
      return response;
    }
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { message: 'Failed to logout', error: error.message },
      { status: 500 }
    );
  }
}

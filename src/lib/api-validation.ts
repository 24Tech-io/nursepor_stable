/**
 * API Validation Helper
 * Centralized validation for all API endpoints using Zod
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from './logger';

/**
 * Validate request body against a Zod schema
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      
      logger.warn('Validation failed', { errors });
      
      return {
        success: false,
        error: NextResponse.json(
          {
            message: 'Validation failed',
            errors,
          },
          { status: 400 }
        ),
      };
    }
    
    logger.error('Unexpected validation error', { error });
    return {
      success: false,
      error: NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: NextResponse } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return validateRequestBody(schema, params);
}

/**
 * Validate route parameters
 */
export function validateRouteParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string | undefined>
): { success: true; data: T } | { success: false; error: NextResponse } {
  return validateRequestBody(schema, params);
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional(),
  url: z.string().url('Invalid URL format').max(2048),
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }),
};

/**
 * Extract and validate request body
 */
export async function extractAndValidate<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json();
    return validateRequestBody(schema, body);
  } catch (error) {
    logger.error('Failed to parse request body', { error });
    return {
      success: false,
      error: NextResponse.json(
        { message: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}



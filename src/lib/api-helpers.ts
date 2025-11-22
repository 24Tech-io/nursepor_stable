import { NextRequest, NextResponse } from 'next/server';

// Global error handler wrapper for API routes
export function withErrorHandler(
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
    return async (req: NextRequest, context?: any) => {
        try {
            return await handler(req, context);
        } catch (error: any) {
            console.error('API Error:', error);

            // Determine error type and status code
            let statusCode = 500;
            let message = 'Internal server error';

            if (error.name === 'ValidationError') {
                statusCode = 400;
                message = error.message;
            } else if (error.name === 'UnauthorizedError') {
                statusCode = 401;
                message = 'Unauthorized';
            } else if (error.name === 'ForbiddenError') {
                statusCode = 403;
                message = 'Forbidden';
            } else if (error.name === 'NotFoundError') {
                statusCode = 404;
                message = 'Resource not found';
            } else if (error.code === 'P2002') {
                // Prisma/Drizzle unique constraint violation
                statusCode = 409;
                message = 'Resource already exists';
            } else if (error.code === 'P2025') {
                // Prisma/Drizzle record not found
                statusCode = 404;
                message = 'Resource not found';
            }

            return NextResponse.json(
                {
                    error: message,
                    ...(process.env.NODE_ENV === 'development' && {
                        details: error.message,
                        stack: error.stack,
                    }),
                },
                { status: statusCode }
            );
        }
    };
}

// Custom error classes
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends Error {
    constructor(message: string = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

export class NotFoundError extends Error {
    constructor(message: string = 'Not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

// Pagination helper
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export function getPaginationParams(request: NextRequest): PaginationParams {
    const { searchParams } = new URL(request.url);

    return {
        page: parseInt(searchParams.get('page') || '1'),
        limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Max 100
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };
}

export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
): PaginatedResponse<T> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}

// Response helpers
export function successResponse(data: any, message?: string) {
    return NextResponse.json({
        success: true,
        message,
        data,
    });
}

export function errorResponse(message: string, statusCode: number = 400) {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status: statusCode }
    );
}

import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-this-in-production-at-least-32-chars-long';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
}

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

export async function verifyToken(token: string): Promise<AdminUser | null> {
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return {
            id: payload.id as number,
            name: payload.name as string,
            email: payload.email as string,
            role: payload.role as string,
            isActive: payload.isActive as boolean,
        };
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return null;
    }
}

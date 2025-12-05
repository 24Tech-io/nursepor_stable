import { NextRequest, NextResponse } from 'next/server';

// Simple diagnostic endpoint to check if environment variables are set
// DO NOT expose actual values - only check if they exist
export async function GET(request: NextRequest) {
  const checks = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    JWT_SECRET_LENGTH: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    NODE_ENV: process.env.NODE_ENV || 'not set',
    DATABASE_URL_HAS_SSL: process.env.DATABASE_URL?.includes('sslmode=require') || false,
  };

  const allGood = checks.DATABASE_URL && checks.JWT_SECRET && checks.JWT_SECRET_LENGTH >= 32;

  return NextResponse.json({
    status: allGood ? 'healthy' : 'missing_env_vars',
    checks,
    message: allGood 
      ? '✅ All environment variables are properly configured!' 
      : '❌ Some environment variables are missing or incorrect.',
    instructions: !allGood ? {
      missing: [],
      ...((!checks.DATABASE_URL) && { DATABASE_URL: 'Set your Neon database connection string' }),
      ...((!checks.JWT_SECRET) && { JWT_SECRET: 'Set a random 32+ character string' }),
      ...((checks.JWT_SECRET_LENGTH < 32) && { JWT_SECRET_LENGTH: 'JWT_SECRET must be at least 32 characters' }),
      ...(!checks.DATABASE_URL_HAS_SSL && { DATABASE_URL_SSL: 'Add ?sslmode=require to end of DATABASE_URL' }),
    } : undefined,
  }, {
    status: allGood ? 200 : 500,
  });
}


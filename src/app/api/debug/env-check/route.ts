import { NextResponse } from 'next/server';

export async function GET() {
  // Don't expose full secrets, but show enough to debug
  const jwtSecret = process.env.JWT_SECRET;
  const jwtSecretTrimmed = jwtSecret?.trim();
  
  const jwtSecretInfo = jwtSecret 
    ? {
        exists: true,
        rawLength: jwtSecret.length,
        trimmedLength: jwtSecretTrimmed?.length || 0,
        first4: jwtSecret.substring(0, 4),
        last4: jwtSecret.substring(jwtSecret.length - 4),
        hasLeadingSpace: jwtSecret.startsWith(' '),
        hasTrailingSpace: jwtSecret.endsWith(' '),
        isValid: (jwtSecretTrimmed?.length || 0) >= 32,
        preview: jwtSecret.length > 8 
          ? `${jwtSecret.substring(0, 4)}...${jwtSecret.substring(jwtSecret.length - 4)}`
          : '***',
      }
    : { exists: false };

  return NextResponse.json({
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      databaseUrlPreview: process.env.DATABASE_URL 
        ? `${process.env.DATABASE_URL.substring(0, 30)}...`
        : 'Not set',
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    },
    jwtSecret: jwtSecretInfo,
    timestamp: new Date().toISOString(),
  });
}


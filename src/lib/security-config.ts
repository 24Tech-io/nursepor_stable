/**
 * Security Configuration
 * Centralized security settings and constants
 */

export const SecurityConfig = {
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
  },

  // CORS
  cors: {
    allowedOrigins: [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.ALLOWED_ORIGIN_1,
      process.env.ALLOWED_ORIGIN_2,
      process.env.ALLOWED_ORIGIN_3,
      process.env.ALLOWED_ORIGIN_4,
    ].filter(Boolean) as string[],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  },

  // File Upload
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      documents: ['application/pdf'],
      videos: ['video/mp4', 'video/webm'],
    },
    allowedExtensions: {
      images: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      documents: ['pdf'],
      videos: ['mp4', 'webm'],
    },
    blockedExtensions: ['exe', 'bat', 'sh', 'php', 'js', 'html', 'htm', 'svg', 'xml'],
  },

  // Password Policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
    maxAge: 90, // days
    historyCount: 5, // prevent reuse of last 5 passwords
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: '30d',
    algorithm: 'HS256' as const,
  },

  // CSRF
  csrf: {
    secret: process.env.CSRF_SECRET || 'change-this-csrf-secret-in-production',
    cookieName: 'csrf-token',
    headerName: 'X-CSRF-Token',
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-session-secret-in-production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    cookieName: 'session',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://*.neon.tech'],
      frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production',
    },
  },

  // IP Blocking
  ipBlocking: {
    enabled: true,
    maxFailedAttempts: 5,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    whitelist: ['127.0.0.1', '::1'], // localhost
    blacklist: [] as string[], // Add known malicious IPs
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    toFile: process.env.LOG_TO_FILE === 'true',
    directory: process.env.LOG_DIR || './logs',
    maxFiles: 30, // Keep logs for 30 days
    maxSize: '20m', // 20MB per log file
  },

  // Security Headers
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  },

  // API Security
  api: {
    timeout: 30000, // 30 seconds
    maxPayloadSize: '10mb',
    validateContentType: true,
    requireApiKey: false, // Set to true if using API keys
  },

  // Database
  database: {
    connectionTimeout: 10000,
    queryTimeout: 5000,
    maxConnections: 10,
    ssl: process.env.NODE_ENV === 'production',
  },

  // Email
  email: {
    rateLimit: {
      maxPerHour: 10,
      maxPerDay: 50,
    },
    allowedDomains: [], // Empty = allow all, or specify allowed domains
    blockedDomains: ['tempmail.com', '10minutemail.com'], // Block temporary email providers
  },

  // Feature Flags
  features: {
    enableFaceRecognition: true,
    enableFingerprint: false,
    enable2FA: false,
    enableEmailVerification: true,
    enablePasswordReset: true,
    enableAccountLocking: true,
    enableAuditLog: true,
  },
};

// Validation function to check if all required secrets are set
export function validateSecurityConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    // Check for default/weak secrets
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-secret-in-production') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }

    if (
      !process.env.CSRF_SECRET ||
      process.env.CSRF_SECRET === 'change-this-csrf-secret-in-production'
    ) {
      errors.push('CSRF_SECRET must be changed from default value in production');
    }

    if (
      !process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET === 'change-this-session-secret-in-production'
    ) {
      errors.push('SESSION_SECRET must be changed from default value in production');
    }

    // Check secret lengths
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET should be at least 32 characters long');
    }

    // Check database configuration
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL must be set');
    }

    // Check HTTPS enforcement
    if (process.env.FORCE_HTTPS !== 'true') {
      errors.push('FORCE_HTTPS should be enabled in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Initialize security config check on startup
if (typeof window === 'undefined') {
  // Server-side only
  const validation = validateSecurityConfig();
  if (!validation.valid) {
    console.warn('⚠️  Security Configuration Warnings:');
    validation.errors.forEach((error) => console.warn(`   - ${error}`));
  }
}

export default SecurityConfig;

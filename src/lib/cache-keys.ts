/**
 * Cache Key Constants
 * Centralized cache key generation for consistent naming across the application
 * All cache keys follow the pattern: namespace:entity:identifier
 */

export const CacheKeys = {
  // ============================================
  // AUTHENTICATION CACHE KEYS
  // ============================================
  AUTH_TOKEN: (tokenHash: string) => `auth:token:${tokenHash.substring(0, 20)}`,
  AUTH_USER: (userId: number) => `auth:user:${userId}`,
  AUTH_USER_BY_EMAIL: (email: string, role: string) => `auth:user:email:${email}:${role}`,

  // ============================================
  // COURSE CACHE KEYS
  // ============================================
  COURSE: (id: number) => `cache:course:${id}`,
  COURSE_WITH_MODULES: (id: number) => `cache:course:modules:${id}`,
  COURSE_LIST: (filters?: string) => `cache:course:list:${filters || 'all'}`,
  COURSE_PUBLISHED_LIST: () => `cache:course:list:published`,
  COURSE_COUNT: () => `cache:course:count`,

  // ============================================
  // ENROLLMENT CACHE KEYS
  // ============================================
  USER_ENROLLMENTS: (userId: number) => `cache:user:enrollments:${userId}`,
  USER_ENROLLED_COURSES: (userId: number) => `cache:user:enrolled-courses:${userId}`,
  ENROLLMENT_STATUS: (userId: number, courseId: number) => 
    `cache:enrollment:${userId}:${courseId}`,
  ENROLLMENT_COUNT: (userId: number) => `cache:user:enrollment-count:${userId}`,

  // ============================================
  // PROGRESS CACHE KEYS
  // ============================================
  USER_PROGRESS: (userId: number, courseId: number) => 
    `cache:user:${userId}:progress:${courseId}`,
  USER_PROGRESS_ALL: (userId: number) => `cache:user:${userId}:progress:all`,
  USER_STATS: (userId: number) => `cache:user:${userId}:stats`,
  VIDEO_PROGRESS: (userId: number, chapterId: number) => 
    `cache:video:${userId}:${chapterId}`,

  // ============================================
  // REQUEST CACHE KEYS
  // ============================================
  USER_REQUESTS: (userId: number) => `cache:user:requests:${userId}`,
  USER_PENDING_REQUESTS: (userId: number) => `cache:user:pending-requests:${userId}`,
  REQUEST_COUNT: (status?: string) => `cache:requests:count:${status || 'all'}`,

  // ============================================
  // Q-BANK CACHE KEYS
  // ============================================
  QBANK: (id: number) => `cache:qbank:${id}`,
  QBANK_QUESTIONS: (qbankId: number, filters?: string) => 
    `cache:qbank:${qbankId}:questions:${filters || 'all'}`,
  QBANK_CATEGORIES: (qbankId: number) => `cache:qbank:${qbankId}:categories`,
  QBANK_ENROLLMENT: (userId: number, qbankId: number) => 
    `cache:qbank:enrollment:${userId}:${qbankId}`,
  QBANK_ANALYTICS: (userId: number, qbankId: number, type: string) => 
    `cache:qbank:analytics:${userId}:${qbankId}:${type}`,

  // ============================================
  // QUIZ CACHE KEYS
  // ============================================
  QUIZ: (quizId: number) => `cache:quiz:${quizId}`,
  QUIZ_QUESTIONS: (quizId: number) => `cache:quiz:${quizId}:questions`,
  QUIZ_HISTORY: (userId: number) => `cache:quiz:history:${userId}`,

  // ============================================
  // ADMIN CACHE KEYS
  // ============================================
  ADMIN_STUDENTS: (filters?: string) => `cache:admin:students:${filters || 'all'}`,
  ADMIN_STUDENTS_COUNT: () => `cache:admin:students:count`,
  ADMIN_COURSES: (filters?: string) => `cache:admin:courses:${filters || 'all'}`,
  ADMIN_COURSES_COUNT: () => `cache:admin:courses:count`,
  ADMIN_REQUESTS: (status?: string) => `cache:admin:requests:${status || 'all'}`,
  ADMIN_STATS: () => `cache:admin:stats`,

  // ============================================
  // ANALYTICS CACHE KEYS
  // ============================================
  ANALYTICS_COURSE_STATS: (courseId?: number) => 
    `cache:analytics:course-stats:${courseId || 'all'}`,
  ANALYTICS_ENROLLMENT: () => `cache:analytics:enrollment`,
  ANALYTICS_ENGAGEMENT: () => `cache:analytics:engagement`,

  // ============================================
  // TEXTBOOK CACHE KEYS
  // ============================================
  TEXTBOOK: (id: number) => `cache:textbook:${id}`,
  TEXTBOOK_LIST: (courseId?: number) => `cache:textbook:list:${courseId || 'all'}`,
  TEXTBOOK_PURCHASES: (userId: number) => `cache:textbook:purchases:${userId}`,

  // ============================================
  // PAYMENT CACHE KEYS
  // ============================================
  PAYMENT_STATUS: (paymentId: string) => `cache:payment:status:${paymentId}`,
  USER_PAYMENTS: (userId: number) => `cache:user:payments:${userId}`,

  // ============================================
  // NOTIFICATION CACHE KEYS
  // ============================================
  USER_NOTIFICATIONS: (userId: number) => `cache:notifications:${userId}`,
  NOTIFICATION_COUNT: (userId: number) => `cache:notifications:count:${userId}`,

  // ============================================
  // SECURITY CACHE KEYS (from existing cache.ts)
  // ============================================
  BRUTE_FORCE_IP: (ip: string) => `security:brute-force:ip:${ip}`,
  BRUTE_FORCE_USERNAME: (username: string) => `security:brute-force:username:${username}`,
  BLOCKED_IP: (ip: string) => `security:blocked:ip:${ip}`,
  THREAT_SCORE: (ip: string) => `security:threat:score:${ip}`,
  CSRF_TOKEN: (sessionId: string) => `security:csrf:${sessionId}`,
  RATE_LIMIT: (ip: string, path: string) => `ratelimit:${ip}:${path}`,
};

/**
 * Generate cache key with optional prefix
 */
export function generateCacheKey(
  namespace: string,
  ...parts: (string | number)[]
): string {
  return `${namespace}:${parts.join(':')}`;
}

/**
 * Invalidate cache pattern helper
 */
export function getCachePattern(namespace: string, ...parts: (string | number)[]): string {
  const base = parts.length > 0 ? `${namespace}:${parts.join(':')}` : `${namespace}:*`;
  return `${base}*`;
}


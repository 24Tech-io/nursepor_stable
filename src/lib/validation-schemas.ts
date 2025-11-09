/**
 * Input Validation Schemas using Zod
 * Centralized validation for all user inputs to prevent injection attacks
 */

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .trim();

const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL must not exceed 2048 characters');

const idSchema = z.string()
  .uuid('Invalid ID format')
  .or(z.string().regex(/^[0-9]+$/, 'Invalid ID format'));

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  role: z.enum(['student', 'instructor', 'admin']).default('student'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ['confirmNewPassword'],
});

// Profile schemas
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  bio: z.string().max(1000, 'Bio must not exceed 1000 characters').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

export const uploadProfilePictureSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must not exceed 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPEG, PNG, and WebP images are allowed'
    ),
});

// Course schemas
export const createCourseSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters')
    .trim(),
  price: z.number()
    .min(0, 'Price must be non-negative')
    .max(999999.99, 'Price must not exceed 999999.99'),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters'),
  thumbnail: urlSchema.optional(),
  published: z.boolean().default(false),
});

export const updateCourseSchema = createCourseSchema.partial();

// Blog schemas
export const createBlogSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(200, 'Slug must not exceed 200 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .trim(),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must not exceed 50000 characters'),
  excerpt: z.string()
    .max(500, 'Excerpt must not exceed 500 characters')
    .optional(),
  published: z.boolean().default(false),
  tags: z.array(z.string().max(30)).max(10, 'Maximum 10 tags allowed').optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

// Payment schemas
export const createCheckoutSchema = z.object({
  courseId: idSchema,
  successUrl: urlSchema.optional(),
  cancelUrl: urlSchema.optional(),
});

// Admin schemas
export const updateUserRoleSchema = z.object({
  userId: idSchema,
  role: z.enum(['student', 'instructor', 'admin']),
});

export const deleteUserSchema = z.object({
  userId: idSchema,
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Must confirm deletion' }),
  }),
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must not exceed 10MB')
    .refine(
      (file) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'video/mp4',
          'video/webm',
        ];
        return allowedTypes.includes(file.type);
      },
      'File type not allowed'
    ),
  category: z.enum(['profile', 'course', 'blog', 'document']).optional(),
});

// Search and pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query must not exceed 200 characters')
    .trim(),
  ...paginationSchema.shape,
});

// Contact/Support schemas
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject must not exceed 200 characters')
    .trim(),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must not exceed 5000 characters')
    .trim(),
});

// Face recognition schemas
export const faceEnrollmentSchema = z.object({
  userId: idSchema,
  faceDescriptor: z.array(z.number()).length(128, 'Face descriptor must have exactly 128 dimensions'),
});

export const faceLoginSchema = z.object({
  faceDescriptor: z.array(z.number()).length(128, 'Face descriptor must have exactly 128 dimensions'),
});

// Generic validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: z.ZodError 
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Sanitize and validate helper
export function sanitizeAndValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  sanitize: boolean = true
): { success: boolean; data?: T; errors?: string[] } {
  try {
    let processedData = data;

    // Basic sanitization for string fields
    if (sanitize && typeof data === 'object' && data !== null) {
      processedData = Object.entries(data).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          // Remove null bytes and trim
          acc[key] = value.replace(/\0/g, '').trim();
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
    }

    const validated = schema.parse(processedData);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}


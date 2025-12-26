import { z } from 'zod';

// Course validation schemas
export const createCourseSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    instructor: z.string().min(2, 'Instructor name required'),
    pricing: z.number().min(0, 'Price cannot be negative'),
    status: z.enum(['draft', 'published']).default('draft'),
    isDefaultUnlocked: z.boolean().default(false),
    isRequestable: z.boolean().default(true),
});

export const updateCourseSchema = createCourseSchema.partial();

// Module validation schemas
export const createModuleSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().optional(),
    order: z.number().int().min(0),
    duration: z.number().int().min(0).default(0),
});

// Chapter validation schemas
export const createChapterSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().optional(),
    type: z.enum(['video', 'textbook', 'mcq', 'qbank']),
    order: z.number().int().min(0),
    videoUrl: z.string().url().optional(),
    videoProvider: z.enum(['youtube', 'vimeo']).optional(),
    videoDuration: z.number().int().min(0).optional(),
    textbookContent: z.string().optional(),
    readingTime: z.number().int().min(0).optional(),
    mcqData: z.string().optional(),
    prerequisiteChapterId: z.number().int().positive().optional(),
});

export const updateChapterSchema = createChapterSchema.partial();

// Q-Bank validation schemas
export const createQuestionSchema = z.object({
    questionBankId: z.number().int().positive(),
    question: z.string().min(10, 'Question must be at least 10 characters'),
    questionType: z.enum(['multiple_choice', 'sata', 'ngn_case_study', 'unfolding_ngn', 'bowtie', 'matrix', 'trend']),
    options: z.string(), // JSON string
    correctAnswer: z.string(), // JSON string
    explanation: z.string().optional(),
    subject: z.string().optional(),
    lesson: z.string().optional(),
    testType: z.enum(['classic', 'ngn', 'mixed']).default('mixed'),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    points: z.number().int().positive().default(1),
});

// Blog validation schemas
export const createBlogSchema = z.object({
    title: z.string().min(3).max(200),
    slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
    content: z.string().min(50),
    author: z.string().min(2),
    cover: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published']).default('draft'),
});

export const updateBlogSchema = createBlogSchema.partial();

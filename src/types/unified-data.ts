/**
 * Unified Data Types
 * Shared TypeScript interfaces for centralized data architecture
 */

export interface EnrollmentRecord {
  courseId: number;
  progress: number;
  status: 'active' | 'completed' | 'suspended';
  enrolledAt: Date | string;
  lastAccessed?: Date | string | null;
  source: 'enrollments' | 'studentProgress';
}

export interface CourseRequest {
  id: number;
  courseId: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  requestedAt: Date | string;
  reviewedAt?: Date | string | null;
  reviewedBy?: number | null;
}

export interface CourseData {
  id: number;
  title: string;
  description: string | null;
  instructor: string;
  thumbnail: string | null;
  pricing: number;
  status: 'draft' | 'published' | 'active';
  isRequestable: boolean;
  isDefaultUnlocked: boolean;
  isPublic: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentStats {
  coursesEnrolled: number;
  coursesCompleted: number;
  hoursLearned: number;
  pendingRequests: number;
  quizzesCompleted?: number;
  currentStreak?: number;
  totalPoints?: number;
}

export interface StudentDataSnapshot {
  userId: number;
  enrollments: EnrollmentRecord[];
  requests: CourseRequest[];
  availableCourses: CourseData[];
  stats: StudentStats;
  timestamp: number;
}

export interface UnifiedStudentData {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  enrollments: EnrollmentRecord[];
  enrolledCourseIds: number[];
  requests: CourseRequest[];
  pendingRequests: CourseRequest[];
  courses: CourseData[];
  stats: StudentStats;
  timestamp: number;
}




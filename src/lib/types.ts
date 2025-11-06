export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'student'
  phone?: string
  isActive?: boolean
  joinedDate?: Date
  faceIdEnrolled?: boolean
  bio?: string
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  thumbnail: string
  modules: Module[]
  pricing?: number
  status: 'draft' | 'published'
  isRequestable: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface Module {
  id: string
  title: string
  description: string
  videos: Video[]
  quizzes: Quiz[]
  duration: number // in minutes
}

export interface Video {
  id: string
  title: string
  url: string
  provider: 'youtube' | 'vimeo'
  duration: number // in minutes
  watchedTime: number // in seconds
}

export interface Quiz {
  id: string
  title: string
  questions: MCQQuestion[]
  passMark: number
  timeLimit?: number // in minutes
  showAnswers: boolean
}

export interface MCQQuestion {
  id: string
  question: string
  options: Record<string, string>
  correctAnswer: string
  explanation: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  author: string
  cover: string
  tags: string[]
  status: 'draft' | 'published'
  createdAt: Date
  updatedAt?: Date
}

export interface AccessRequest {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseTitle: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
}

export interface StudentProgress {
  studentId: string
  courseId: string
  completedModules: string[]
  completedQuizzes: string[]
  watchedVideos: string[]
  quizScores: Record<string, number>
  totalProgress: number
  lastAccessed: Date
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  unlockedAt?: Date
}

export interface DailyVideo {
  id: string
  title: string
  description: string
  url: string
  provider: 'youtube' | 'vimeo'
  duration: number
  day: number
  isCompleted: boolean
  completedAt?: Date
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

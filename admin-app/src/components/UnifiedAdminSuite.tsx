'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from './NotificationProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Database,
  Users,
  Settings,
  Plus,
  Save,
  ArrowLeft,
  Layers,
  Activity,
  FileText,
  Video,
  CheckCircle,
  Grid,
  Monitor,
  ChevronRight,
  Trash2,
  Edit3,
  BarChart,
  BookOpen,
  Search,
  Flag,
  AlertTriangle,
  X,
  Filter,
  Zap,
  Book,
  MoreHorizontal,
  Image as ImageIcon,
  List,
  MousePointer,
  Highlighter,
  Type,
  Divide,
  GripVertical,
  CheckSquare,
  AlignLeft,
  User,
  Shield,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  Target,
  FileDown,
  Eye,
  UserX,
} from 'lucide-react';
import FileUpload from './FileUpload';
import VideoUploadModal from './VideoUploadModal';
import DocumentUploadModal from './DocumentUploadModal';
import StudentActivityModal from './StudentActivityModal';
import { Upload, Link as LinkIcon } from 'lucide-react';
import { convertToEmbedUrl, parseVideoUrl } from '@/lib/video-utils';
import {
  StatCardSkeleton,
  ActivityLogSkeleton,
  TableSkeleton,
  CourseCardSkeleton,
  QuestionRowSkeleton,
  ModuleSkeleton,
} from './LoadingSkeleton';

// --- DATA CONSTANTS ---
const QUESTION_MODES = {
  CLASSIC: {
    id: 'classic',
    label: 'Classic NCLEX',
    color: 'blue',
    types: [
      { id: 'standard', label: 'Single Best Answer (Multiple Choice)' },
      { id: 'sata_classic', label: 'Select All That Apply (Traditional)' },
      { id: 'ordering', label: 'Ordered Response' },
      { id: 'calculation', label: 'Dosage Calculation' },
    ],
  },
  NGN: {
    id: 'ngn',
    label: 'Next Gen (NGN)',
    color: 'purple',
    types: [
      { id: 'casestudy', label: 'Case Study (6-Step CJMM)' },
      { id: 'bowtie', label: 'Bow-Tie' },
      { id: 'matrix', label: 'Matrix / Grid' },
      { id: 'trend', label: 'Trend (Clinical Data)' },
      { id: 'drag_drop', label: 'Extended Drag & Drop' },
      { id: 'highlight', label: 'Highlight Text' },
      { id: 'cloze', label: 'Cloze (Drop-Down)' },
    ],
  },
};

const CJMM_STEPS = [
  { step: 1, label: 'Recognize Cues' },
  { step: 2, label: 'Analyze Cues' },
  { step: 3, label: 'Prioritize Hypotheses' },
  { step: 4, label: 'Generate Solutions' },
  { step: 5, label: 'Take Action' },
  { step: 6, label: 'Evaluate Outcomes' },
];

// ⚡ PERFORMANCE: Lazy load heavy components for code splitting
import dynamic from 'next/dynamic';

const StudentProfile = dynamic(() => import('./admin/StudentProfile'), {
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
    </div>
  ),
});

const QuestionTypeBuilder = dynamic(() => import('./qbank/QuestionTypeBuilder'), {
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
    </div>
  ),
});

// --- ROOT COMPONENT ---
export default function NurseProAdminUltimate({
  initialModule = 'dashboard',
  initialStudentId,
  initialCourse,
}: {
  initialModule?: string;
  initialStudentId?: number;
  initialCourse?: any;
}) {
  const [currentModule, setCurrentModule] = useState(initialModule);
  const [activeItem, setActiveItem] = useState(initialCourse || null);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(initialStudentId || null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [adminUser, setAdminUser] = useState<any>(null);
  const router = useRouter();

  // Sync module with URL on mount and when URL changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;

      // Map paths to modules
      const pathToModule: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/dashboard/analytics': 'analytics',
        '/dashboard/students': 'students',
        '/dashboard/requests': 'requests',
        '/dashboard/courses': 'courses',
        '/dashboard/qbank': 'qbank',
        '/dashboard/profile': 'admin_profile',
        '/dashboard/daily-videos': 'daily_videos',
        '/dashboard/blogs': 'blogs',
        '/dashboard/quizzes': 'quizzes',
      };

      // Check if it's a student profile route
      const studentProfileMatch = path.match(/^\/dashboard\/students\/(\d+)$/);
      if (studentProfileMatch) {
        const studentId = parseInt(studentProfileMatch[1]);
        if (studentId !== activeStudentId) {
          setActiveStudentId(studentId);
        }
        if (currentModule !== 'student_profile') {
          setCurrentModule('student_profile');
        }
        return;
      }

      // Check if it's a course editor route
      const courseEditorMatch = path.match(/^\/dashboard\/courses\/(\d+)$/);
      if (courseEditorMatch) {
        const courseId = parseInt(courseEditorMatch[1]);
        // Fetch course data and set as activeItem
        fetch(`/api/courses/${courseId}`, { credentials: 'include' })
          .then((res) => res.json())
          .then((data) => {
            if (data.course) {
              setActiveItem(data.course);
              setCurrentModule('course_editor');
            }
          })
          .catch(() => setCurrentModule('courses'));
        return;
      }

      // Check if it's a qbank editor route
      const qbankEditorMatch = path.match(/^\/dashboard\/qbank\/(\d+)$/);
      if (qbankEditorMatch) {
        const questionId = parseInt(qbankEditorMatch[1]);
        // Fetch question data and set as activeItem
        fetch(`/api/qbank/${questionId}`, { credentials: 'include' })
          .then((res) => res.json())
          .then((data) => {
            if (data.question) {
              setActiveItem(data.question);
              setCurrentModule('qbank_editor');
            }
          })
          .catch(() => setCurrentModule('qbank'));
        return;
      }

      // Default path mapping
      const module = pathToModule[path] || initialModule;
      if (module !== currentModule) {
        setCurrentModule(module);
      }
    }
  }, [router, initialModule]); // Run when router or initialModule changes

  const nav = (mod: string, id?: number) => {
    // Update state immediately for instant UI response
    setCurrentModule(mod);

    // Update URL with proper routing
    if (typeof window !== 'undefined') {
      const routeMap: Record<string, string> = {
        dashboard: '/dashboard',
        analytics: '/dashboard/analytics',
        students: '/dashboard/students',
        student_profile: id ? `/dashboard/students/${id}` : '/dashboard/students',
        requests: '/dashboard/requests',
        courses: '/dashboard/courses',
        course_editor: id ? `/dashboard/courses/${id}` : '/dashboard/courses',
        qbank: '/dashboard/qbank',
        qbank_editor: id ? `/dashboard/qbank/${id}` : '/dashboard/qbank',
        admin_profile: '/dashboard/profile',
        daily_videos: '/dashboard/daily-videos',
        blogs: '/dashboard/blogs',
        quizzes: '/dashboard/quizzes',
      };
      const newUrl = routeMap[mod] || '/dashboard';
      // Use pushState to update URL and allow browser back/forward
      router.push(newUrl);
    }
  };

  // Fetch admin user data
  React.useEffect(() => {
    const fetchAdminUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching admin user:', error);
      }
    };
    fetchAdminUser();
  }, []);

  return (
    <div className="flex h-screen bg-[#0b0d12] text-slate-200 font-sans selection:bg-purple-500 selection:text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#11131a] border-r border-slate-800/50 flex flex-col flex-shrink-0 z-30">
        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Book size={20} />
            </div>
            NursePro
          </h1>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest ml-1">
            Academy Command v3.1
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
          <NavSection title="Overview">
            <NavItem
              icon={<Layout size={18} />}
              label="Dashboard"
              active={currentModule === 'dashboard'}
              onClick={() => nav('dashboard')}
              badge={undefined}
            />
            <NavItem
              icon={<BarChart size={18} />}
              label="Analytics"
              active={currentModule === 'analytics'}
              onClick={() => nav('analytics')}
              badge={undefined}
            />
          </NavSection>

          <NavSection title="User Management">
            <NavItem
              icon={<Users size={18} />}
              label="Students"
              active={currentModule === 'students'}
              onClick={() => nav('students')}
              badge={undefined}
            />
            <NavItem
              icon={<Flag size={18} />}
              label="Access Requests"
              active={currentModule === 'requests'}
              onClick={() => nav('requests')}
              badge={undefined}
            />
          </NavSection>

          <NavSection title="Content Engine">
            <NavItem
              icon={<BookOpen size={18} />}
              label="Course Builder"
              active={currentModule.includes('course')}
              onClick={() => nav('courses')}
              badge={undefined}
            />
            <NavItem
              icon={<Database size={18} />}
              label="Q-Bank Manager"
              active={currentModule.includes('qbank') && currentModule !== 'qbank_analytics'}
              onClick={() => nav('qbank')}
              badge={undefined}
            />
            <NavItem
              icon={<TrendingUp size={18} />}
              label="Q-Bank Analytics"
              active={currentModule === 'qbank_analytics'}
              onClick={() => nav('qbank_analytics')}
              badge={undefined}
            />
            <NavItem
              icon={<FileText size={18} />}
              label="Blog Manager"
              active={currentModule === 'blogs'}
              onClick={() => nav('blogs')}
              badge={undefined}
            />
            <NavItem
              icon={<Video size={18} />}
              label="Daily Videos"
              active={currentModule === 'daily_videos'}
              onClick={() => nav('daily_videos')}
              badge={undefined}
            />
          </NavSection>
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-2">
          <button
            onClick={() => nav('admin_profile')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#161922] rounded-xl border border-slate-800/50 hover:border-purple-500/50 hover:bg-purple-900/10 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
              {adminUser?.name
                ? adminUser.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'AD'}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                {adminUser?.name || 'Admin User'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {adminUser?.email || 'Loading...'}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-slate-500 group-hover:text-purple-400 transition-colors flex-shrink-0"
            />
          </button>
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                // Clear all session storage
                sessionStorage.clear();
                // Force redirect using replace to prevent back button from going to dashboard
                window.location.replace('/login');
              } catch (error) {
                console.error('Logout error:', error);
                // Clear session storage and force redirect anyway
                sessionStorage.clear();
                window.location.replace('/login');
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#161922] rounded-xl border border-slate-800/50 hover:border-red-500/50 hover:bg-red-900/10 transition-all"
          >
            <div className="text-red-400 hover:text-red-300 text-sm font-medium">Logout</div>
          </button>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0b0d12] via-[#0f1117] to-[#0b0d12]">
        {currentModule === 'dashboard' && <Dashboard nav={nav} />}
        {currentModule === 'students' && (
          <StudentsList
            nav={nav}
            onSelectStudent={(id) => {
              setActiveStudentId(id);
              nav('student_profile', id);
            }}
            refreshTrigger={refreshCounter}
          />
        )}
        {currentModule === 'student_profile' && activeStudentId && (
          <StudentProfile
            studentId={activeStudentId}
            back={() => {
              setActiveStudentId(null);
              nav('students');
              // Refresh student list when going back
              setRefreshCounter((prev) => prev + 1);
            }}
            onEnrollmentChange={() => {
              // Trigger refresh of student list
              setRefreshCounter((prev) => prev + 1);
            }}
          />
        )}
        {currentModule === 'requests' && <RequestsInbox nav={nav} />}
        {currentModule === 'analytics' && <Analytics nav={nav} />}
        {currentModule === 'daily_videos' && <DailyVideoManager nav={nav} />}
        {currentModule === 'blogs' && <BlogManager nav={nav} />}
        {currentModule === 'quizzes' && <QuizManager nav={nav} />}
        {currentModule === 'courses' && <CourseList nav={nav} setActive={setActiveItem} />}
        {currentModule === 'course_editor' && (
          <CourseBuilder course={activeItem} back={() => nav('courses')} />
        )}
        {currentModule === 'qbank' && <QBankList nav={nav} setActive={setActiveItem} />}
        {currentModule === 'qbank_editor' && (
          <UniversalQuestionEditor question={activeItem} back={() => nav('qbank')} />
        )}
        {currentModule === 'qbank_analytics' && <QBankAnalytics nav={nav} />}
        {currentModule === 'admin_profile' && <AdminProfile nav={nav} adminUser={adminUser} />}
      </main>
    </div>
  );
}

// --- DASHBOARD MODULE ---
const Dashboard = ({ nav }: { nav: (mod: string) => void }) => {
  // ⚡ PERFORMANCE: Use React Query for caching dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Use countOnly for maximum performance
      const [coursesRes, questionsRes, studentsRes] = await Promise.all([
        fetch('/api/courses?countOnly=true', { credentials: 'include' }),
        fetch('/api/qbank?countOnly=true', { credentials: 'include' }),
        fetch('/api/students?countOnly=true', { credentials: 'include' }),
      ]);

      const [courses, questions, students] = await Promise.all([
        coursesRes.json(),
        questionsRes.json(),
        studentsRes.json(),
      ]);

      console.log('⚡ Dashboard stats loaded from optimized count queries');

      return {
        courses: courses.count || 0,
        questions: questions.count || questions.totalCount || 0,
        students: students.count || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ⚡ PERFORMANCE: Use React Query for activity logs
  const { data: activityLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const response = await fetch('/api/activity-logs?limit=10', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        return data.logs || [];
      }
      return [];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Command Center</h2>
          <p className="text-slate-400 mt-2 text-sm">Welcome to NursePro Academy Admin Dashboard</p>
        </div>
        <button
          onClick={() => nav('course_editor')}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-purple-50 transition-colors"
        >
          Create Course
        </button>
      </header>

      {/* ⚡ PERFORMANCE: Show skeleton while loading */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <MetricCard
            title="Total Courses"
            value={stats?.courses?.toString() || '0'}
            trend="Active"
            color="blue"
          />
          <MetricCard
            title="Total Questions"
            value={stats?.questions?.toString() || '0'}
            trend="In Q-Bank"
            color="green"
          />
          <MetricCard
            title="Total Students"
            value={stats?.students?.toString() || '0'}
            trend="Registered"
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <button
              onClick={() => nav('courses')}
              className="w-full flex items-center justify-between p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Manage Courses</p>
                  <p className="text-xs text-slate-500">Create, edit, or delete courses</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
            <button
              onClick={() => nav('qbank')}
              className="w-full flex items-center justify-between p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Database size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Q-Bank Manager</p>
                  <p className="text-xs text-slate-500">Add and manage questions</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-6">Recent Activity</h3>
          {/* ⚡ PERFORMANCE: Show skeleton while loading */}
          {logsLoading ? (
            <ActivityLogSkeleton />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {activityLogs.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No recent activity</p>
              ) : (
                activityLogs.map((log) => {
                  const getActionIcon = () => {
                    switch (log.action) {
                      case 'created':
                        return <Plus size={14} className="text-green-400" />;
                      case 'updated':
                        return <Edit3 size={14} className="text-blue-400" />;
                      case 'deleted':
                        return <Trash2 size={14} className="text-red-400" />;
                      case 'activated':
                        return <CheckCircle size={14} className="text-green-400" />;
                      case 'deactivated':
                        return <X size={14} className="text-red-400" />;
                      default:
                        return <Activity size={14} className="text-purple-400" />;
                    }
                  };

                  const getActionColor = () => {
                    switch (log.action) {
                      case 'created':
                        return 'text-green-400';
                      case 'updated':
                        return 'text-blue-400';
                      case 'deleted':
                        return 'text-red-400';
                      case 'activated':
                        return 'text-green-400';
                      case 'deactivated':
                        return 'text-red-400';
                      default:
                        return 'text-purple-400';
                    }
                  };

                  const formatTime = (dateString: string) => {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return date.toLocaleDateString();
                  };

                  const getActionText = () => {
                    return log.action;
                  };

                  const getEntityDisplay = () => {
                    const entityMap: Record<string, string> = {
                      access_request: 'access request',
                      blog: 'blog post',
                    };
                    return entityMap[log.entityType] || log.entityType;
                  };

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-[#1a1d26] rounded-lg border border-slate-800/40 hover:border-slate-700 transition-colors"
                    >
                      <div className="mt-0.5">{getActionIcon()}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          <span className="font-semibold text-white">{log.adminName}</span>{' '}
                          <span className={getActionColor()}>{getActionText()}</span>{' '}
                          <span className="text-slate-400">{getEntityDisplay()}</span>
                          {log.entityName && (
                            <span className="text-slate-200 font-medium"> "{log.entityName}"</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formatTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- REQUESTS INBOX MODULE ---
const RequestsInbox = ({ nav }: { nav: (mod: string) => void }) => {
  const notification = useNotification();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetchRequests();
    // REMOVED: Auto-refresh on sync events
    // Requests will only refresh when actions are performed
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const timestamp = Date.now(); // Add timestamp to bust cache
      const response = await fetch(`/api/requests?t=${timestamp}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        console.error('Failed to fetch requests:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (requestId: number, action: 'approve' | 'deny') => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();

        // The PATCH endpoint always deletes requests after processing
        // So we should always refresh, but with a small delay to ensure DB transaction is committed
        console.log(`✅ [Frontend] Request ${requestId} ${action}d, refreshing list...`);

        // Refresh immediately (optimistic update)
        await fetchRequests();

        // Also refresh after a short delay to ensure database transaction is fully committed
        // This handles any race conditions where the GET request might run before deletion completes
        setTimeout(async () => {
          console.log(`🔄 [Frontend] Secondary refresh for request ${requestId}...`);
          await fetchRequests();
        }, 300);

        // Show success message
        const message = data.message || `Request ${action}d and removed successfully`;
        notification.showSuccess(message);

        // If approved, the enrollment sync utility will handle enrollment automatically
        if (action === 'approve') {
          console.log(
            `✅ [Frontend] Request ${requestId} approved - enrollment will be synced automatically`
          );
        }
      } else {
        // Try to get error message from response
        let errorMessage = `Failed to ${action} request`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Error response:', errorData);
        } catch (e) {
          console.error('Failed to parse error response. Status:', response.status);
          errorMessage = `Failed to ${action} request (Status: ${response.status})`;
        }

        notification.showError(`Failed to ${action} request`, errorMessage);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      const errorMessage = error.message || `Network error: Failed to ${action} request`;
      notification.showError(`Failed to ${action} request`, errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  // Filter requests - only show truly pending requests
  // Also filter out any requests that have reviewedAt set (they should be deleted)
  const pendingRequests = requests.filter((r) => {
    const isPending = r.status === 'pending';
    const hasReviewedAt = r.reviewedAt;

    // If it has reviewedAt but status is pending, it's inconsistent - don't show it
    if (hasReviewedAt && isPending) {
      console.warn(
        `⚠️ Request ${r.id} has reviewedAt but status is 'pending' - data inconsistency!`,
        r
      );
      return false;
    }

    // If status is not pending, don't show it
    if (!isPending) {
      return false;
    }

    return true;
  });

  const reviewedRequests = requests.filter(
    (r) => r.status !== 'pending' && r.status !== null && r.status !== undefined
  );

  // Validate request data consistency
  React.useEffect(() => {
    // Log any requests that should be reviewed but aren't
    requests.forEach((r: any) => {
      if (r.reviewedAt && r.status === 'pending') {
        console.warn(
          `⚠️ Request ${r.id} has reviewedAt but status is still 'pending'! This should be deleted.`,
          r
        );
      }
      // Log approved/rejected requests that shouldn't be in the list
      if (r.status === 'approved' || r.status === 'rejected') {
        console.warn(
          `⚠️ Request ${r.id} has status '${r.status}' but is still in database - should be deleted!`,
          r
        );
      }
    });
  }, [requests]);

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Course Access Requests</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Review and manage student course access requests
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <svg
            className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Requests */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">
              Pending ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-8 text-center">
                <p className="text-slate-400">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                            {req.studentName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{req.studentName}</h4>
                            <p className="text-xs text-slate-500">{req.studentEmail}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-slate-300">
                            Requesting access to:{' '}
                            <span className="font-semibold text-purple-400">{req.courseTitle}</span>
                          </p>
                          {req.reason && (
                            <p className="text-sm text-slate-400 mt-2 italic">"{req.reason}"</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            Requested: {new Date(req.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleAction(req.id, 'approve')}
                          disabled={processingId === req.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'deny')}
                          disabled={processingId === req.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed Requests */}
          {reviewedRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">
                Reviewed ({reviewedRequests.length})
              </h3>
              <div className="space-y-3">
                {reviewedRequests.slice(0, 10).map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#161922] border border-slate-800/60 rounded-2xl p-4 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">
                          {req.studentName} → {req.courseTitle}
                        </p>
                        <p className="text-xs text-slate-500">
                          {req.status === 'approved' ? '✅ Approved' : '❌ Denied'} on{' '}
                          {new Date(req.reviewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- STUDENTS LIST MODULE ---
const StudentsList = ({
  nav,
  onSelectStudent,
  refreshTrigger,
}: {
  nav: (mod: string) => void;
  onSelectStudent: (id: number) => void;
  refreshTrigger?: number;
}) => {
  const notification = useNotification();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [activityStudentId, setActivityStudentId] = React.useState<number | null>(null);

  // ⚡ PERFORMANCE: Use React Query for students data with caching
  const {
    data: students = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['students', refreshTrigger],
    queryFn: async () => {
      const response = await fetch('/api/students', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('⚡ Students loaded and cached');
        return data.students || [];
      }
      throw new Error('Failed to fetch students');
    },
    staleTime: 30 * 1000, // 30 seconds - fresh for quick navigation
  });

  const toggleActive = async (studentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/students/${studentId}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (response.ok) {
        // ⚡ PERFORMANCE: Invalidate cache after mutation
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else {
        notification.showError('Failed to toggle student status');
      }
    } catch (error) {
      console.error('Error toggling student status:', error);
      notification.showError('Failed to toggle student status');
    }
  };

  const resetFaceId = async (studentId: number, studentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notification.showConfirm(
      'Reset Face ID',
      `Reset Face ID for ${studentName}? They will need to re-enroll.`,
      async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/reset-face`, {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            // ⚡ PERFORMANCE: Invalidate cache after mutation
            queryClient.invalidateQueries({ queryKey: ['students'] });
            notification.showSuccess('Face ID reset successfully');
          } else {
            notification.showError('Failed to reset Face ID');
          }
        } catch (error) {
          console.error('Error resetting Face ID:', error);
          notification.showError('Failed to reset Face ID');
        }
      }
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white tracking-tight">Student Management</h2>
        <p className="text-slate-400 mt-2 text-sm">Manage student accounts and access</p>
      </header>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-[#161922] border border-slate-800/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <Search size={18} className="absolute left-3 top-3.5 text-slate-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Enrollment Status</th>
                <th className="p-4 text-center">Face ID</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-[#1a1d26] transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (student.id) {
                        onSelectStudent(student.id);
                      } else {
                        console.error('Student ID is missing!', student);
                        alert('Error: Student ID is missing');
                      }
                    }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                          {student.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{student.name}</p>
                          <p className="text-xs text-slate-500">
                            Joined {new Date(student.joinedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 text-sm">{student.email}</p>
                      {student.phone && <p className="text-slate-500 text-xs">{student.phone}</p>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {student.enrolledCourses > 0 && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                            {student.enrolledCourses} Enrolled
                          </span>
                        )}
                        {student.pendingRequests > 0 && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">
                            {student.pendingRequests} Requested
                          </span>
                        )}
                        {(!student.enrolledCourses || student.enrolledCourses === 0) &&
                          (!student.pendingRequests || student.pendingRequests === 0) && (
                            <span className="text-slate-500 text-xs">No activity</span>
                          )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {student.faceIdEnrolled ? (
                        <span className="text-green-400 font-bold">✓ Enrolled</span>
                      ) : (
                        <span className="text-slate-500">Not enrolled</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => toggleActive(student.id, e)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          student.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-slate-700/30 text-slate-400'
                        }`}
                      >
                        {student.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.id) {
                              setActivityStudentId(student.id);
                              setShowActivityModal(true);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                          title="View Activity Log"
                        >
                          <Activity size={14} />
                          Activity
                        </button>
                        {student.faceIdEnrolled && (
                          <button
                            onClick={(e) => resetFaceId(student.id, student.name, e)}
                            className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="Reset Face ID"
                          >
                            <UserX size={14} />
                            Reset Face ID
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && activityStudentId && (
        <StudentActivityModal
          studentId={activityStudentId}
          studentName={students.find((s) => s.id === activityStudentId)?.name || 'Student'}
          onClose={() => {
            setShowActivityModal(false);
            setActivityStudentId(null);
          }}
        />
      )}
    </div>
  );
};

// --- ANALYTICS MODULE ---
const Analytics = ({ nav }: { nav: (mod: string) => void }) => {
  const [stats, setStats] = React.useState({
    totalStudents: 0,
    activeStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalQuestions: 0,
    averageProgress: 0,
    completionRate: 0,
    newStudentsThisMonth: 0,
    activeEnrollments: 0,
  });
  const [courseStats, setCourseStats] = React.useState<any[]>([]);
  const [studentEngagement, setStudentEngagement] = React.useState<any[]>([]);
  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [reportType, setReportType] = React.useState<
    'summary' | 'detailed' | 'courses' | 'students'
  >('summary');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  React.useEffect(() => {
    fetchAnalytics();
    // REMOVED: Auto-refresh on sync events
    // Analytics will only refresh when dateRange changes or page loads
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Fetch basic stats in parallel (fast)
      const [studentsRes, coursesRes, questionsRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/courses', { credentials: 'include' }),
        fetch('/api/qbank?countOnly=true', { credentials: 'include' }),
      ]);

      // Parse responses
      const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
      const coursesData = coursesRes.ok ? await coursesRes.json() : { courses: [] };
      const questionsData = questionsRes.ok ? await questionsRes.json() : { totalCount: 0 };

      const students = studentsData.students || [];
      const courses = coursesData.courses || [];
      const totalEnrollments = students.reduce(
        (sum: number, s: any) => sum + (s.enrolledCourses || 0),
        0
      );

      // Calculate date-based metrics
      const now = new Date();
      const daysAgo =
        dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : Infinity;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const newStudentsThisMonth = students.filter((s: any) => {
        const joinedDate = new Date(s.joinedDate);
        return joinedDate >= cutoffDate;
      }).length;

      // Set basic stats immediately (fast)
      setStats({
        totalStudents: students.length,
        activeStudents: students.filter((s: any) => s.isActive).length,
        totalCourses: courses.length,
        totalEnrollments,
        totalQuestions: questionsData.totalCount || 0,
        averageProgress: 0, // Will be calculated below
        completionRate: 0, // Will be calculated below
        newStudentsThisMonth,
        activeEnrollments: 0, // Will be calculated below
      });

      // Set basic course stats immediately
      setCourseStats(
        courses.map((course: any) => ({
          ...course,
          enrollments: 0,
          averageProgress: 0,
        }))
      );

      // Fetch detailed enrollment data in parallel (only for students with enrollments)
      const studentsWithEnrollments = students.filter((s: any) => s.enrolledCourses > 0);

      if (studentsWithEnrollments.length > 0) {
        // Fetch all student details in parallel (much faster than sequential)
        const studentDetailPromises = studentsWithEnrollments.map((student: any) =>
          fetch(`/api/students/${student.id}`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null)
        );

        const studentDetails = await Promise.all(studentDetailPromises);

        let totalProgress = 0;
        let enrollmentCount = 0;
        const engagementData: any[] = [];

        console.log(`📊 [Analytics] Processing ${studentDetails.length} students with enrollments`);
        studentDetails.forEach((detailData, index) => {
          if (detailData?.student) {
            const student = studentsWithEnrollments[index];
            const enrollments = detailData.student.enrollments || [];
            console.log(
              `📊 [Analytics] Student ${student.name} (ID: ${student.id}) has ${enrollments.length} enrollments`
            );

            if (enrollments.length === 0) {
              console.warn(
                `⚠️ [Analytics] Student ${student.name} has 0 enrollments but enrolledCourses > 0`
              );
            }

            enrollments.forEach((e: any) => {
              // Ensure progress is always a number - use totalProgress if progress is missing
              const progress =
                typeof e.progress === 'number' && e.progress >= 0
                  ? e.progress
                  : typeof e.totalProgress === 'number' && e.totalProgress >= 0
                    ? e.totalProgress
                    : 0;

              console.log(
                `📊 [Analytics] Course: ${e.course?.title || 'Unknown'}, Progress: ${progress}%, CourseId: ${e.courseId}, e.progress=${e.progress}, e.totalProgress=${e.totalProgress}`
              );

              if (progress === 0 && e.course?.title) {
                console.warn(
                  `⚠️ [Analytics] Student ${student.name} has 0% progress in ${e.course.title}`
                );
              }

              totalProgress += progress;
              enrollmentCount++;
              engagementData.push({
                studentName: student.name,
                courseTitle: e.course?.title || 'Unknown',
                courseId: e.courseId || e.course?.id, // ADD courseId for reliable matching
                progress: progress, // Use calculated progress
                lastAccessed: e.lastAccessed,
              });
            });
          } else {
            console.warn(`⚠️ [Analytics] Student detail data is missing for index ${index}`);
          }
        });

        console.log(
          `📊 [Analytics] Total engagement data items: ${engagementData.length}, Total progress sum: ${totalProgress}, Enrollment count: ${enrollmentCount}`
        );

        const averageProgress =
          enrollmentCount > 0 ? Math.round(totalProgress / enrollmentCount) : 0;
        const completedCount = engagementData.filter((e: any) => (e.progress || 0) >= 100).length;
        const completionRate =
          enrollmentCount > 0 ? Math.round((completedCount / enrollmentCount) * 100) : 0;

        // Update stats with calculated values
        setStats((prev) => ({
          ...prev,
          averageProgress,
          completionRate,
          activeEnrollments: enrollmentCount,
        }));

        // Update course stats with enrollment data
        // Match by courseId (preferred) or title (fallback) for accuracy
        const courseStatsData = courses.map((course: any) => {
          const courseEnrollments = engagementData.filter((e) => {
            // Prefer courseId matching (more reliable)
            const courseIdMatch =
              e.courseId && course.id && e.courseId.toString() === course.id.toString();
            // Fallback to title matching (for legacy data)
            const titleMatch = e.courseTitle === course.title;
            return courseIdMatch || titleMatch;
          });
          const enrollments = courseEnrollments.length;
          const totalProgress = courseEnrollments.reduce(
            (sum: number, e: any) => sum + (e.progress || 0),
            0
          );
          return {
            ...course,
            enrollments,
            averageProgress: enrollments > 0 ? Math.round(totalProgress / enrollments) : 0,
          };
        });
        setCourseStats(courseStatsData);
        setStudentEngagement(engagementData);
      } else {
        setStudentEngagement([]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (format: 'csv' | 'json') => {
    setIsGeneratingReport(true);
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange,
        reportType,
        stats,
        courseStats,
        studentEngagement: studentEngagement.slice(0, 100), // Limit for performance
      };

      if (format === 'csv') {
        // Generate CSV
        let csv = 'Report Type,Value\n';
        csv += `Generated At,${reportData.generatedAt}\n`;
        csv += `Date Range,${dateRange}\n`;
        csv += `Total Students,${stats.totalStudents}\n`;
        csv += `Active Students,${stats.activeStudents}\n`;
        csv += `Total Courses,${stats.totalCourses}\n`;
        csv += `Total Enrollments,${stats.totalEnrollments}\n`;
        csv += `Total Questions,${stats.totalQuestions}\n`;
        csv += `Average Progress,${stats.averageProgress}%\n`;
        csv += `Completion Rate,${stats.completionRate}%\n`;
        csv += `New Students (Period),${stats.newStudentsThisMonth}\n\n`;

        csv += 'Course Performance\n';
        csv += 'Course Title,Enrollments,Average Progress\n';
        courseStats.forEach((course) => {
          csv += `"${course.title}",${course.enrollments},${course.averageProgress}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Generate JSON
        const json = JSON.stringify(reportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Analytics & Reports</h2>
          <p className="text-slate-400 mt-2 text-sm">Platform insights and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-[#161922] border border-slate-800/60 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => generateReport('csv')}
            disabled={isGeneratingReport}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-sm hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            {isGeneratingReport ? 'Generating...' : 'Export CSV'}
          </button>
          <button
            onClick={() => generateReport('json')}
            disabled={isGeneratingReport}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold text-sm hover:bg-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FileDown size={16} />
            Export JSON
          </button>
        </div>
      </header>

      {/* Always show UI structure, load data progressively */}
      <>
        {/* Key Metrics - Show immediately with loading state */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 animate-pulse"
                >
                  <div className="h-3 bg-slate-700 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-slate-700 rounded w-16"></div>
                </div>
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="Total Students"
                value={stats.totalStudents.toString()}
                trend="Registered"
                color="blue"
                icon={<Users size={20} />}
              />
              <MetricCard
                title="Active Students"
                value={stats.activeStudents.toString()}
                trend="Currently Active"
                color="green"
                icon={<Activity size={20} />}
              />
              <MetricCard
                title="Total Courses"
                value={stats.totalCourses.toString()}
                trend="Available"
                color="purple"
                icon={<BookOpen size={20} />}
              />
              <MetricCard
                title="Total Enrollments"
                value={stats.totalEnrollments.toString()}
                trend="All Time"
                color="pink"
                icon={<Target size={20} />}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 animate-pulse"
                >
                  <div className="h-3 bg-slate-700 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-slate-700 rounded w-16"></div>
                </div>
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="Total Questions"
                value={stats.totalQuestions.toString()}
                trend="In Q-Bank"
                color="blue"
                icon={<Database size={20} />}
              />
              <MetricCard
                title="Average Progress"
                value={stats.averageProgress + '%'}
                trend="Across All"
                color="orange"
                icon={<TrendingUp size={20} />}
              />
              <MetricCard
                title="Completion Rate"
                value={stats.completionRate + '%'}
                trend="Finished"
                color="green"
                icon={<Award size={20} />}
              />
              <MetricCard
                title="New Students"
                value={stats.newStudentsThisMonth.toString()}
                trend={`Last ${dateRange === 'all' ? 'Period' : dateRange}`}
                color="purple"
                icon={<TrendingUp size={20} />}
              />
            </>
          )}
        </div>

        {/* Course Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart size={20} className="text-purple-400" />
                Course Performance
              </h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40 animate-pulse"
                    >
                      <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : courseStats.length > 0 ? (
                courseStats.map((course, idx) => (
                  <div key={idx} className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-sm">{course.title}</h4>
                      <span className="text-xs text-slate-400">{course.enrollments} enrolled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                          style={{ width: `${course.averageProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-purple-400">
                        {course.averageProgress}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-8">No course data available</p>
              )}
            </div>
          </div>

          {/* Student Engagement */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-green-400" />
                Top Student Engagement
              </h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="p-3 bg-[#1a1d26] rounded-xl border border-slate-800/40 animate-pulse"
                    >
                      <div className="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
                      <div className="h-2 bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : studentEngagement.length > 0 ? (
                studentEngagement
                  .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                  .slice(0, 10)
                  .map((engagement, idx) => {
                    const progress = Math.max(0, Math.min(100, engagement.progress || 0)); // Clamp between 0-100
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#1a1d26] rounded-xl border border-slate-800/40"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-white">
                            {engagement.studentName}
                          </span>
                          <span className="text-xs text-slate-400">{progress}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{engagement.courseTitle}</p>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-600 to-emerald-600"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-slate-400 text-center py-8">No engagement data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              Activity Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Active Enrollments</span>
                <span className="text-white font-bold">{stats.activeEnrollments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Inactive Students</span>
                <span className="text-white font-bold">
                  {stats.totalStudents - stats.activeStudents}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Courses Published</span>
                <span className="text-white font-bold">{stats.totalCourses}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target size={18} className="text-purple-400" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Engagement Rate</span>
                  <span className="text-white font-bold">
                    {stats.totalStudents > 0
                      ? Math.round((stats.activeEnrollments / stats.totalStudents) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                    style={{
                      width: `${stats.totalStudents > 0 ? Math.round((stats.activeEnrollments / stats.totalStudents) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Course Utilization</span>
                  <span className="text-white font-bold">
                    {stats.totalCourses > 0
                      ? Math.round((stats.totalEnrollments / stats.totalCourses) * 10) / 10
                      : 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-600"
                    style={{
                      width: `${Math.min(100, stats.totalCourses > 0 ? (stats.totalEnrollments / stats.totalCourses) * 10 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Award size={18} className="text-orange-400" />
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-[#1a1d26] rounded-lg border border-slate-800/40">
                <p className="text-xs text-slate-500 mb-1">Avg. Courses per Student</p>
                <p className="text-lg font-bold text-white">
                  {stats.totalStudents > 0
                    ? (stats.totalEnrollments / stats.totalStudents).toFixed(1)
                    : '0.0'}
                </p>
              </div>
              <div className="p-3 bg-[#1a1d26] rounded-lg border border-slate-800/40">
                <p className="text-xs text-slate-500 mb-1">Students with Progress</p>
                <p className="text-lg font-bold text-white">{stats.activeEnrollments}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    </div>
  );
};

// --- DAILY VIDEO MANAGER MODULE ---
const DailyVideoManager = ({ nav }: { nav: (mod: string) => void }) => {
  const [videos, setVideos] = React.useState<any[]>([]);
  const [courses, setCourses] = React.useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>('');
  const [selectedModule, setSelectedModule] = React.useState<string>('');
  const [modules, setModules] = React.useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = React.useState<string>('');
  const [chapters, setChapters] = React.useState<any[]>([]);
  const [day, setDay] = React.useState<number>(0);
  const [title, setTitle] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [videoUrl, setVideoUrl] = React.useState<string>('');
  const [videoProvider, setVideoProvider] = React.useState<string>('youtube');
  const [videoSourceType, setVideoSourceType] = React.useState<'url' | 'upload'>('url');
  const [uploadedVideoUrl, setUploadedVideoUrl] = React.useState<string>('');
  const [videoDuration, setVideoDuration] = React.useState<number | null>(null);
  const [thumbnail, setThumbnail] = React.useState<string>('');
  const [scheduledDate, setScheduledDate] = React.useState<string>('');
  const [priority, setPriority] = React.useState<number>(0);
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [editingVideo, setEditingVideo] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    if (selectedCourse) {
      fetchModules(selectedCourse);
    }
  }, [selectedCourse]);

  React.useEffect(() => {
    if (selectedModule) {
      fetchChapters(selectedModule);
    }
  }, [selectedModule]);

  const fetchData = async () => {
    try {
      const [videosRes, coursesRes] = await Promise.all([
        fetch('/api/daily-videos', { credentials: 'include' }),
        fetch('/api/courses', { credentials: 'include' }),
      ]);

      if (videosRes.ok) {
        const data = await videosRes.json();
        setVideos(data.dailyVideos || []);
      }

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/modules`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const fetchChapters = async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}/chapters`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Filter for video chapters only
        setChapters((data.chapters || []).filter((c: any) => c.type === 'video'));
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapter || !title) return;

    try {
      const url = editingVideo
        ? `/api/admin/daily-videos/${editingVideo.id}`
        : '/api/admin/daily-videos';
      const method = editingVideo ? 'PUT' : 'POST';

      // Determine final video URL and provider based on source type
      let finalVideoUrl = '';
      let finalProvider = videoProvider;

      if (videoSourceType === 'upload') {
        finalVideoUrl = uploadedVideoUrl;
        finalProvider = 'uploaded';
      } else {
        // Convert video URL to embed format (hides branding)
        if (videoUrl) {
          const parsed = parseVideoUrl(videoUrl);
          finalVideoUrl = parsed.embedUrl; // Use embed URL with privacy settings
          finalProvider = parsed.provider; // Auto-detect provider
        } else {
          finalVideoUrl = videoUrl;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chapterId: selectedChapter,
          title,
          description,
          day: parseInt(day.toString()),
          videoUrl: finalVideoUrl || null,
          videoProvider: finalProvider,
          videoDuration: videoDuration || null,
          thumbnail: thumbnail || null,
          scheduledDate: scheduledDate || null,
          priority: priority || 0,
          isActive,
        }),
      });

      if (response.ok) {
        alert(`Daily video ${editingVideo ? 'updated' : 'configured'} successfully`);
        resetForm();
        fetchData(); // Refresh list
      } else {
        const error = await response.json();
        alert(
          `Failed to ${editingVideo ? 'update' : 'configure'} daily video: ${error.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Error configuring daily video:', error);
      alert('Failed to configure daily video');
    }
  };

  const handleEdit = (video: any) => {
    setEditingVideo(video);
    setSelectedCourse(video.courseId?.toString() || '');
    setTitle(video.title);
    setDescription(video.description || '');
    setDay(video.day);

    // Determine source type based on provider
    const provider = video.videoProvider || 'youtube';
    if (provider === 'uploaded') {
      setVideoSourceType('upload');
      setUploadedVideoUrl(video.videoUrl || '');
      setVideoUrl('');
    } else {
      setVideoSourceType('url');
      setVideoUrl(video.videoUrl || '');
      setUploadedVideoUrl('');
    }

    setVideoProvider(provider);
    setVideoDuration(video.videoDuration || null);
    setThumbnail(video.thumbnail || '');
    setScheduledDate(video.scheduledDate || '');
    setPriority(video.priority || 0);
    setIsActive(video.isActive !== undefined ? video.isActive : true);
    // Fetch modules and chapters for the course
    if (video.courseId) {
      fetchModules(video.courseId.toString());
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDay(0);
    setVideoUrl('');
    setVideoProvider('youtube');
    setVideoSourceType('url');
    setUploadedVideoUrl('');
    setVideoDuration(null);
    setThumbnail('');
    setScheduledDate('');
    setPriority(0);
    setIsActive(true);
    setSelectedCourse('');
    setSelectedModule('');
    setSelectedChapter('');
    setEditingVideo(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this daily video?')) return;
    try {
      const response = await fetch(`/api/admin/daily-videos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to delete daily video');
      }
    } catch (error) {
      console.error('Error deleting daily video:', error);
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white tracking-tight">Daily Video Manager</h2>
        <p className="text-slate-400 mt-2 text-sm">
          Configure daily video rotation for active students
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <div className="lg:col-span-1 bg-[#161922] border border-slate-800/60 rounded-2xl p-6 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white">
              {editingVideo ? 'Edit Daily Video' : 'Add New Daily Video'}
            </h3>
            {editingVideo && (
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Select Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                required
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Select Module</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                disabled={!selectedCourse}
                required
              >
                <option value="">Select a module...</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Select Video Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                disabled={!selectedModule}
                required
              >
                <option value="">Select a video chapter...</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Day Number (0-365)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Rotation based on day of year</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Display Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="e.g. Daily Tip: Cardiac Care"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 h-20 resize-none"
                placeholder="Brief description for the dashboard card..."
              />
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">Video Settings</h4>

              {/* Video Source Type Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 mb-2">Video Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('url');
                      setUploadedVideoUrl('');
                    }}
                    className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-xs font-bold ${
                      videoSourceType === 'url'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <LinkIcon size={14} />
                    Video URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('upload');
                      setVideoUrl('');
                    }}
                    className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-xs font-bold ${
                      videoSourceType === 'upload'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Upload size={14} />
                    Upload Video
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {videoSourceType === 'url' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Video URL
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          // Auto-detect provider
                          const url = e.target.value;
                          if (url.includes('youtube.com') || url.includes('youtu.be')) {
                            setVideoProvider('youtube');
                          } else if (url.includes('vimeo.com')) {
                            setVideoProvider('vimeo');
                          } else if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
                            setVideoProvider('direct');
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/... or direct video URL (.mp4, .webm, etc.)"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Supports YouTube, Vimeo, or any publicly accessible video URL
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Provider
                      </label>
                      <select
                        value={videoProvider}
                        onChange={(e) => setVideoProvider(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="direct">Direct Link (MP4, WebM, etc.)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Upload Video File
                    </label>
                    <FileUpload
                      type="video"
                      onUploadComplete={(url) => {
                        setUploadedVideoUrl(url);
                        setVideoProvider('uploaded');
                      }}
                      currentUrl={uploadedVideoUrl}
                      maxSizeMB={500}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Maximum file size: 500MB. Supported formats: MP4, WebM, OGG, MOV
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={videoDuration || ''}
                    onChange={(e) =>
                      setVideoDuration(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="e.g. 15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Optional: Custom thumbnail image URL
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">Scheduling</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Optional: Schedule when video should be active
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Priority</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Higher = shown first</p>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#1a1d26] border-slate-800 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs font-bold text-slate-400">Active</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              {editingVideo ? 'Update Video' : 'Save Configuration'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/60">
            <h3 className="font-bold text-white">Scheduled Videos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold">
                <tr>
                  <th className="p-4">Day</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Source Chapter</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4 text-center">Priority</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {videos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No daily videos configured
                    </td>
                  </tr>
                ) : (
                  videos.map((video) => (
                    <tr key={video.id} className="hover:bg-[#1a1d26] transition-colors">
                      <td className="p-4 font-mono text-purple-400">Day {video.day}</td>
                      <td className="p-4 font-medium text-white">{video.title}</td>
                      <td className="p-4 text-slate-400">{video.chapterTitle}</td>
                      <td className="p-4 text-slate-400 text-xs uppercase">
                        {video.videoProvider || 'youtube'}
                      </td>
                      <td className="p-4 text-center text-purple-400 font-bold">
                        {video.priority || 0}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${video.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                        >
                          {video.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(video)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-bold px-2 py-1 rounded hover:bg-blue-500/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(video.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 rounded hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COURSE BUILDER MODULE ---
const CourseList = ({
  nav,
  setActive,
}: {
  nav: (mod: string, id?: number) => void;
  setActive: (item: any) => void;
}) => {
  const notification = useNotification();
  const queryClient = useQueryClient();

  // ⚡ PERFORMANCE: Use React Query for courses with caching
  const {
    data: coursesList = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const mappedCourses = (data.courses || []).map((c: any) => ({
          ...c,
          author: c.instructor,
          status: c.status === 'published' ? 'Active' : 'Draft',
        }));
        console.log('⚡ Courses loaded and cached');
        return mappedCourses;
      }
      throw new Error('Failed to fetch courses');
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const handleDelete = async (id: number) => {
    notification.showConfirm(
      'Delete Course',
      'Are you sure you want to delete this course?',
      async () => {
        try {
          const response = await fetch(`/api/courses/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (response.ok) {
            // ⚡ PERFORMANCE: Invalidate cache after mutation
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            notification.showSuccess('Course deleted successfully');
          } else {
            notification.showError('Failed to delete course');
          }
        } catch (error) {
          console.error('Error deleting course:', error);
          notification.showError('Failed to delete course');
        }
      }
    );
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Courses</h2>
          <p className="text-slate-400 mt-1 text-sm">Manage curriculum and learning paths.</p>
        </div>
        <button
          onClick={() => {
            setActive(null);
            window.history.pushState({}, '', '/dashboard/courses/new');
            nav('course_editor');
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Create Course
        </button>
      </div>
      <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden flex-1">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-6">Course Name</th>
                <th className="p-6">Instructor</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {coursesList.map((c, i) => (
                <tr key={i} className="hover:bg-[#1a1d26] transition-colors">
                  <td className="p-6 font-medium text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                      <BookOpen size={16} />
                    </div>
                    {c.title}
                  </td>
                  <td className="p-6">{c.author}</td>
                  <td className="p-6">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${c.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/30 text-slate-400'}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button
                      onClick={() => {
                        setActive(c);
                        window.history.pushState({}, '', `/dashboard/courses/${c.id}`);
                        nav('course_editor', c.id);
                      }}
                      className="text-purple-400 hover:text-purple-300 font-semibold mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-400 hover:text-red-300 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {coursesList.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const CourseBuilder = ({ course, back }: { course: any; back: () => void }) => {
  const notification = useNotification();
  const [modules, setModules] = React.useState<any[]>([]);
  const [title, setTitle] = React.useState(course?.title || '');
  const [description, setDescription] = React.useState(course?.description || '');
  const [instructor, setInstructor] = React.useState(course?.instructor || 'Nurse Pro Academy');
  const [pricing, setPricing] = React.useState(course?.pricing || 0);
  const [thumbnail, setThumbnail] = React.useState(course?.thumbnail || '');
  const [isPublished, setIsPublished] = React.useState(
    course?.status === 'published' || course?.status === 'Active'
  );
  const [isDefaultUnlocked, setIsDefaultUnlocked] = React.useState(
    course?.isDefaultUnlocked || false
  );
  const [isRequestable, setIsRequestable] = React.useState(course?.isRequestable !== false);
  const [isPublic, setIsPublic] = React.useState(course?.isPublic !== false);
  // Get course ID from props or URL to ensure persistence
  const urlCourseId = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const parts = window.location.pathname.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart === 'courses' || lastPart === 'new') return null;
    const parsed = parseInt(lastPart);
    return isNaN(parsed) ? null : parsed;
  }, []);
  const [courseId, setCourseId] = React.useState(course?.id || urlCourseId);
  const [isLoading, setIsLoading] = React.useState(!!course?.id);
  const [showVideoModal, setShowVideoModal] = React.useState(false);
  const [showDocumentModal, setShowDocumentModal] = React.useState(false);
  const [showQuizModal, setShowQuizModal] = React.useState(false);
  const [currentModuleId, setCurrentModuleId] = React.useState<number | null>(null);
  const [currentQuizId, setCurrentQuizId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (course?.id) {
      fetchModules(course.id);
    } else if (courseId && !course?.id) {
      // Reload course data if we have ID but no course object
      loadCourseData(courseId);
    }
  }, [course, courseId]);

  const loadCourseData = async (id: number) => {
    try {
      const response = await fetch(`/api/courses/${id}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const c = data.course;
        setTitle(c.title || '');
        setDescription(c.description || '');
        setInstructor(c.instructor || 'Nurse Pro Academy');
        setPricing(c.pricing || 0);
        setThumbnail(c.thumbnail || '');
        setIsPublished(c.status === 'published');
        setIsDefaultUnlocked(c.isDefaultUnlocked || false);
        setIsRequestable(c.isRequestable !== false);
        setIsPublic(c.isPublic !== false);
        fetchModules(id);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    }
  };

  const fetchModules = async (id: number) => {
    try {
      const response = await fetch(`/api/courses/${id}/modules`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const modulesWithChapters = await Promise.all(
          data.modules.map(async (m: any) => {
            const chapRes = await fetch(`/api/modules/${m.id}/chapters`, {
              credentials: 'include',
            });
            const chapData = await chapRes.json();
            return { ...m, items: chapData.chapters || [] };
          })
        );
        setModules(modulesWithChapters);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    // Validate required fields
    if (!title || !description || !instructor) {
      notification.showError(
        'Please fill in all required fields: Title, Description, and Instructor'
      );
      return;
    }

    try {
      const method = courseId ? 'PATCH' : 'POST';
      const url = courseId ? `/api/courses/${courseId}` : '/api/courses';

      console.log('💾 Saving course:', { courseId, title, method, url });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          instructor,
          thumbnail: thumbnail || null,
          pricing: parseFloat(pricing.toString()) || 0,
          status: isPublished ? 'published' : 'draft',
          isDefaultUnlocked,
          isRequestable,
          isPublic,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Course saved:', data);
        if (!courseId && data.course.id) {
          // New course created - set the ID and update URL to prevent duplicates
          const newCourseId = data.course.id;
          setCourseId(newCourseId);
          // Update URL to reflect the course ID
          window.history.replaceState({}, '', `/dashboard/courses/${newCourseId}`);
          notification.showSuccess('Course created!', 'You can now add modules.');
        } else {
          notification.showSuccess('Course updated successfully');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Save course failed:', errorData);
        notification.showError(errorData.message || 'Failed to save course');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      notification.showError(
        'Failed to save course: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  };

  const addModule = async () => {
    if (!courseId) {
      notification.showWarning('Please save the course first');
      return;
    }

    const title = await notification.showPrompt('Add Module', 'Enter module title:', '');
    if (!title) return;

    try {
      const response = await fetch(`/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          order: modules.length,
          duration: 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setModules([...modules, { ...data.module, items: [] }]);
      }
    } catch (error) {
      console.error('Error adding module:', error);
    }
  };

  const addItem = async (modId: number, type: string) => {
    if (type === 'video') {
      setCurrentModuleId(modId);
      setShowVideoModal(true);
      return;
    } else if (type === 'document') {
      setCurrentModuleId(modId);
      setShowDocumentModal(true);
      return;
    } else if (type === 'mcq') {
      // Show quiz creation modal instead of creating chapter
      setCurrentModuleId(modId);
      setShowQuizModal(true);
      return;
    }

    const title = prompt(`Enter ${type} title:`);
    if (!title) return;

    let contentData: any = { title, type, order: 999 };

    if (type === 'textbook') {
      contentData.textbookContent = '<p>Enter content here...</p>';
      contentData.readingTime = 10;
    }

    try {
      const response = await fetch(`/api/modules/${modId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(contentData),
      });

      if (response.ok) {
        const data = await response.json();
        setModules(
          modules.map((m: any) =>
            m.id === modId
              ? {
                  ...m,
                  items: [...m.items, data.chapter],
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Error adding chapter:', error);
    }
  };

  const deleteItem = async (itemId: number, modId: number, itemType: string) => {
    // Determine the correct label based on item type
    const itemTypeLabel =
      itemType === 'mcq' || itemType === 'qbank' || itemType === 'quiz'
        ? 'Quiz'
        : itemType === 'video'
          ? 'Video'
          : itemType === 'document'
            ? 'Document'
            : itemType === 'textbook'
              ? 'Reading'
              : 'Chapter';

    notification.showConfirm(
      `Delete ${itemTypeLabel}`,
      `Are you sure you want to delete this ${itemTypeLabel.toLowerCase()}?`,
      async () => {
        try {
          await fetch(`/api/chapters/${itemId}`, { method: 'DELETE', credentials: 'include' });
          setModules(
            modules.map((m: any) =>
              m.id === modId
                ? {
                    ...m,
                    items: m.items.filter((i: any) => i.id !== itemId),
                  }
                : m
            )
          );
          notification.showSuccess(`${itemTypeLabel} deleted successfully`);
        } catch (error) {
          console.error(`Error deleting ${itemTypeLabel.toLowerCase()}:`, error);
          notification.showError(`Failed to delete ${itemTypeLabel.toLowerCase()}`);
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 bg-[#161922] border-b border-slate-800/60 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={back}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="font-bold text-white">{title || 'New Course'}</h3>
        </div>
        <button
          onClick={handleSaveCourse}
          className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold"
        >
          Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Course Settings */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-xl p-6 space-y-4">
            <h4 className="font-bold text-white mb-4">Course Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Instructor</label>
                <input
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm h-20"
                />
              </div>
              <div className="col-span-2">
                <FileUpload
                  type="thumbnail"
                  label="Course Thumbnail"
                  currentUrl={thumbnail}
                  onUploadComplete={(url: string) => setThumbnail(url)}
                  maxSizeMB={10}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Pricing (0 for Free)
                </label>
                <input
                  type="number"
                  value={pricing}
                  onChange={(e) => setPricing(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                />
              </div>
              <div className="flex items-center gap-4 mt-6 col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600"
                  />
                  <span className="text-sm text-white">Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefaultUnlocked}
                    onChange={(e) => setIsDefaultUnlocked(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600"
                  />
                  <span className="text-sm text-white">Default Unlocked</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequestable}
                    onChange={(e) => setIsRequestable(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600"
                  />
                  <span className="text-sm text-white">Allow Requests</span>
                </label>
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  title="Public courses allow direct enrollment. Private courses require admin approval."
                >
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600"
                  />
                  <span className="text-sm text-white">Public Course (Direct Enrollment)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Modules */}
          {modules.map((mod: any, i: number) => (
            <div
              key={mod.id}
              className="bg-[#161922] border border-slate-800/60 rounded-xl overflow-hidden"
            >
              <div className="p-4 bg-[#1a1d26] border-b border-slate-800/60 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <GripVertical size={16} className="text-slate-600 cursor-grab" />
                  <h4 className="font-bold text-white">
                    Module {i + 1}: {mod.title}
                  </h4>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400">
                    <Edit3 size={14} />
                  </button>
                  <button className="p-1.5 hover:bg-slate-700 rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {mod.items.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
                    Drop videos/documents here
                  </div>
                )}
                {mod.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center p-3 bg-[#13151d] border border-slate-800/50 rounded-lg hover:border-purple-500/30 transition-colors"
                  >
                    <div
                      className={`mr-3 p-2 rounded-lg ${
                        item.type === 'mcq' || item.type === 'qbank'
                          ? 'bg-purple-500/10 text-purple-400'
                          : item.type === 'document'
                            ? 'bg-orange-500/10 text-orange-400'
                            : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {item.type === 'video' ? (
                        <Video size={16} />
                      ) : item.type === 'document' ? (
                        <FileText size={16} />
                      ) : item.type === 'mcq' || item.type === 'qbank' ? (
                        <Zap size={16} />
                      ) : (
                        <FileText size={16} />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-300">{item.title}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => deleteItem(item.id, mod.id, item.type)}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-center gap-3 pt-4 mt-2 border-t border-slate-800/50">
                  <QuickAddBtn
                    icon={<Video size={14} />}
                    label="Video"
                    onClick={() => addItem(mod.id, 'video')}
                    active={false}
                  />
                  <QuickAddBtn
                    icon={<FileText size={14} />}
                    label="Reading"
                    onClick={() => addItem(mod.id, 'textbook')}
                    active={false}
                  />
                  <QuickAddBtn
                    icon={<FileText size={14} />}
                    label="Document"
                    onClick={() => addItem(mod.id, 'document')}
                    active={false}
                  />
                  <QuickAddBtn
                    icon={<Zap size={14} />}
                    label="Quiz"
                    active={true}
                    onClick={() => addItem(mod.id, 'mcq')}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addModule}
            className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 font-bold hover:text-white hover:border-slate-600 transition-all flex flex-col items-center gap-2"
          >
            <Plus size={24} /> Add Module
          </button>
        </div>
      </div>

      {/* Video Upload Modal */}
      {showVideoModal && (
        <VideoUploadModal
          onClose={() => {
            setShowVideoModal(false);
            setCurrentModuleId(null);
          }}
          onSave={async (title: string, videoUrl: string, videoFile: string) => {
            if (!currentModuleId || !title) return;

            // Convert video URL to embed format if provided (hides branding)
            let finalVideoUrl = videoUrl || videoFile;
            let finalProvider = 'uploaded';

            if (videoUrl) {
              const parsed = parseVideoUrl(videoUrl);
              finalVideoUrl = parsed.embedUrl; // Use embed URL with privacy settings
              finalProvider = parsed.provider; // Auto-detect provider
            }

            const contentData: any = {
              title,
              type: 'video',
              order: 999,
              videoUrl: finalVideoUrl,
              videoProvider: finalProvider,
              videoDuration: 15,
            };

            try {
              const response = await fetch(`/api/modules/${currentModuleId}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(contentData),
              });

              if (response.ok) {
                const data = await response.json();
                setModules(
                  modules.map((m: any) =>
                    m.id === currentModuleId
                      ? {
                          ...m,
                          items: [...m.items, data.chapter],
                        }
                      : m
                  )
                );
                setShowVideoModal(false);
                setCurrentModuleId(null);
              }
            } catch (error) {
              console.error('Error adding video:', error);
            }
          }}
        />
      )}

      {/* Quiz Creation Modal */}
      {showQuizModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowQuizModal(false)}
        >
          <div
            className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Create Quiz</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Quiz Title</label>
                <input
                  id="quizTitle"
                  type="text"
                  placeholder="e.g., Cardiovascular Assessment"
                  className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Pass Mark (%)</label>
                  <input
                    id="quizPassMark"
                    type="number"
                    defaultValue="70"
                    min="0"
                    max="100"
                    className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Max Attempts</label>
                  <input
                    id="quizMaxAttempts"
                    type="number"
                    defaultValue="3"
                    min="1"
                    className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm text-purple-300">
                  ℹ️ After creating the quiz, go to Q-Bank Manager to assign questions to this quiz.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowQuizModal(false);
                    setCurrentModuleId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const title = (document.getElementById('quizTitle') as HTMLInputElement)?.value;
                    const passMark = parseInt(
                      (document.getElementById('quizPassMark') as HTMLInputElement)?.value || '70'
                    );
                    const maxAttempts = parseInt(
                      (document.getElementById('quizMaxAttempts') as HTMLInputElement)?.value || '3'
                    );

                    if (!title || !currentModuleId) return;

                    try {
                      const response = await fetch(`/api/modules/${currentModuleId}/quizzes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ title, passMark, maxAttempts }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        setModules(
                          modules.map((m: any) =>
                            m.id === currentModuleId
                              ? {
                                  ...m,
                                  items: [...m.items, { ...data.chapter, quiz: data.quiz }],
                                }
                              : m
                          )
                        );
                        setShowQuizModal(false);
                        setCurrentModuleId(null);
                        setCurrentQuizId(data.quiz.id);
                        notification.showSuccess(
                          'Quiz created!',
                          'Go to Q-Bank Manager to add questions.'
                        );
                      } else {
                        notification.showError('Failed to create quiz');
                      }
                    } catch (error) {
                      console.error('Error creating quiz:', error);
                      notification.showError('Failed to create quiz');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition"
                >
                  Create Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && (
        <DocumentUploadModal
          onClose={() => {
            setShowDocumentModal(false);
            setCurrentModuleId(null);
          }}
          onSave={async (title: string, documentUrl: string) => {
            if (!currentModuleId || !title || !documentUrl) return;

            const contentData: any = {
              title,
              type: 'document',
              order: 999,
              documentUrl, // Will be saved as textbookFileUrl in the API
              textbookFileUrl: documentUrl, // Also set this for compatibility
              documentType: documentUrl.split('.').pop()?.toLowerCase() || 'pdf',
            };

            try {
              const response = await fetch(`/api/modules/${currentModuleId}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(contentData),
              });

              if (response.ok) {
                const data = await response.json();
                setModules(
                  modules.map((m: any) =>
                    m.id === currentModuleId
                      ? {
                          ...m,
                          items: [...m.items, data.chapter],
                        }
                      : m
                  )
                );
                setShowDocumentModal(false);
                setCurrentModuleId(null);
              }
            } catch (error) {
              console.error('Error adding document:', error);
            }
          }}
        />
      )}
    </div>
  );
};

// --- Q-BANK LIST (MAIN) ---
const QBankList = ({
  nav,
  setActive,
}: {
  nav: (mod: string, id?: number) => void;
  setActive: (item: any) => void;
}) => {
  const notification = useNotification();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = React.useState<number | null>(null);
  const [selectedQuestions, setSelectedQuestions] = React.useState<Set<number>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = React.useState(false);
  const [showCourseAssignModal, setShowCourseAssignModal] = React.useState(false);
  const [showQuizAssignModal, setShowQuizAssignModal] = React.useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = React.useState(false);
  const [editingFolder, setEditingFolder] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [draggedQuestion, setDraggedQuestion] = React.useState<any>(null);
  const [dragOverFolder, setDragOverFolder] = React.useState<number | null>(null);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = React.useState<number | null>(null);
  const [selectedQuizForAssign, setSelectedQuizForAssign] = React.useState<number | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = React.useState<any[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = React.useState<number | null>(null);

  // ⚡ PERFORMANCE: Use React Query for categories with caching
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['qbank-categories'],
    queryFn: async () => {
      const response = await fetch('/api/qbank/categories', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('⚡ Categories loaded and cached');
        return data.categories || [];
      }
      return [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ⚡ PERFORMANCE: Use React Query for questions with caching
  const {
    data: questions = [],
    isLoading,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ['qbank-questions', selectedCategory, selectedCourseFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (selectedCategory) {
        params.append('categoryId', selectedCategory.toString());
      }
      if (selectedCourseFilter) {
        params.append('courseId', selectedCourseFilter.toString());
      }
      
      const url = `/api/qbank?${params.toString()}`;
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('⚡ Questions loaded and cached (filtered by course:', selectedCourseFilter, ')');
        return data.questions || [];
      }
      return [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // ⚡ PERFORMANCE: Use React Query for courses (reuse from cache)
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        return data.courses || [];
      }
      return [];
    },
    staleTime: 60 * 1000, // 1 minute - likely already cached from CourseList
  });

  const assignCategoryToCourse = async () => {
    if (!selectedCourseForAssign) {
      notification.showError('Please select a course first');
      return;
    }

    // Get questions to assign
    let questionIds: number[];
    let folderName = '';

    if (selectedCategory) {
      // Assign from specific folder
      const categoryQuestions = questions.filter((q) => q.categoryId === selectedCategory);
      const folder = categories.find((c) => c.id === selectedCategory);
      folderName = folder?.name || 'Unknown';

      if (categoryQuestions.length === 0) {
        notification.showError(
          'No questions in folder',
          `The folder "${folderName}" is empty. Move questions to this folder first, or use "All Questions" to assign everything.`
        );
        return;
      }

      questionIds = categoryQuestions.map((q) => parseInt(q.id));
    } else {
      // Assign all questions (when "All Questions" is selected)
      if (questions.length === 0) {
        notification.showError('No questions available', 'Create questions in Q-Bank first.');
        return;
      }
      questionIds = questions.map((q) => parseInt(q.id));
      folderName = 'All Questions';
    }

    console.log(
      `📦 Assigning ${questionIds.length} questions from "${folderName}" to course ${selectedCourseForAssign}`
    );
    console.log('Question IDs:', questionIds);

    try {
      const response = await fetch(`/api/courses/${selectedCourseForAssign}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionIds }),
      });

      if (response.ok) {
        const data = await response.json();
        notification.showSuccess(
          'Questions Assigned!',
          `${questionIds.length} questions from "${folderName}" added to course.`
        );
        setShowCourseAssignModal(false);
        setSelectedCourseForAssign(null);
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Assignment failed:', error);
        notification.showError(error.message || 'Failed to assign questions');
      }
    } catch (error) {
      console.error('Error assigning to course:', error);
      notification.showError('Failed to assign questions to course');
    }
  };

  // ✅ NEW: Assign selected questions to a quiz
  const assignQuestionsToQuiz = async () => {
    if (!selectedQuizForAssign) {
      notification.showError('Please select a quiz first');
      return;
    }

    if (selectedQuestions.size === 0) {
      notification.showError('Please select questions first');
      return;
    }

    const questionIds = Array.from(selectedQuestions);

    console.log(`📚 Assigning ${questionIds.length} questions to quiz ${selectedQuizForAssign}`);

    try {
      const response = await fetch(`/api/quizzes/${selectedQuizForAssign}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionIds }),
      });

      if (response.ok) {
        const data = await response.json();
        notification.showSuccess(
          'Questions Assigned to Quiz!',
          `${questionIds.length} questions added to the quiz. Students can now take it.`
        );
        setShowQuizAssignModal(false);
        setSelectedQuizForAssign(null);
        setSelectedQuestions(new Set()); // Clear selection
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Quiz assignment failed:', error);
        notification.showError(error.message || 'Failed to assign questions to quiz');
      }
    } catch (error) {
      console.error('Error assigning to quiz:', error);
      notification.showError('Failed to assign questions to quiz');
    }
  };

  // ✅ NEW: Fetch available quizzes when modal opens
  React.useEffect(() => {
    if (showQuizAssignModal) {
      fetchAvailableQuizzes();
    }
  }, [showQuizAssignModal]);

  const fetchAvailableQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes/all', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAvailableQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  // ✅ CLONE - Drag & drop creates a copy in target folder
  const cloneQuestionToCategory = async (questionId: number, targetCategoryId: number | null) => {
    try {
      if (!targetCategoryId) {
        notification.showWarning(
          'Select a folder',
          'Please select a specific folder to clone the question to.'
        );
        return;
      }

      const response = await fetch('/api/qbank/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId, targetCategoryId }),
      });

      if (response.ok) {
        const data = await response.json();
        notification.showSuccess('Question cloned!', 'A copy has been added to the folder.');
        // ⚡ PERFORMANCE: Invalidate cache after mutation
        queryClient.invalidateQueries({ queryKey: ['qbank-questions'] });
        queryClient.invalidateQueries({ queryKey: ['qbank-categories'] });
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to clone' }));
        notification.showError(error.message);
      }
    } catch (error) {
      console.error('Error cloning question:', error);
      notification.showError('Failed to clone question');
    }
  };

  // ✅ MOVE - Dropdown changes which folder the question belongs to
  const moveQuestionToCategory = async (questionId: number, categoryId: number | null) => {
    try {
      const response = await fetch('/api/qbank', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId, categoryId }),
      });
      if (response.ok) {
        notification.showSuccess(
          'Question moved!',
          categoryId ? 'Question moved to folder.' : 'Question removed from folder.'
        );
        // ⚡ PERFORMANCE: Invalidate cache after mutation
        queryClient.invalidateQueries({ queryKey: ['qbank-questions'] });
        queryClient.invalidateQueries({ queryKey: ['qbank-categories'] });
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to move' }));
        notification.showError(error.message);
      }
    } catch (error) {
      console.error('Error moving question:', error);
      notification.showError('Failed to move question');
    }
  };

  const bulkMoveQuestions = async (categoryId: number | null) => {
    try {
      const promises = Array.from(selectedQuestions).map((qId) =>
        fetch('/api/qbank', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ questionId: qId, categoryId }),
        })
      );
      await Promise.all(promises);
      setSelectedQuestions(new Set());
      setShowBulkMoveModal(false);
      // ⚡ PERFORMANCE: Invalidate cache after bulk mutation
      queryClient.invalidateQueries({ queryKey: ['qbank-questions'] });
      queryClient.invalidateQueries({ queryKey: ['qbank-categories'] });
    } catch (error) {
      console.error('Error bulk moving questions:', error);
    }
  };

  const toggleQuestionSelection = (questionId: number) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setSelectedQuestions(newSet);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(getFilteredQuestions.map((q: any) => parseInt(q.id))));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleDragStart = (e: any, question: any) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any, folderId: number | null = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy'; // ✅ Show copy cursor
    setDragOverFolder(folderId);
  };

  const handleDrop = async (e: any, categoryId: number | null) => {
    e.preventDefault();
    setDragOverFolder(null); // Clear drag-over state
    if (draggedQuestion && categoryId) {
      // ✅ CLONE question to target folder instead of moving
      await cloneQuestionToCategory(parseInt(draggedQuestion.id), categoryId);
      setDraggedQuestion(null);
    }
  };

  // ⚡ PERFORMANCE: Memoize filtered questions to prevent unnecessary recalculations
  const getFilteredQuestions = React.useMemo(() => {
    let filtered = questions;
    if (searchTerm) {
      filtered = filtered.filter(
        (q: any) =>
          q.stem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.id?.toString().includes(searchTerm)
      );
    }
    return filtered;
  }, [questions, searchTerm]);

  const editFolder = (folder: any) => {
    setEditingFolder(folder);
    setShowEditFolderModal(true);
  };

  const updateFolder = async () => {
    if (!editingFolder) return;

    const name = (document.getElementById('editFolderName') as HTMLInputElement)?.value;
    const icon = (document.getElementById('editFolderIcon') as HTMLInputElement)?.value;
    const color = (document.getElementById('editFolderColor') as HTMLInputElement)?.value;

    if (!name) {
      notification.showError('Folder name is required');
      return;
    }

    try {
      const response = await fetch(`/api/qbank/categories/${editingFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, icon, color }),
      });

      if (response.ok) {
        notification.showSuccess('Folder updated successfully');
        setShowEditFolderModal(false);
        setEditingFolder(null);
        // ⚡ PERFORMANCE: Invalidate cache after update
        queryClient.invalidateQueries({ queryKey: ['qbank-categories'] });
      } else {
        notification.showError('Failed to update folder');
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      notification.showError('Failed to update folder');
    }
  };

  const deleteFolder = async (folderId: number) => {
    const folder = categories.find((c) => c.id === folderId);

    if (folder && folder.questionCount > 0) {
      notification.showError(
        `Cannot delete folder with ${folder.questionCount} questions`,
        'Move or delete questions first'
      );
      return;
    }

    notification.showConfirm(
      'Delete Folder',
      `Are you sure you want to delete "${folder?.name}"?`,
      async () => {
        try {
          const response = await fetch(`/api/qbank/categories/${folderId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (response.ok) {
            notification.showSuccess('Folder deleted successfully');
            if (selectedCategory === folderId) {
              setSelectedCategory(null);
            }
            // ⚡ PERFORMANCE: Invalidate cache after delete
            queryClient.invalidateQueries({ queryKey: ['qbank-categories'] });
          } else {
            const error = await response.json();
            notification.showError(error.message || 'Failed to delete folder');
          }
        } catch (error) {
          console.error('Error deleting folder:', error);
          notification.showError('Failed to delete folder');
        }
      }
    );
  };

  return (
    <div className="p-8 h-full flex gap-6">
      {/* Folder Sidebar */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-4 h-full flex flex-col">
          {/* Course Filter Dropdown */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Filter by Course
            </label>
            <select
              value={selectedCourseFilter || ''}
              onChange={(e) => setSelectedCourseFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-[#1a1d26] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Courses</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Folders</h3>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="text-purple-400 hover:text-purple-300 transition"
              title="Add Folder"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            <div
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => handleDrop(e, null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold'
                  : 'text-slate-300 hover:bg-[#1a1d26] border-2 border-dashed border-transparent hover:border-purple-500/30'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <div className="flex items-center justify-between">
                <span>📋 All Questions</span>
                <span className="text-xs opacity-70">({questions.length})</span>
              </div>
            </div>
            {categories.map((cat: any) => (
              <div
                key={cat.id}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => handleDrop(e, cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer group ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold'
                    : dragOverFolder === cat.id
                      ? 'bg-green-600/30 border-2 border-dashed border-green-400 scale-105'
                      : 'text-slate-300 hover:bg-[#1a1d26] border-2 border-dashed border-transparent hover:border-purple-500/30'
                }`}
                style={{
                  borderLeft: selectedCategory === cat.id ? `3px solid ${cat.color}` : 'none',
                }}
              >
                <div
                  className="flex items-center justify-between"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs opacity-70">({cat.questionCount || 0})</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editFolder(cat);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition"
                      title="Edit Folder"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(cat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition"
                      title="Delete Folder"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {selectedCategory === cat.id && cat.questionCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCourseAssignModal(true);
                      }}
                      className="w-full text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition"
                    >
                      + Add to Course
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.name || 'Question Bank'
                : 'Question Bank'}
            </h2>
            <p className="text-slate-400 mt-1 text-sm">
              {selectedCategory
                ? `${categories.find((c) => c.id === selectedCategory)?.description || 'Category questions'}`
                : 'Manage Classic and Next Gen (NGN) Items'}
            </p>
          </div>
          <div className="flex gap-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#161922] border border-slate-800 text-slate-300 px-4 py-2.5 rounded-lg text-sm focus:border-purple-500 outline-none w-64"
              placeholder="Search ID or Content..."
            />
            <button
              onClick={() => {
                setActive({
                  id: null,
                  category: 'classic',
                  type: 'standard',
                  categoryId: selectedCategory,
                });
                nav('qbank_editor');
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
              <Plus size={18} /> Add Item
            </button>
          </div>
        </div>

        {/* ✅ Instructions for Clone vs Move */}
        {!selectedCategory && !draggedQuestion && questions.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3 mb-4">
            <p className="text-blue-300 text-sm">
              💡 <strong>Tip:</strong> Drag & drop questions to <strong>clone</strong> them to
              folders. Use the dropdown to <strong>move</strong> between folders.
            </p>
          </div>
        )}
        {draggedQuestion && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3 mb-4 animate-pulse">
            <p className="text-green-300 text-sm font-bold">
              📋 Drop on a folder to <strong>clone</strong> this question there (original stays in
              place)
            </p>
          </div>
        )}

        {/* Bulk Operations Toolbar */}
        {selectedQuestions.size > 0 && (
          <div className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-purple-300 text-sm font-bold">
              {selectedQuestions.size} question{selectedQuestions.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowQuizAssignModal(true)}
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded font-bold transition flex items-center gap-1"
                title="Assign selected questions to a quiz"
              >
                ⚡ Add to Quiz
              </button>
              <button
                onClick={() => setShowBulkMoveModal(true)}
                className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold transition"
              >
                Move to Folder
              </button>
              <button
                onClick={deselectAll}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden flex-1 flex flex-col">
          <div className="grid grid-cols-12 bg-[#1a1d26] p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800/60 items-center">
            <div className="col-span-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedQuestions.size > 0 &&
                  selectedQuestions.size === getFilteredQuestions.length
                }
                onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                className="w-4 h-4 rounded border-slate-600"
              />
              ID
            </div>
            <div className="col-span-4">Stem Preview</div>
            <div className="col-span-2">Folder</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1">Test</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {isLoading ? (
              <div className="space-y-1 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <QuestionRowSkeleton key={i} />
                ))}
              </div>
            ) : getFilteredQuestions.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p>
                  {searchTerm
                    ? 'No questions match your search.'
                    : 'No questions found. Click "Add Item" to create your first question.'}
                </p>
              </div>
            ) : (
              getFilteredQuestions.map((q: any, i: number) => {
                const isSelected = selectedQuestions.has(parseInt(q.id));
                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={(e) => handleDragStart(e, q)}
                    className={`grid grid-cols-12 p-3 rounded-lg items-center transition-all group cursor-move border ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500/50'
                        : 'border-transparent hover:bg-[#1f222e] hover:border-slate-800'
                    }`}
                  >
                    <div className="col-span-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleQuestionSelection(parseInt(q.id))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-600"
                      />
                      <span className="text-slate-500 font-mono text-xs">{q.id}</span>
                    </div>
                    <div
                      className="col-span-4 text-slate-300 font-medium truncate pr-4 cursor-pointer"
                      onClick={() => {
                        setActive(q);
                        nav('qbank_editor');
                      }}
                    >
                      {q.stem}
                    </div>
                    <div className="col-span-2">
                      <select
                        value={q.categoryId || ''}
                        onChange={(e) => {
                          const newCategoryId = e.target.value ? parseInt(e.target.value) : null;
                          moveQuestionToCategory(parseInt(q.id), newCategoryId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-[#1a1d26] border border-slate-700 text-slate-300 px-2 py-1 rounded focus:border-purple-500 outline-none w-full"
                        title="Move question to folder (changes primary folder)"
                      >
                        <option value="">None</option>
                        {categories.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="text-[9px] text-slate-500 mt-0.5">💡 Drag to clone</div>
                    </div>
                    <div className="col-span-2 text-xs text-slate-400">{q.label}</div>
                    <div className="col-span-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${q.category === 'ngn' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}
                      >
                        {q.category === 'ngn' ? 'NGN' : 'Classic'}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => {
                          setActive(q);
                          nav('qbank_editor');
                        }}
                        className="text-xs font-bold text-white bg-slate-700 px-3 py-1 rounded hover:bg-purple-600 transition"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bulk Move Modal */}
        {showBulkMoveModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowBulkMoveModal(false)}
          >
            <div
              className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">
                Move {selectedQuestions.size} Questions
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Select a folder to move the selected questions:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar mb-6">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => bulkMoveQuestions(cat.id)}
                    className="w-full text-left px-4 py-3 rounded-lg bg-[#1a1d26] hover:bg-purple-600/20 hover:border-purple-500/50 border border-transparent transition-all text-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold">{cat.name}</div>
                        <div className="text-xs text-slate-500">
                          {cat.description || 'No description'}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">({cat.questionCount})</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowBulkMoveModal(false)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Course Assignment Modal */}
        {showCourseAssignModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCourseAssignModal(false)}
          >
            <div
              className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-[500px]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2">Assign Questions to Course</h3>
              {(() => {
                const folder = categories.find((c) => c.id === selectedCategory);
                const categoryQuestions = selectedCategory
                  ? questions.filter((q) => q.categoryId === selectedCategory)
                  : questions;
                const questionCount = categoryQuestions.length;
                const folderName = selectedCategory ? folder?.name : 'All Questions';

                return (
                  <>
                    <div
                      className={`text-sm mb-4 p-3 rounded-lg ${
                        questionCount === 0
                          ? 'bg-red-900/20 border border-red-500/30 text-red-300'
                          : 'bg-purple-900/20 border border-purple-500/30 text-purple-300'
                      }`}
                    >
                      {questionCount === 0 ? (
                        <>
                          ⚠️ No questions in "{folderName}"
                          <br />
                          <span className="text-xs">
                            Move questions to this folder first, or select "All Questions"
                          </span>
                        </>
                      ) : (
                        <>
                          📦 Ready to assign: <strong>{questionCount} questions</strong> from "
                          {folderName}"
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar mb-6">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseForAssign(course.id)}
                    className={`w-full text-left p-4 rounded-lg transition border ${
                      selectedCourseForAssign === course.id
                        ? 'bg-purple-600/20 border-purple-500'
                        : 'bg-[#1a1d26] border-slate-800 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="font-bold text-white">{course.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{course.instructor}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCourseAssignModal(false);
                    setSelectedCourseForAssign(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={assignCategoryToCourse}
                  disabled={
                    !selectedCourseForAssign ||
                    (selectedCategory
                      ? questions.filter((q) => q.categoryId === selectedCategory).length === 0
                      : questions.length === 0)
                  }
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Questions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Quiz Assignment Modal */}
        {showQuizAssignModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowQuizAssignModal(false)}
          >
            <div
              className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-[500px]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2">⚡ Assign Questions to Quiz</h3>
              <div className="text-sm mb-4 p-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-300">
                📚 Ready to assign: <strong>{selectedQuestions.size} selected questions</strong>
                <br />
                <span className="text-xs">
                  These questions will be added to the quiz you select below.
                </span>
              </div>

              {availableQuizzes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="mb-2">No quizzes found.</p>
                  <p className="text-xs">Create a quiz in the Course Builder first.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar mb-6">
                  {availableQuizzes.map((quiz) => (
                    <button
                      key={quiz.id}
                      onClick={() => setSelectedQuizForAssign(quiz.id)}
                      className={`w-full text-left p-4 rounded-lg transition border ${
                        selectedQuizForAssign === quiz.id
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-[#1a1d26] border-slate-800 hover:border-green-500/50'
                      }`}
                    >
                      <div className="font-bold text-white">{quiz.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Pass Mark: {quiz.passMark}% • Max Attempts: {quiz.maxAttempts}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowQuizAssignModal(false);
                    setSelectedQuizForAssign(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={assignQuestionsToQuiz}
                  disabled={!selectedQuizForAssign || availableQuizzes.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign to Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Folder Modal */}
        {showEditFolderModal && editingFolder && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setShowEditFolderModal(false);
              setEditingFolder(null);
            }}
          >
            <div
              className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Edit Folder</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Folder Name</label>
                  <input
                    id="editFolderName"
                    type="text"
                    defaultValue={editingFolder.name}
                    className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Icon (Emoji)</label>
                  <input
                    id="editFolderIcon"
                    type="text"
                    defaultValue={editingFolder.icon}
                    className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Color</label>
                  <input
                    id="editFolderColor"
                    type="color"
                    defaultValue={editingFolder.color}
                    className="w-full h-10 bg-[#1a1d26] border border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEditFolderModal(false);
                      setEditingFolder(null);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateFolder}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition"
                  >
                    Update Folder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCategoryModal(false)}
          >
            <div
              className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Create New Folder</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Folder Name</label>
                  <input
                    id="newCategoryName"
                    type="text"
                    placeholder="e.g., Cardiovascular"
                    className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Icon (Emoji)</label>
                  <input
                    id="newCategoryIcon"
                    type="text"
                    placeholder="❤️"
                    defaultValue="📁"
                    className="w-full bg-[#1a1d26] border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Color</label>
                  <input
                    id="newCategoryColor"
                    type="color"
                    defaultValue="#8B5CF6"
                    className="w-full h-10 bg-[#1a1d26] border border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const name = (document.getElementById('newCategoryName') as HTMLInputElement)
                        ?.value;
                      const icon =
                        (document.getElementById('newCategoryIcon') as HTMLInputElement)?.value ||
                        '📁';
                      const color =
                        (document.getElementById('newCategoryColor') as HTMLInputElement)?.value ||
                        '#8B5CF6';
                      if (!name) return;

                      try {
                        const response = await fetch('/api/qbank/categories', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ name, icon, color }),
                        });
                        if (response.ok) {
                          setShowCategoryModal(false);
                          // ⚡ PERFORMANCE: Invalidate cache after create
                          queryClient.invalidateQueries({ queryKey: ['qbank-categories'] });
                        }
                      } catch (error) {
                        console.error('Error creating category:', error);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition"
                  >
                    Create Folder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- BLOG MANAGER MODULE ---
const BlogManager = ({ nav }: { nav: (mod: string) => void }) => {
  const [blogs, setBlogs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingBlog, setEditingBlog] = React.useState<any | null>(null);
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [content, setContent] = React.useState('');
  const [author, setAuthor] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [status, setStatus] = React.useState('draft');
  const [cover, setCover] = React.useState('');
  const [excerpt, setExcerpt] = React.useState('');
  const [featured, setFeatured] = React.useState(false);
  const [seoTitle, setSeoTitle] = React.useState('');
  const [seoDescription, setSeoDescription] = React.useState('');
  const [scheduledPublish, setScheduledPublish] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [readingTime, setReadingTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      // Since blog API is public in student app, we'll use that or create a new one in admin
      // For now, we'll assume there's an admin endpoint or use direct DB access via new API
      // Let's create the API endpoint first
      const response = await fetch('/api/blogs', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setBlogs(data.blogs || []);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingBlog ? 'PATCH' : 'POST';
      const url = editingBlog ? `/api/blogs/${editingBlog.id}` : '/api/blogs';

      const response = await fetch(url, {
        method: editingBlog ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          slug,
          content,
          author,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
          status,
          cover: cover || null,
          excerpt,
          featured,
          seoTitle: seoTitle || title,
          seoDescription: seoDescription || excerpt,
          scheduledPublish: scheduledPublish || null,
          category,
          readingTime: readingTime || null,
        }),
      });

      if (response.ok) {
        alert(`Blog post ${editingBlog ? 'updated' : 'created'} successfully`);
        setEditingBlog(null);
        resetForm();
        fetchBlogs();
      } else {
        alert('Failed to save blog post');
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      alert('Failed to save blog post');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchBlogs();
      } else {
        alert('Failed to delete blog post');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  };

  const handleEdit = (blog: any) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setSlug(blog.slug);
    setContent(blog.content);
    setAuthor(blog.author);
    setTags(
      Array.isArray(blog.tags)
        ? blog.tags.join(', ')
        : typeof blog.tags === 'string'
          ? JSON.parse(blog.tags).join(', ')
          : ''
    );
    setStatus(blog.status);
    setCover(blog.cover || '');
    setExcerpt(blog.excerpt || '');
    setFeatured(blog.featured || false);
    setSeoTitle(blog.seoTitle || blog.title);
    setSeoDescription(blog.seoDescription || '');
    setScheduledPublish(blog.scheduledPublish || '');
    setCategory(blog.category || '');
    setReadingTime(blog.readingTime || null);
  };

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setContent('');
    setAuthor('');
    setTags('');
    setStatus('draft');
    setCover('');
    setExcerpt('');
    setFeatured(false);
    setSeoTitle('');
    setSeoDescription('');
    setScheduledPublish('');
    setCategory('');
    setReadingTime(null);
    setEditingBlog(null);
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Blog Manager</h2>
          <p className="text-slate-400 mt-2 text-sm">Create and manage blog posts</p>
        </div>
        {editingBlog && (
          <button onClick={resetForm} className="text-slate-400 hover:text-white text-sm font-bold">
            Cancel Edit
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form */}
        <div className="lg:col-span-2 bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-6">{editingBlog ? 'Edit Post' : 'New Post'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!editingBlog)
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/ /g, '-')
                          .replace(/[^\w-]+/g, '')
                      );
                  }}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Cover Image URL</label>
              <input
                type="url"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Excerpt / Summary
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 h-20 resize-none"
                placeholder="Brief summary for preview cards..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 h-64 font-mono"
                placeholder="# Markdown supported..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Nursing Tips, Study Guide"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="nursing, tips, study"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Reading Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={readingTime || ''}
                  onChange={(e) => setReadingTime(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Auto-calculated if empty"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1d26] border-slate-800 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs font-bold text-slate-400">Featured Post</span>
              </label>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">SEO Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Leave empty to use post title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    SEO Description
                  </label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 h-16 resize-none"
                    placeholder="Meta description for search engines"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Scheduled Publish Date (optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledPublish}
                onChange={(e) => setScheduledPublish(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave empty to publish immediately when status is set to published
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              {editingBlog ? 'Update Post' : 'Create Post'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-800/60 bg-[#1a1d26]">
            <h3 className="font-bold text-white">All Posts</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <p className="text-center text-slate-500 py-4">Loading...</p>
            ) : blogs.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No posts found</p>
            ) : (
              blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="p-3 bg-[#1a1d26] border border-slate-800/40 rounded-lg hover:border-purple-500/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-sm line-clamp-1">{blog.title}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${blog.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}
                    >
                      {blog.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-500">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(blog)}
                        className="text-blue-400 hover:text-blue-300 text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(blog.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- QUIZ MANAGER MODULE ---
const QuizManager = ({ nav }: { nav: (mod: string) => void }) => {
  const [courses, setCourses] = React.useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>('');
  const [modules, setModules] = React.useState<any[]>([]);
  const [selectedModule, setSelectedModule] = React.useState<string>('');
  const [chapters, setChapters] = React.useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = React.useState<string>('');
  const [quizzes, setQuizzes] = React.useState<any[]>([]);
  const [title, setTitle] = React.useState('');
  const [passMark, setPassMark] = React.useState(70);
  const [timeLimit, setTimeLimit] = React.useState(30);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [newQuestion, setNewQuestion] = React.useState({
    question: '',
    options: { a: '', b: '', c: '', d: '' },
    correctAnswer: 'a',
    explanation: '',
  });

  React.useEffect(() => {
    fetchCourses();
  }, []);

  React.useEffect(() => {
    if (selectedCourse) fetchModules(selectedCourse);
  }, [selectedCourse]);

  React.useEffect(() => {
    if (selectedModule) fetchChapters(selectedModule);
  }, [selectedModule]);

  React.useEffect(() => {
    if (selectedChapter) fetchQuizzes(selectedChapter);
  }, [selectedChapter]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchModules = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/modules`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const fetchChapters = async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}/chapters`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setChapters(data.chapters || []);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchQuizzes = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/quizzes?chapterId=${chapterId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.question || !newQuestion.options.a || !newQuestion.options.b) return;
    setQuestions([...questions, { ...newQuestion }]);
    setNewQuestion({
      question: '',
      options: { a: '', b: '', c: '', d: '' },
      correctAnswer: 'a',
      explanation: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapter || questions.length === 0) return;

    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chapterId: selectedChapter,
          title,
          passMark,
          timeLimit,
          questions,
        }),
      });

      if (response.ok) {
        alert('Quiz created successfully');
        setTitle('');
        setQuestions([]);
        fetchQuizzes(selectedChapter);
      } else {
        alert('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz');
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white tracking-tight">Quiz Manager</h2>
        <p className="text-slate-400 mt-2 text-sm">Create assessments for your chapters</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quiz Form */}
        <div className="lg:col-span-2 bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-6">Create New Quiz</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
            >
              <option value="">Select Course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              disabled={!selectedCourse}
              className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
            >
              <option value="">Select Module...</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              disabled={!selectedModule}
              className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
            >
              <option value="">Select Chapter...</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {selectedChapter && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Quiz Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Pass Mark (%)
                  </label>
                  <input
                    type="number"
                    value={passMark}
                    onChange={(e) => setPassMark(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Time Limit (min)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-6">
                <h4 className="font-bold text-white mb-4">Add Questions ({questions.length})</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Question text"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    {['a', 'b', 'c', 'd'].map((opt) => (
                      <input
                        key={opt}
                        type="text"
                        placeholder={`Option ${opt.toUpperCase()}`}
                        value={newQuestion.options[opt as keyof typeof newQuestion.options]}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            options: { ...newQuestion.options, [opt]: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Correct Option
                      </label>
                      <select
                        value={newQuestion.correctAnswer}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                      >
                        {['a', 'b', 'c', 'd'].map((opt) => (
                          <option key={opt} value={opt}>
                            Option {opt.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Explanation
                      </label>
                      <input
                        type="text"
                        value={newQuestion.explanation}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, explanation: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full py-2 border border-purple-500/50 text-purple-400 font-bold rounded-lg hover:bg-purple-500/10"
                  >
                    Add Question
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
              >
                Save Quiz
              </button>
            </form>
          )}
        </div>

        {/* Quiz List */}
        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-6">Existing Quizzes</h3>
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="p-3 bg-[#1a1d26] border border-slate-800/40 rounded-lg">
                <h4 className="font-bold text-white text-sm">{quiz.title}</h4>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Pass: {quiz.passMark}%</span>
                  <span>{quiz.questions?.length || 0} questions</span>
                </div>
              </div>
            ))}
            {quizzes.length === 0 && (
              <p className="text-slate-500 text-sm text-center">No quizzes found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- UNIVERSAL QUESTION EDITOR (THE CORE) ---
const UniversalQuestionEditor = ({ question, back }: { question: any; back: () => void }) => {
  const [category, setCategory] = useState(question?.category || 'classic');
  const [type, setType] = useState(question?.type || 'standard');
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState('scenario');
  const [questionData, setQuestionData] = useState(
    question || {
      options: ['', '', '', ''],
      correctAnswer: 0,
      format: 'multiple_choice',
    }
  );

  // When category changes, reset type to first available in that category
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const mode = QUESTION_MODES[newCat.toUpperCase() as keyof typeof QUESTION_MODES];
    if (mode && mode.types.length > 0) {
      setType(mode.types[0].id);
    }
  };

  // Map question types to QuestionTypeBuilder formats
  const getQuestionFormat = (questionType: string): any => {
    const formatMap: Record<string, string> = {
      standard: 'multiple_choice',
      sata_classic: 'sata',
      matrix: 'matrix_multiple_response',
      drag_drop: 'extended_drag_drop',
      cloze: 'cloze_dropdown',
      bowtie: 'bowtie',
      trend: 'trend_item',
      ordering: 'ranking',
      casestudy: 'case_study',
    };
    return formatMap[questionType] || 'multiple_choice';
  };

  // Handle question data changes
  const handleQuestionChange = (updatedQuestion: any) => {
    setQuestionData(updatedQuestion);
  };

  // Render specific editor based on type
  const renderEditor = () => {
    // Use QuestionTypeBuilder for all question types
    const format = getQuestionFormat(type);
    return (
      <div className="bg-[#161922] border border-slate-800/60 rounded-xl p-6 shadow-xl">
        <QuestionTypeBuilder
          format={format}
          question={questionData}
          onChange={handleQuestionChange}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0d12]">
      {/* EDITOR HEADER */}
      <div className="h-20 bg-gradient-to-r from-[#161922] to-[#1a1d26] border-b border-slate-800/60 flex items-center justify-between px-6 z-20 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={back}
            className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-white text-xl tracking-tight">Question Editor</h2>
            <div className="flex items-center gap-3 mt-2">
              {/* CATEGORY SWITCHER */}
              <div className="flex bg-[#0b0d12] rounded-lg p-1 border border-slate-700/50 shadow-inner">
                <button
                  onClick={() => handleCategoryChange('classic')}
                  className={`px-4 py-1 text-xs font-bold rounded-md transition-all duration-200 ${category === 'classic' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  CLASSIC
                </button>
                <button
                  onClick={() => handleCategoryChange('ngn')}
                  className={`px-4 py-1 text-xs font-bold rounded-md transition-all duration-200 ${category === 'ngn' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  NGN MODE
                </button>
              </div>
              <span className="text-slate-600">|</span>
              {/* TYPE SELECTOR */}
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-[#0b0d12] border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
              >
                {(
                  QUESTION_MODES[category.toUpperCase() as keyof typeof QUESTION_MODES]?.types || []
                ).map((t: { id: string; label: string }) => (
                  <option key={t.id} value={t.id} className="bg-[#0b0d12]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="text-slate-400 px-5 py-2 text-sm font-bold hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
            Preview
          </button>
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20">
            Save Item
          </button>
        </div>
      </div>

      {/* EDITOR BODY */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: SCENARIO / STEM (Shared) */}
        <div className="w-1/2 border-r border-slate-800/50 flex flex-col bg-gradient-to-br from-[#11131a] to-[#0b0d12]">
          {/* If NGN, show tabs. If Classic, just simple stem header */}
          {category === 'ngn' ? (
            <div className="p-4 border-b border-slate-800/50 bg-[#161922] flex gap-2">
              {['Scenario', 'Vitals', 'Labs', 'Notes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                    activeTab === tab.toLowerCase()
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 border-b border-slate-800/50 bg-gradient-to-r from-[#161922] to-[#1a1d26]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Question Stem
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <textarea
              className="w-full h-full bg-[#161922]/50 border border-slate-800/50 rounded-xl p-4 outline-none text-slate-200 text-sm resize-none leading-relaxed focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-slate-600"
              placeholder={
                category === 'ngn'
                  ? `Enter patient ${activeTab} data here...`
                  : 'Enter the question text here...'
              }
              defaultValue={
                category === 'ngn'
                  ? 'A 45-year-old male client is admitted...'
                  : 'Which of the following is the priority nursing intervention?'
              }
            />
          </div>
        </div>

        {/* RIGHT: INTERACTION AREA */}
        <div className="w-1/2 flex flex-col bg-gradient-to-br from-[#0b0d12] to-[#11131a]">
          {type === 'casestudy' && (
            <div className="p-4 border-b border-slate-800/50 bg-gradient-to-r from-[#161922] to-[#1a1d26] flex justify-between items-center shadow-sm">
              <div className="flex gap-2">
                {CJMM_STEPS.map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      activeStep === s.step
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {s.step}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 bg-slate-800/50 rounded-lg">
                {CJMM_STEPS[activeStep - 1].label}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{renderEditor()}</div>

          <div className="border-t border-slate-800/50 p-4 bg-gradient-to-r from-[#11131a] to-[#161922]">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none text-slate-300 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors py-2">
                <span className="flex items-center gap-2">
                  <Zap size={14} className="text-purple-400" />
                  Rationale Engine
                </span>
                <ChevronRight
                  size={16}
                  className="group-open:rotate-90 transition-transform text-slate-500"
                />
              </summary>
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-purple-500/30">
                <input
                  className="w-full bg-[#0b0d12] border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="Correct Answer Explanation..."
                />
                <input
                  className="w-full bg-[#0b0d12] border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="Distractor Analysis..."
                />
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-EDITORS ---

const BowTieEditor = () => (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
        <Zap size={12} /> Bow-Tie Protocol
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <BowTieColumn title="Actions to Take" color="blue" count={2} center={false} />
      <div className="relative">
        <BowTieColumn title="Potential Condition" color="orange" count={1} center={true} />
        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#0b0d12] border border-slate-700 rounded-full flex items-center justify-center z-10 text-slate-500">
          <ChevronRight size={12} />
        </div>
        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#0b0d12] border border-slate-700 rounded-full flex items-center justify-center z-10 text-slate-500">
          <ChevronRight size={12} />
        </div>
      </div>
      <BowTieColumn title="Parameters to Monitor" color="green" count={2} center={false} />
    </div>
  </div>
);

const CaseStudyEditor = ({ step, setStep }: { step: number; setStep: (step: number) => void }) => (
  <div className="space-y-6">
    <div className="bg-[#161922] border border-slate-800 rounded-xl p-6 text-center border-dashed">
      <p className="text-slate-400 text-sm mb-2">Question Type for Step {step}</p>
      <div className="flex justify-center gap-2">
        <button className="px-3 py-1 bg-slate-800 rounded text-xs font-bold text-white hover:bg-purple-600">
          Matrix
        </button>
        <button className="px-3 py-1 bg-slate-800 rounded text-xs font-bold text-white hover:bg-purple-600">
          SATA
        </button>
        <button className="px-3 py-1 bg-slate-800 rounded text-xs font-bold text-white hover:bg-purple-600">
          Drop-Down
        </button>
      </div>
    </div>
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase">Question Stem</label>
      <textarea
        className="w-full bg-[#11131a] border border-slate-700 rounded-lg p-3 text-sm text-white h-24 resize-none"
        placeholder="Enter question text for this step..."
      />
    </div>
  </div>
);

const MatrixEditor = () => (
  <div className="bg-[#161922] border border-slate-800 rounded-xl overflow-hidden">
    <div className="grid grid-cols-4 bg-[#1a1d26] border-b border-slate-800 text-xs font-bold text-center py-3 text-slate-400">
      <div className="text-left pl-4">Row Item</div>
      <div>Indicated</div>
      <div>Contraindicated</div>
      <div>Non-Essential</div>
    </div>
    {[1, 2, 3, 4].map((r) => (
      <div key={r} className="grid grid-cols-4 border-b border-slate-800/50 py-2 items-center">
        <input
          className="mx-2 bg-[#0b0d12] border border-slate-700 rounded px-2 py-1 text-sm text-slate-300"
          placeholder={`Row ${r} text...`}
        />
        <div className="flex justify-center">
          <input type="radio" name={`r${r}`} className="accent-purple-500" />
        </div>
        <div className="flex justify-center">
          <input type="radio" name={`r${r}`} className="accent-purple-500" />
        </div>
        <div className="flex justify-center">
          <input type="radio" name={`r${r}`} className="accent-purple-500" />
        </div>
      </div>
    ))}
    <button className="w-full py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/10">
      + Add Row
    </button>
  </div>
);

const TrendEditor = () => (
  <div className="space-y-4">
    <p className="text-sm text-slate-400 text-center italic">
      "Review the data in the tabs to answer the question."
    </p>
    <StandardEditor type="radio" />
  </div>
);

const StandardEditor = ({ type }: { type: 'radio' | 'checkbox' }) => (
  <div className="space-y-4">
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 border border-slate-800 rounded-lg bg-[#11131a]"
        >
          <div className="w-6 h-6 rounded border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-500">
            {String.fromCharCode(64 + i)}
          </div>
          <input
            className="flex-1 bg-transparent outline-none text-sm text-slate-300"
            placeholder={`Option ${i}`}
          />
          <input type={type} name="opt" className="accent-blue-500 w-4 h-4" />
        </div>
      ))}
    </div>
    <button className="text-xs font-bold text-blue-400">+ Add Option</button>
  </div>
);

// --- HELPERS ---
const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="px-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-4">
      {title}
    </p>
    <div className="space-y-1">{children}</div>
  </div>
);

const NavItem = ({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | undefined;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold ${active ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-[#1a1d26] hover:text-white'}`}
  >
    <div className="flex items-center gap-3">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    {badge && (
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}
      >
        {badge}
      </span>
    )}
  </button>
);

const MetricCard = ({
  title,
  value,
  trend,
  color,
  icon,
}: {
  title: string;
  value: string;
  trend: string;
  color: string;
  icon?: React.ReactNode;
}) => {
  const colorClasses: Record<string, string> = {
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    pink: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  };

  return (
    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>{icon}</div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded border ${colorClasses[color] || colorClasses.blue}`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
};

const ProgressBar = ({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) => (
  <div>
    <div className="flex justify-between text-xs font-bold mb-2 text-slate-400">
      <span>{label}</span>
      <span>{percent}%</span>
    </div>
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
    </div>
  </div>
);

const QuickAddBtn = ({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
  >
    {icon} {label}
  </button>
);

const BowTieColumn = ({
  title,
  color,
  count,
  center,
}: {
  title: string;
  color: string;
  count: number;
  center?: boolean;
}) => {
  const colors: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
    green: 'border-green-500/30 bg-green-500/5 text-green-400',
  };
  const colorClass = colors[color] || colors.blue;
  return (
    <div
      className={`border rounded-xl p-4 flex flex-col ${colorClass} ${center ? 'ring-2 ring-orange-500/20' : ''}`}
    >
      <h4 className="text-[10px] font-black text-center uppercase tracking-widest mb-4 opacity-80">
        {title}
      </h4>
      <div className="flex-1 space-y-2 bg-[#11131a]/50 rounded p-2 min-h-[200px]">
        {Array.from({ length: count + 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded border border-transparent hover:bg-[#161922] hover:border-slate-700 cursor-pointer transition-all group"
          >
            <div className="w-3 h-3 border border-slate-600 rounded-sm group-hover:border-white"></div>
            <div className="h-1.5 w-16 bg-slate-800 rounded-full group-hover:bg-slate-600"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- ADMIN PROFILE MODULE ---
const AdminProfile = ({ nav, adminUser }: { nav: (mod: string) => void; adminUser: any }) => {
  const [user, setUser] = React.useState(adminUser);
  const [isLoading, setIsLoading] = React.useState(!adminUser);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: adminUser?.name || '',
    email: adminUser?.email || '',
    phone: adminUser?.phone || '',
    bio: adminUser?.bio || '',
  });

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/admin/profile', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setFormData({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            bio: data.user.bio || '',
          });
        } else if (adminUser) {
          // Fallback to adminUser from props
          setUser(adminUser);
          setFormData({
            name: adminUser.name || '',
            email: adminUser.email || '',
            phone: adminUser.phone || '',
            bio: adminUser.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching admin user:', error);
        if (adminUser) {
          // Fallback to adminUser from props
          setUser(adminUser);
          setFormData({
            name: adminUser.name || '',
            email: adminUser.email || '',
            phone: adminUser.phone || '',
            bio: adminUser.bio || '',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [adminUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setEditMode(false);
        // Refresh admin user in parent component
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="h-20 bg-[#161922] border-b border-slate-800/60 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav('dashboard')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-white text-xl">Admin Profile</h2>
        </div>
        <div className="flex gap-3">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-purple-500/30">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'AD'}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{user?.name || 'Admin User'}</h1>
                <p className="text-slate-300 mb-1">{user?.email || ''}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                    Active
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold border border-purple-500/30">
                    Super Admin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <User size={18} className="text-purple-400" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0b0d12] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                  ) : (
                    <p className="text-slate-200 font-medium">{user?.name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0b0d12] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                      disabled
                    />
                  ) : (
                    <p className="text-slate-200 font-medium">{user?.email || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0b0d12] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-slate-200 font-medium">{user?.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <Shield size={18} className="text-blue-400" />
                Account Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Role
                  </label>
                  <p className="text-slate-200 font-medium">{user?.role || 'admin'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Account Status
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-green-400 font-medium">Active</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Member Since
                  </label>
                  <p className="text-slate-200 font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="md:col-span-2 bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <FileText size={18} className="text-pink-400" />
                Bio
              </h3>
              {editMode ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0b0d12] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-slate-300 leading-relaxed">
                  {user?.bio || 'No bio provided yet.'}
                </p>
              )}
            </div>

            {/* Face ID Section */}
            <div className="md:col-span-2 bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <Monitor size={18} className="text-emerald-400" />
                Face ID Authentication
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 font-medium mb-1">Face ID Status</p>
                    <p className="text-sm text-slate-400">
                      {user?.faceIdEnrolled
                        ? 'Face ID is enrolled and ready to use'
                        : 'Face ID is not set up yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.faceIdEnrolled ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                        Enrolled
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs font-bold border border-slate-500/30">
                        Not Enrolled
                      </span>
                    )}
                  </div>
                </div>
                {user?.faceIdEnrolled ? (
                  <button
                    onClick={async () => {
                      if (
                        confirm(
                          'Are you sure you want to reset Face ID? You will need to enroll again.'
                        )
                      ) {
                        try {
                          const response = await fetch('/api/admin/profile/reset-face', {
                            method: 'POST',
                            credentials: 'include',
                          });
                          if (response.ok) {
                            const data = await response.json();
                            setUser({ ...user, faceIdEnrolled: false });
                            alert('Face ID has been reset. You can enroll again.');
                          } else {
                            alert('Failed to reset Face ID');
                          }
                        } catch (error) {
                          console.error('Error resetting Face ID:', error);
                          alert('Failed to reset Face ID');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                  >
                    Reset Face ID
                  </button>
                ) : (
                  <FaceEnrollmentComponent
                    onComplete={() => {
                      setUser({ ...user, faceIdEnrolled: true });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Face Enrollment Component
const FaceEnrollmentComponent = ({ onComplete }: { onComplete: () => void }) => {
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [status, setStatus] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [progress, setProgress] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [modelsReady, setModelsReady] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setModelsReady(true);
        setStatus('Camera ready. Position your face in the frame.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to access camera');
    }
  };

  const handleEnroll = async () => {
    if (!videoRef.current || !modelsReady) {
      setError('Camera not ready');
      return;
    }

    setIsEnrolling(true);
    setError('');
    setStatus('Get ready...');
    setProgress(0);

    try {
      // Import simple-face-auth functions
      const { enrollFace } = await import('@/lib/simple-face-auth');

      // Countdown
      for (let i = 3; i > 0; i--) {
        setStatus(`Capturing in ${i}...`);
        setProgress(10);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setStatus('Capturing face...');
      setProgress(30);

      const result = await enrollFace(videoRef.current);

      if (!result.success || !result.features) {
        throw new Error(result.error || 'Face capture failed');
      }

      setStatus('Saving face data...');
      setProgress(70);

      // Convert features to base64
      const faceTemplate = btoa(JSON.stringify(result.features));

      const response = await fetch('/api/auth/face-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ faceTemplate }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save face data');
      }

      setStatus('✓ Face enrollment successful!');
      setProgress(100);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Face enrollment failed');
      setIsEnrolling(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {!modelsReady ? (
        <button
          onClick={initializeCamera}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          Enable Camera
        </button>
      ) : (
        <>
          <div className="relative bg-[#0b0d12] rounded-xl overflow-hidden border border-slate-800">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
            {isEnrolling && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-white font-medium">{status}</p>
                  {progress > 0 && (
                    <div className="mt-2 w-48 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {status && !isEnrolling && <p className="text-slate-400 text-sm text-center">{status}</p>}
          <button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnrolling ? 'Enrolling...' : 'Start Enrollment'}
          </button>
        </>
      )}
    </div>
  );
};

// --- Q-BANK ANALYTICS MODULE ---
const QBankAnalytics = ({ nav }: { nav: (mod: string) => void }) => {
  const [students, setStudents] = React.useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [studentDetails, setStudentDetails] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const notification = useNotification();

  React.useEffect(() => {
    fetchStudentsAnalytics();
  }, []);

  const fetchStudentsAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/analytics/qbank-students', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching Q-Bank analytics:', error);
      notification.showError('Failed to load Q-Bank analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId: number) => {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/analytics/qbank-students/${studentId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStudentDetails(data);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      notification.showError('Failed to load student details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    fetchStudentDetails(student.id);
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  const exportToCSV = () => {
    const csv = [
      ['Name', 'Email', 'Tests Taken', 'Completed', 'Avg Score', 'Questions Attempted', 'Accuracy', 'Last Activity'].join(','),
      ...students.map((s) =>
        [
          s.name,
          s.email,
          s.totalTests,
          s.completedTests,
          `${s.avgScore}%`,
          s.questionsAttempted,
          `${s.accuracy}%`,
          s.lastTestDate ? new Date(s.lastTestDate).toLocaleDateString() : 'Never',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qbank-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    notification.showSuccess('Report exported successfully!');
  };

  if (selectedStudent && studentDetails) {
    return (
      <div className="p-8 overflow-y-auto h-full">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition"
        >
          <ArrowLeft size={20} />
          Back to All Students
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {studentDetails.student.name}'s Q-Bank Performance
          </h2>
          <p className="text-slate-400">{studentDetails.student.email}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {studentDetails.summary.totalTests}
            </div>
            <div className="text-sm text-slate-400">Total Tests</div>
          </div>
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {studentDetails.summary.completedTests}
            </div>
            <div className="text-sm text-slate-400">Completed</div>
          </div>
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {studentDetails.summary.uniqueQuestions}
            </div>
            <div className="text-sm text-slate-400">Questions Attempted</div>
          </div>
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              {studentDetails.summary.overallAccuracy}%
            </div>
            <div className="text-sm text-slate-400">Overall Accuracy</div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-[#161922] border border-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Performance by Subject</h3>
          <div className="space-y-3">
            {studentDetails.subjectPerformance.map((subj: any) => (
              <div key={subj.subject} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 font-medium">{subj.subject}</span>
                    <span className="text-slate-400 text-sm">
                      {subj.correct}/{subj.total} ({subj.accuracy}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        subj.accuracy >= 70
                          ? 'bg-green-500'
                          : subj.accuracy >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${subj.accuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test History */}
        <div className="bg-[#161922] border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Test History</h3>
          <div className="space-y-2">
            {studentDetails.tests.map((test: any) => (
              <div
                key={test.id}
                className="bg-[#1a1d26] border border-slate-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-white font-medium">{test.title || test.testId}</div>
                  <div className="text-sm text-slate-400">
                    {test.totalQuestions} questions • {test.mode} • {test.testType}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(test.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  {test.status === 'completed' ? (
                    <div>
                      <div
                        className={`text-2xl font-bold ${
                          test.percentage >= 70
                            ? 'text-green-400'
                            : test.percentage >= 50
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {test.percentage}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {test.score}/{test.maxScore}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 px-3 py-1 bg-yellow-500/20 rounded">
                      {test.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Q-Bank Analytics</h2>
          <p className="text-slate-400 mt-2">Monitor student Q-Bank performance and usage</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={students.length === 0}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#161922] border border-slate-800 rounded-xl p-6">
          <div className="text-4xl font-bold text-purple-400 mb-2">
            {students.filter(s => s.totalTests > 0).length}
          </div>
          <div className="text-slate-400">Active Students</div>
          <div className="text-xs text-slate-500 mt-1">
            {students.length} total with Q-Bank access
          </div>
        </div>
        <div className="bg-[#161922] border border-slate-800 rounded-xl p-6">
          <div className="text-4xl font-bold text-green-400 mb-2">
            {students.reduce((sum, s) => sum + s.completedTests, 0)}
          </div>
          <div className="text-slate-400">Total Tests Completed</div>
        </div>
        <div className="bg-[#161922] border border-slate-800 rounded-xl p-6">
          <div className="text-4xl font-bold text-blue-400 mb-2">
            {students.length > 0
              ? Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length)
              : 0}%
          </div>
          <div className="text-slate-400">Average Score</div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-[#161922] border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">No Q-Bank activity yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#1a1d26] border-b border-slate-800">
              <tr>
                <th className="text-left p-4 text-sm font-bold text-slate-400 uppercase">Student</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Tests</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Completed</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Avg Score</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Questions</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Accuracy</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Last Activity</th>
                <th className="text-center p-4 text-sm font-bold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-slate-800 hover:bg-[#1a1d26] transition cursor-pointer"
                  onClick={() => handleSelectStudent(student)}
                >
                  <td className="p-4">
                    <div className="text-white font-medium">{student.name}</div>
                    <div className="text-sm text-slate-400">{student.email}</div>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-white font-bold">{student.totalTests}</span>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-green-400 font-bold">{student.completedTests}</span>
                  </td>
                  <td className="text-center p-4">
                    <span
                      className={`font-bold ${
                        student.avgScore >= 70
                          ? 'text-green-400'
                          : student.avgScore >= 50
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {student.avgScore}%
                    </span>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-blue-400 font-bold">{student.questionsAttempted}</span>
                    <div className="text-xs text-slate-500">{student.totalAttempts} attempts</div>
                  </td>
                  <td className="text-center p-4">
                    <span
                      className={`font-bold ${
                        student.accuracy >= 70
                          ? 'text-green-400'
                          : student.accuracy >= 50
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {student.accuracy}%
                    </span>
                  </td>
                  <td className="text-center p-4">
                    <span className="text-sm text-slate-400">
                      {student.lastTestDate
                        ? new Date(student.lastTestDate).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </td>
                  <td className="text-center p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStudent(student);
                      }}
                      className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold transition"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

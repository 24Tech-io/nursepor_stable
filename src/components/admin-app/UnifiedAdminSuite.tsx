'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from './NotificationProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syncClient } from '@/lib/sync-client';
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
import ReadingModal from './ReadingModal';
import QuizSelectorModal from './QuizSelectorModal';
import StudentActivityModal from './StudentActivityModal';
import { Upload, Link as LinkIcon } from 'lucide-react';
import { convertToEmbedUrl, parseVideoUrl } from '@/lib/video-utils';
import { StatCardSkeleton, ActivityLogSkeleton, TableSkeleton, CourseCardSkeleton, QuestionRowSkeleton, ModuleSkeleton } from './LoadingSkeleton';
import CourseQBankManager from './CourseQBankManager';
import NursingCandidateList from './forms/NursingCandidateList';

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
  loading: () => null // Silent loading - no visible spinner
});

const QuestionTypeBuilder = dynamic(() => import('./qbank/QuestionTypeBuilder'), {
  loading: () => null // Silent loading - no visible spinner
});

// --- HELPER COMPONENTS ---
const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

const NavItem = ({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number | string | undefined }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${active
      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
      : 'text-slate-400 hover:text-white hover:bg-[#161922] border border-transparent hover:border-purple-500/30'
      }`}
  >
    <div className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-purple-400'}`}>
      {icon}
    </div>
    <span className="text-sm font-medium flex-1 text-left">{label}</span>
    {badge !== undefined && badge !== null && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
        }`}>
        {badge}
      </span>
    )}
  </button>
);

const MetricCard = ({ title, value, trend, color, icon }: { title: string; value: string; trend?: string; color?: string; icon?: React.ReactNode }) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
  };
  const bgColor = colorClasses[color || 'blue'] || colorClasses.blue;

  return (
    <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {icon && <div className={`text-${color || 'blue'}-400`}>{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {trend && <div className="text-xs text-slate-500">{trend}</div>}
    </div>
  );
};

const QuickAddBtn = ({ onClick, label, icon, active }: { onClick: () => void; label: string; icon?: React.ReactNode; active?: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-lg ${active
      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30'
      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-purple-500/30'
      }`}
  >
    {icon && <span>{icon}</span>}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

// Toggle Switch Component
const ToggleSwitch = ({
  label,
  checked,
  onChange,
  description,
  disabled = false
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between p-4 bg-[#1a1d26] rounded-lg border border-slate-800/50 hover:border-slate-700/50 transition-colors">
    <div className="flex-1 mr-4">
      <label className="text-sm font-semibold text-white cursor-pointer flex items-center gap-2">
        {label}
      </label>
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1a1d26] ${checked ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  </div>
);

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

  // Start sync client for real-time updates
  useEffect(() => {
    // TEMP DISABLED: Causing excessive requests`r`n
    // syncClient.start();
    const handleSync = () => {
      setRefreshCounter(prev => prev + 1);
    };
    syncClient.on('sync', handleSync);

    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, []);

  // Sync module with URL on mount and when URL changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;

      // Map paths to modules
      const pathToModule: Record<string, string> = {
        '/admin/dashboard': 'dashboard',
        '/admin/dashboard/students': 'students',
        '/admin/dashboard/requests': 'requests',
        '/admin/dashboard/courses': 'courses',
        '/admin/dashboard/qbank': 'qbank',
        '/admin/dashboard/profile': 'admin_profile',
        '/admin/dashboard/blogs': 'blogs',
        '/admin/dashboard/quizzes': 'quizzes',
        '/admin/dashboard/nursing-forms': 'nursing_forms',
      };

      // Check if it's the admin profile route
      if (path === '/admin/dashboard/profile') {
        if (currentModule !== 'admin_profile') {
          setCurrentModule('admin_profile');
        }
        return;
      }

      // Check if it's a student profile route
      const studentProfileMatch = path.match(/^\/admin\/dashboard\/students\/(\d+)$/);
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
      const courseEditorMatch = path.match(/^\/admin\/dashboard\/courses\/(\d+)$/);
      if (courseEditorMatch) {
        const courseId = parseInt(courseEditorMatch[1]);
        // Fetch course data and set as activeItem
        fetch(`/api/admin/courses/${courseId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.course) {
              setActiveItem(data.course);
              setCurrentModule('course_editor');
            }
          })
          .catch(() => setCurrentModule('courses'));
        return;
      }

      // Check if it's a qbank editor route (Q-Bank ID, not question ID)
      const qbankEditorMatch = path.match(/^\/admin\/dashboard\/qbank\/(\d+)$/);
      if (qbankEditorMatch) {
        const qbankId = parseInt(qbankEditorMatch[1]);
        // Fetch Q-Bank data and set as activeItem
        fetch(`/api/admin/qbanks/${qbankId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.qbank) {
              setActiveItem(data.qbank);
              setCurrentModule('qbank_editor');
            }
          })
          .catch(() => setCurrentModule('qbank'));
        return;
      }

      // Check if it's a NEW question route (creating a question)
      const newQuestionMatch = path.match(/^\/admin\/dashboard\/qbank\/(\d+)\/question\/new$/);
      if (newQuestionMatch) {
        const qbankId = parseInt(newQuestionMatch[1]);
        // Set qbank ID and show question editor in creation mode
        setActiveItem({ questionBankId: qbankId });
        setCurrentModule('question_editor');
        return;
      }

      // Check if it's a question editor route (editing existing question within a Q-Bank)
      const questionEditorMatch = path.match(/^\/admin\/dashboard\/qbank\/(\d+)\/question\/(\d+)$/);
      if (questionEditorMatch) {
        const questionId = parseInt(questionEditorMatch[2]);
        // Fetch question data and set as activeItem
        fetch(`/api/qbank/${questionId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.question) {
              setActiveItem(data.question);
              setCurrentModule('question_editor');
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
  }, []); // Only run once on mount

  // Listen for browser back/forward navigation
  React.useEffect(() => {
    const handlePopState = () => {
      // Re-parse URL when user uses browser back/forward buttons
      const path = window.location.pathname;
      // Check patterns again...
      const qbankEditorMatch = path.match(/^\/admin\/dashboard\/qbank\/(\d+)$/);
      const newQuestionMatch = path.match(/^\/admin\/dashboard\/qbank\/(\d+)\/question\/new$/);
      const questionEditorMatch = path.match(/^\/admin\/dashboard\/qbank\/(\d+)\/question\/(\d+)$/);

      if (newQuestionMatch) {
        const qbankId = parseInt(newQuestionMatch[1]);
        setActiveItem({ questionBankId: qbankId });
        setCurrentModule('question_editor');
      } else if (questionEditorMatch) {
        const questionId = parseInt(questionEditorMatch[2]);
        fetch(`/api/qbank/${questionId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.question) {
              setActiveItem(data.question);
              setCurrentModule('question_editor');
            }
          })
          .catch(() => setCurrentModule('qbank'));
      } else if (qbankEditorMatch) {
        const qbankId = parseInt(qbankEditorMatch[1]);
        fetch(`/api/admin/qbanks/${qbankId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => {
            if (data.qbank) {
              setActiveItem(data.qbank);
              setCurrentModule('qbank_editor');
            }
          })
          .catch(() => setCurrentModule('qbank'));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const nav = (mod: string, id?: number) => {
    // Update state immediately for instant UI response
    setCurrentModule(mod);

    // Update URL without causing remount (use shallow routing)
    if (typeof window !== 'undefined' && mod !== 'question_editor') {
      const routeMap: Record<string, string> = {
        'dashboard': '/admin/dashboard',
        'students': '/admin/dashboard/students',
        'student_profile': id ? `/admin/dashboard/students/${id}` : '/admin/dashboard/students',
        'requests': '/admin/dashboard/requests',
        'courses': '/admin/dashboard/courses',
        'course_editor': id ? `/admin/dashboard/courses/${id}` : '/admin/dashboard/courses',
        'qbank': '/admin/dashboard/qbank',
        'qbank_editor': id ? `/admin/dashboard/qbank/${id}` : '/admin/dashboard/qbank',
        'admin_profile': '/admin/dashboard/profile',
        'blogs': '/admin/dashboard/blogs',
        'quizzes': '/admin/dashboard/quizzes',
        'nursing_forms': '/admin/dashboard/nursing-forms',
      };
      const newUrl = routeMap[mod] || '/admin/dashboard';

      // Use replaceState for instant navigation without remount
      // Only use router.push for external navigation or first load
      if (window.location.pathname !== newUrl) {
        window.history.pushState({}, '', newUrl);
        // Dispatch popstate to sync URL change without remount
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  // Fetch admin user data
  React.useEffect(() => {
    const fetchAdminUser = async () => {
      try {
        const response = await fetch('/api/auth/me?type=admin', {
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
            <NavItem icon={<Layout size={18} />} label="Dashboard" active={currentModule === 'dashboard'} onClick={() => nav('dashboard')} badge={undefined} />
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
            <NavItem icon={<BookOpen size={18} />} label="Course Builder" active={currentModule.includes('course')} onClick={() => nav('courses')} badge={undefined} />
            <NavItem icon={<Database size={18} />} label="Q-Bank Manager" active={currentModule.includes('qbank')} onClick={() => nav('qbank')} badge={undefined} />
          </NavSection>

          <NavSection title="Administrative">
            <NavItem icon={<FileText size={18} />} label="Nursing Forms" active={currentModule === 'nursing_forms'} onClick={() => nav('nursing_forms')} badge={undefined} />
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
        {currentModule === 'students' && <StudentsList
          nav={nav}
          onSelectStudent={(id) => {
            setActiveStudentId(id);
            nav('student_profile', id);
          }}
          refreshTrigger={refreshCounter}
        />}
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
        {currentModule === 'quizzes' && <QuizManager nav={nav} />}
        {currentModule === 'courses' && <CourseList nav={nav} setActive={setActiveItem} />}
        {currentModule === 'course_editor' && (
          <CourseBuilder course={activeItem} back={() => nav('courses')} />
        )}
        {currentModule === 'qbank' && <QBankList nav={nav} setActive={setActiveItem} />}
        {currentModule === 'qbank_editor' && <QBankEditor qbank={activeItem} back={() => nav('qbank')} setActive={setActiveItem} nav={nav} />}
        {currentModule === 'question_editor' && <UniversalQuestionEditor question={activeItem} back={() => {
          // Go back to the Q-Bank editor if we have a Q-Bank ID
          const pathParts = window.location.pathname.split('/');
          const qbankId = pathParts[pathParts.length - 2];
          if (qbankId && !isNaN(parseInt(qbankId))) {
            nav('qbank_editor', parseInt(qbankId));
          } else {
            nav('qbank');
          }
        }} />}
        {currentModule === 'admin_profile' && <AdminProfile nav={nav} adminUser={adminUser} />}
        {currentModule === 'nursing_forms' && <NursingCandidateList nav={nav} />}
      </main>
    </div>
  );
}


// --- REQUESTS INBOX MODULE ---
const RequestsInbox = ({ nav }: { nav: (mod: string) => void }) => {
  const notification = useNotification();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [qbankRequests, setQbankRequests] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<'courses' | 'qbanks'>('courses');

  React.useEffect(() => {
    fetchRequests();
    fetchQBankRequests();
    // REMOVED: Auto-refresh on sync events
    // Requests will only refresh when actions are performed
  }, []);

  const fetchRequests = async () => {
    try {
      const timestamp = Date.now(); // Add timestamp to bust cache
      const response = await fetch(`/api/admin/requests?t=${timestamp}`, {
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch requests:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchQBankRequests = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/qbank-requests?status=pending&t=${timestamp}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQbankRequests(data.requests || []);
      } else {
        const text = await response.text().catch(() => '');
        console.error('Failed to fetch Q-Bank requests:', response.status, text);
        setQbankRequests([]); // prevent infinite spinner
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error fetching Q-Bank requests:', error);
      setQbankRequests([]);
      setIsLoading(false);
      return;
    }
  };

  const fetchAllRequests = async () => {
    setIsLoading(true);
    await Promise.all([fetchRequests(), fetchQBankRequests()]);
    setIsLoading(false);
  };

  const handleDeleteOrphaned = async (requestId: number, type: 'course' | 'qbank' = 'course') => {
    setProcessingId(requestId);
    try {
      const endpoint = type === 'qbank'
        ? `/api/admin/qbank-requests/${requestId}`
        : `/api/admin/requests/${requestId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        await fetchAllRequests();
        notification.showSuccess(`Orphaned ${type === 'qbank' ? 'Q-Bank' : 'Course'} request deleted successfully`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        notification.showError('Failed to delete request', errorData.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error deleting orphaned request:', error);
      notification.showError('Failed to delete request', error.message || 'Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAction = async (requestId: number, action: 'approve' | 'deny', type: 'course' | 'qbank' = 'course') => {
    setProcessingId(requestId);
    try {
      let response;
      if (type === 'qbank') {
        if (action === 'approve') {
          response = await fetch(`/api/admin/qbank-requests/${requestId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
        } else {
          response = await fetch(`/api/admin/qbank-requests/${requestId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason: 'Rejected by admin' }),
          });
        }
      } else {
        response = await fetch(`/api/admin/requests/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action }),
        });
      }

      if (response.ok) {
        const data = await response.json();

        // The PATCH endpoint always deletes requests after processing
        // So we should always refresh, but with a small delay to ensure DB transaction is committed
        console.log(`✅ [Frontend] ${type} Request ${requestId} ${action}d, refreshing list...`);

        // Refresh immediately (optimistic update)
        await fetchAllRequests();

        // Also refresh after a short delay to ensure database transaction is fully committed
        // This handles any race conditions where the GET request might run before deletion completes
        setTimeout(async () => {
          console.log(`🔄 [Frontend] Secondary refresh for ${type} request ${requestId}...`);
          await fetchAllRequests();
        }, 300);

        // Show success message
        const message = data.message || `${type === 'qbank' ? 'Q-Bank' : 'Course'} request ${action}d successfully`;
        notification.showSuccess(message);

        // If approved, the enrollment sync utility will handle enrollment automatically
        if (action === 'approve') {
          console.log(`✅ [Frontend] ${type} Request ${requestId} approved - enrollment will be synced automatically`);
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

  const reviewedRequests = requests.filter(r => r.status !== 'pending' && r.status !== null && r.status !== undefined);

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
          <h2 className="text-3xl font-bold text-white tracking-tight">Access Requests</h2>
          <p className="text-slate-400 mt-2 text-sm">Review and manage student access requests for courses and Q-Banks</p>
        </div>
        <button
          onClick={fetchAllRequests}
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

      {/* Tabs */}
      <div className="mb-6 flex gap-2 bg-[#161922] border border-slate-800/60 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${activeTab === 'courses'
            ? 'bg-purple-600 text-white'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          Course Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('qbanks')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${activeTab === 'qbanks'
            ? 'bg-purple-600 text-white'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          Q-Bank Requests ({qbankRequests.filter((r: any) => r.status === 'pending').length})
        </button>
      </div>

      {isLoading && requests.length === 0 && qbankRequests.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-slate-500">Loading requests...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Requests */}
          {activeTab === 'courses' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Pending Course Requests ({pendingRequests.length})</h3>
              {pendingRequests.length === 0 ? (
                <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-8 text-center">
                  <p className="text-slate-400">No pending course requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map(req => {
                    const isOrphaned = req.isOrphaned || req.studentName?.startsWith('[Deleted') || req.courseTitle?.startsWith('[Deleted');
                    return (
                      <div key={req.id} className={`bg-[#161922] border rounded-2xl p-6 ${isOrphaned ? 'border-yellow-600/60' : 'border-slate-800/60'}`}>
                        {isOrphaned && (
                          <div className="mb-3 p-2 bg-yellow-600/20 border border-yellow-600/40 rounded-lg">
                            <p className="text-xs text-yellow-400 font-semibold flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Orphaned Request: Associated user or course has been deleted
                            </p>
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                                {req.studentName?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <h4 className="font-bold text-white">{req.studentName}</h4>
                                <p className="text-xs text-slate-500">{req.studentEmail}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-sm text-slate-300">
                                Requesting access to: <span className="font-semibold text-purple-400">{req.courseTitle}</span>
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
                            {isOrphaned ? (
                              <button
                                onClick={() => handleDeleteOrphaned(req.id, 'course')}
                                disabled={processingId === req.id}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                Delete
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAction(req.id, 'approve', 'course')}
                                  disabled={processingId === req.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleAction(req.id, 'deny', 'course')}
                                  disabled={processingId === req.id}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                  Deny
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Q-Bank Requests */}
          {activeTab === 'qbanks' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Pending Q-Bank Requests ({qbankRequests.filter((r: any) => r.status === 'pending').length})</h3>
              {qbankRequests.filter((r: any) => r.status === 'pending').length === 0 ? (
                <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-8 text-center">
                  <p className="text-slate-400">No pending Q-Bank requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qbankRequests.filter((r: any) => r.status === 'pending').map((req: any) => {
                    const isOrphaned = req.isOrphaned || req.studentName?.startsWith('[Deleted') || req.qbankName?.startsWith('[Deleted');
                    return (
                      <div key={req.id} className={`bg-[#161922] border rounded-2xl p-6 ${isOrphaned ? 'border-yellow-600/60' : 'border-slate-800/60'}`}>
                        {isOrphaned && (
                          <div className="mb-3 p-2 bg-yellow-600/20 border border-yellow-600/40 rounded-lg">
                            <p className="text-xs text-yellow-400 font-semibold flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Orphaned Request: Associated user or Q-Bank has been deleted
                            </p>
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                                {req.studentName?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <h4 className="font-bold text-white">{req.studentName}</h4>
                                <p className="text-xs text-slate-500">{req.studentEmail}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-sm text-slate-300">
                                Requesting access to: <span className="font-semibold text-purple-400">{req.qbankName}</span>
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
                            {isOrphaned ? (
                              <button
                                onClick={() => handleDeleteOrphaned(req.id, 'qbank')}
                                disabled={processingId === req.id}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                Delete
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAction(req.id, 'approve', 'qbank')}
                                  disabled={processingId === req.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleAction(req.id, 'deny', 'qbank')}
                                  disabled={processingId === req.id}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                  Deny
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

      {isLoading && (!students || students.length === 0) ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-slate-500">Loading students...</div>
        </div>
      ) : (
        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Enrollment Status</th>
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
                            Joined {(() => {
                              try {
                                // API should always return joinedDate, but handle edge cases
                                const dateValue = student.joinedDate;
                                if (!dateValue) {
                                  return 'Date unavailable';
                                }

                                const date = new Date(dateValue);

                                // Validate date
                                if (isNaN(date.getTime())) {
                                  return 'Invalid date';
                                }

                                // Format date: "Jan 15, 2024"
                                return date.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                });
                              } catch (e) {
                                return 'Date unavailable';
                              }
                            })()}
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

// --- DASHBOARD MODULE (Analytics & Reports) ---
const Dashboard = ({ nav }: { nav: (mod: string) => void }) => {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [reportType, setReportType] = React.useState<'summary' | 'detailed' | 'courses' | 'students'>('summary');
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);

  // ⚡ PERFORMANCE: Use React Query for dashboard stats with caching
  const { data: stats = {
    totalStudents: 0,
    activeStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalQuestions: 0,
    averageProgress: 0,
    completionRate: 0,
    newStudentsThisMonth: 0,
    activeEnrollments: 0,
  }, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: async () => {
      console.log('⚡ Fetching dashboard stats...');

      // Fetch basic stats in parallel (fast)
      const [studentsRes, coursesRes, questionsRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/admin/courses', { credentials: 'include' }),
        fetch('/api/qbank?countOnly=true', { credentials: 'include' })
      ]);

      // Parse responses
      const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
      const coursesData = coursesRes.ok ? await coursesRes.json() : { courses: [] };
      const questionsData = questionsRes.ok ? await questionsRes.json() : { totalCount: 0 };

      const students = studentsData.students || [];
      const courses = coursesData.courses || [];
      const totalEnrollments = students.reduce((sum: number, s: any) => sum + (s.enrolledCourses || 0), 0);

      // Calculate date-based metrics
      const now = new Date();
      const daysAgo =
        dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : Infinity;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const newStudentsThisMonth = students.filter((s: any) => {
        try {
          if (!s.joinedDate) return false;
          const joinedDate = new Date(s.joinedDate);
          if (isNaN(joinedDate.getTime())) return false;
          return joinedDate >= cutoffDate;
        } catch (e) {
          return false;
        }
      }).length;

      console.log('⚡ Dashboard stats loaded and cached');
      return {
        totalStudents: students.length,
        activeStudents: students.filter((s: any) => s.isActive).length,
        totalCourses: courses.length,
        totalEnrollments,
        totalQuestions: questionsData.totalCount || 0,
        averageProgress: 0,
        completionRate: 0,
        newStudentsThisMonth,
        activeEnrollments: 0,
        students, // Pass for detailed analytics
        courses,
      };
    },
    staleTime: 30 * 1000, // 30 seconds - fast navigation back to dashboard
  });

  // Derived state for course stats and engagement (calculated from cached stats)
  const [courseStats, setCourseStats] = React.useState<any[]>([]);
  const [studentEngagement, setStudentEngagement] = React.useState<any[]>([]);
  const [enrichedStats, setEnrichedStats] = React.useState({ averageProgress: 0, completionRate: 0, activeEnrollments: 0 });
  const [isLoadingEngagement, setIsLoadingEngagement] = React.useState(false);

  // Fetch detailed engagement data when basic stats are loaded
  React.useEffect(() => {
    if (!stats.students || stats.students.length === 0) return;

    const fetchEngagementData = async () => {
      setIsLoadingEngagement(true);
      const students = stats.students;
      const courses = stats.courses || [];

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
        try {
          // Fetch all student details in parallel (much faster than sequential)
          const studentDetailPromises = studentsWithEnrollments.map((student: any) =>
            fetch(`/api/students/${student.id}`, { credentials: 'include' })
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          );

          const studentDetails = await Promise.all(studentDetailPromises);

          let totalProgress = 0;
          let enrollmentCount = 0;
          const engagementData: any[] = [];

          studentDetails.forEach((detailData, index) => {
            if (detailData?.student) {
              const student = studentsWithEnrollments[index];
              const enrollments = detailData.student.enrollments || [];

              enrollments.forEach((e: any) => {
                const progress = typeof e.progress === 'number' && e.progress >= 0
                  ? e.progress
                  : (typeof e.totalProgress === 'number' && e.totalProgress >= 0 ? e.totalProgress : 0);

                totalProgress += progress;
                enrollmentCount++;
                engagementData.push({
                  studentName: student.name,
                  courseTitle: e.course?.title || 'Unknown',
                  courseId: e.courseId || e.course?.id,
                  progress: progress,
                  lastAccessed: e.lastAccessed,
                });
              });
            }
          });

          const averageProgress = enrollmentCount > 0 ? Math.round(totalProgress / enrollmentCount) : 0;
          const completedCount = engagementData.filter((e: any) => (e.progress || 0) >= 100).length;
          const completionRate = enrollmentCount > 0 ? Math.round((completedCount / enrollmentCount) * 100) : 0;

          setEnrichedStats({ averageProgress, completionRate, activeEnrollments: enrollmentCount });

          // Update course stats with enrollment data
          const courseStatsData = courses.map((course: any) => {
            const courseEnrollments = engagementData.filter(e => {
              const courseIdMatch = e.courseId && course.id && e.courseId.toString() === course.id.toString();
              const titleMatch = e.courseTitle === course.title;
              return courseIdMatch || titleMatch;
            });
            const enrollments = courseEnrollments.length;
            const totalCourseProgress = courseEnrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0);
            return {
              ...course,
              enrollments,
              averageProgress: enrollments > 0 ? Math.round(totalCourseProgress / enrollments) : 0,
            };
          });
          setCourseStats(courseStatsData);
          setStudentEngagement(engagementData);
        } catch (error) {
          console.error('Error fetching engagement data:', error);
        }
      } else {
        setStudentEngagement([]);
      }
      setIsLoadingEngagement(false);
    };

    fetchEngagementData();
  }, [stats.students, stats.courses]);

  // Combine loading states
  const isLoading = isLoadingStats || isLoadingEngagement;

  // Merge enriched stats with base stats
  const displayStats = {
    ...stats,
    averageProgress: enrichedStats.averageProgress,
    completionRate: enrichedStats.completionRate,
    activeEnrollments: enrichedStats.activeEnrollments,
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
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-slate-400 mt-2 text-sm">Platform insights and analytics</p>
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
              <MetricCard title="Total Students" value={displayStats.totalStudents.toString()} trend="Registered" color="blue" icon={<Users size={20} />} />
              <MetricCard title="Active Students" value={displayStats.activeStudents.toString()} trend="Currently Active" color="green" icon={<Activity size={20} />} />
              <MetricCard title="Total Courses" value={displayStats.totalCourses.toString()} trend="Available" color="purple" icon={<BookOpen size={20} />} />
              <MetricCard title="Total Enrollments" value={displayStats.totalEnrollments.toString()} trend="All Time" color="pink" icon={<Target size={20} />} />
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
              <MetricCard title="Total Questions" value={displayStats.totalQuestions.toString()} trend="In Q-Bank" color="blue" icon={<Database size={20} />} />
              <MetricCard title="Average Progress" value={displayStats.averageProgress + '%'} trend="Across All" color="orange" icon={<TrendingUp size={20} />} />
              <MetricCard title="Completion Rate" value={displayStats.completionRate + '%'} trend="Finished" color="green" icon={<Award size={20} />} />
              <MetricCard title="New Students" value={displayStats.newStudentsThisMonth.toString()} trend={`Last ${dateRange === 'all' ? 'Period' : dateRange}`} color="purple" icon={<TrendingUp size={20} />} />
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
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 bg-[#1a1d26] rounded-xl border border-slate-800/40 animate-pulse">
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
                      <span className="text-xs font-bold text-purple-400">{course.averageProgress}%</span>
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
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-3 bg-[#1a1d26] rounded-xl border border-slate-800/40 animate-pulse">
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
                      <div key={idx} className="p-3 bg-[#1a1d26] rounded-xl border border-slate-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-white">{engagement.studentName}</span>
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
                <span className="text-white font-bold">{displayStats.activeEnrollments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Inactive Students</span>
                <span className="text-white font-bold">{displayStats.totalStudents - displayStats.activeStudents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Courses Published</span>
                <span className="text-white font-bold">{displayStats.totalCourses}</span>
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
                    {displayStats.totalStudents > 0 ? Math.round((displayStats.activeEnrollments / displayStats.totalStudents) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                    style={{ width: `${displayStats.totalStudents > 0 ? Math.round((displayStats.activeEnrollments / displayStats.totalStudents) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Course Utilization</span>
                  <span className="text-white font-bold">
                    {displayStats.totalCourses > 0 ? Math.round((displayStats.totalEnrollments / displayStats.totalCourses) * 10) / 10 : 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-600"
                    style={{ width: `${Math.min(100, displayStats.totalCourses > 0 ? (displayStats.totalEnrollments / displayStats.totalCourses) * 10 : 0)}%` }}
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
                  {displayStats.totalStudents > 0 ? (displayStats.totalEnrollments / displayStats.totalStudents).toFixed(1) : '0.0'}
                </p>
              </div>
              <div className="p-3 bg-[#1a1d26] rounded-lg border border-slate-800/40">
                <p className="text-xs text-slate-500 mb-1">Students with Progress</p>
                <p className="text-lg font-bold text-white">{displayStats.activeEnrollments}</p>
              </div>
            </div>
          </div>
        </div>
      </>
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
  const { data: coursesList = [], isLoading, refetch, error: coursesError } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await fetch('/api/admin/courses', { credentials: 'include' });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.message || errorData.error || errorData.details || errorMessage;
              console.error('❌ Failed to fetch courses:', {
                status: response.status,
                statusText: response.statusText,
                errorData,
                errorMessage,
                rawText: text.substring(0, 500) // Limit text length for logging
              });
            } catch {
              // If not JSON, use the text as error message
              errorMessage = text || errorMessage;
              console.error('❌ Failed to fetch courses (non-JSON response):', {
                status: response.status,
                statusText: response.statusText,
                rawText: text.substring(0, 500)
              });
            }
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📚 Courses fetched:', data.courses?.length || 0, 'courses');

      if (!data.courses || !Array.isArray(data.courses)) {
        console.warn('⚠️ Invalid courses data format:', data);
        return [];
      }

      const mappedCourses = data.courses.map((c: any) => ({
        ...c,
        author: c.instructor,
        status: c.status === 'published' || c.status === 'Active' ? 'Active' : 'Draft'
      }));

      console.log('✅ Courses loaded and cached:', mappedCourses.length);
      return mappedCourses;
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
    retryDelay: 1000,

  });

  React.useEffect(() => {
    if (coursesError) {
      console.error('❌ Query error:', coursesError);
      const errorMsg = (coursesError as any).message || 'Failed to load courses';
      notification.showError(errorMsg);
    }
  }, [coursesError]);

  const handleDelete = async (id: number) => {
    notification.showConfirm(
      'Delete Course',
      'Are you sure you want to delete this course?',
      async () => {
        try {
          const response = await fetch(`/api/admin/courses/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (response.ok) {
            // ⚡ PERFORMANCE: Invalidate cache after mutation
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
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
        <button onClick={() => {
          setActive(null);
          window.history.pushState({}, '', '/admin/dashboard/courses/new');
          nav('course_editor');
        }} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center gap-2">
          <Plus size={18} /> Create Course
        </button>
      </div>
      <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden flex-1">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : coursesError ? (
          <div className="p-8 text-center">
            <div className="text-red-400 mb-4">
              <AlertTriangle size={48} className="mx-auto mb-2" />
              <p className="text-lg font-semibold">Failed to load courses</p>
              <p className="text-sm text-slate-400 mt-2">{(coursesError as any).message || 'Unknown error occurred'}</p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-slate-500 cursor-pointer">Error details</summary>
                  <pre className="text-xs text-slate-500 mt-2 bg-slate-900 p-4 rounded overflow-auto max-h-64">
                    {JSON.stringify({
                      message: (coursesError as any).message,
                      name: (coursesError as any).name,
                      stack: (coursesError as any).stack,
                    }, null, 2)}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Retry
            </button>
          </div>
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
              {(coursesList as any[]).map((c, i) => (
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
                    <button onClick={() => {
                      setActive(c);
                      window.history.pushState({}, '', `/admin/dashboard/courses/${c.id}`);
                      nav('course_editor', c.id);
                    }} className="text-purple-400 hover:text-purple-300 font-semibold mr-4">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
              {(coursesList as any[]).length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No courses found</td></tr>
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
  const [showQuizSelectorModal, setShowQuizSelectorModal] = React.useState(false);
  const [showReadingModal, setShowReadingModal] = React.useState(false);
  const [editingChapter, setEditingChapter] = React.useState<any | null>(null);
  const [currentModuleId, setCurrentModuleId] = React.useState<number | null>(null);
  const [currentQuizId, setCurrentQuizId] = React.useState<number | null>(null);
  const [showQBankManager, setShowQBankManager] = React.useState(false);

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
      const response = await fetch(`/api/admin/courses/${id}`, { credentials: 'include' });
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
      const response = await fetch(`/api/admin/courses/${id}/modules?includeChapters=true`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setModules((data.modules || []).map((m: any) => ({
          ...m,
          items: m.items || [],
        })));
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
      const url = courseId ? `/api/admin/courses/${courseId}` : '/api/admin/courses';

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
          window.history.replaceState({}, '', `/admin/dashboard/courses/${newCourseId}`);
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
      const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
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
      // Show quiz selection/creation modal
      setCurrentModuleId(modId);
      setShowQuizSelectorModal(true);
      return;
    } else if (type === 'textbook') {
      setCurrentModuleId(modId);
      setShowReadingModal(true);
      return;
    }

    // For other types (if any left), use prompt
    const title = prompt(`Enter ${type} title:`);
    if (!title) return;

    let contentData: any = { title, type, order: 999 };

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
    const itemTypeLabel = itemType === 'mcq' || itemType === 'qbank' || itemType === 'quiz' ? 'Quiz' :
      itemType === 'video' ? 'Video' :
        itemType === 'document' ? 'Document' :
          itemType === 'textbook' ? 'Reading' : 'Chapter';

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

  const editChapter = async (chapter: any, modId: number) => {
    setEditingChapter(chapter);
    setCurrentModuleId(modId);

    // Open appropriate modal based on chapter type
    if (chapter.type === 'video') {
      setShowVideoModal(true);
    } else if (chapter.type === 'textbook') {
      setShowReadingModal(true);
    } else if (chapter.type === 'document') {
      setShowDocumentModal(true);
    } else if (chapter.type === 'mcq' || chapter.type === 'qbank') {
      // Fetch quiz data first
      try {
        console.log('Fetching quiz for chapter:', chapter.id);
        const quizResponse = await fetch(`/api/chapters/${chapter.id}/quiz`, {
          credentials: 'include'
        });

        if (quizResponse.ok) {
          const { quizId } = await quizResponse.json();
          console.log('Found quiz ID:', quizId);

          const dataResponse = await fetch(`/api/quizzes/${quizId}`, {
            credentials: 'include'
          });

          if (dataResponse.ok) {
            const quizData = await quizResponse.json();
            console.log('Quiz data loaded:', quizData);
            setEditingChapter({
              ...chapter,
              quizData: quizData.quiz,
              questions: quizData.questions
            });
            setShowQuizSelectorModal(true);
          } else {
            const errorData = await dataResponse.json();
            console.error('Failed to fetch quiz data:', errorData);
            notification.showError(`Failed to load quiz data: ${errorData.message || 'Unknown error'}`);
            // Still open modal but empty
            setShowQuizSelectorModal(true);
          }
        } else {
          const errorData = await quizResponse.json();
          console.error('Failed to find quiz:', errorData);
          notification.showError(`Failed to find quiz: ${errorData.message || 'Unknown error'}`);
          // Fallback - open empty modal
          setShowQuizSelectorModal(true);
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
        notification.showError('Failed to load quiz: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setShowQuizSelectorModal(true);
      }
    } else {
      notification.showInfo('Chapter editing not supported for this type');
    }
  };

  const deleteModule = async (modId: number) => {
    notification.showConfirm(
      'Delete Module',
      'Are you sure you want to delete this module and all its content?',
      async () => {
        try {
          const response = await fetch(`/api/modules/${modId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (response.ok) {
            setModules(modules.filter((m: any) => m.id !== modId));
            notification.showSuccess('Module deleted successfully');
          } else {
            const data = await response.json();
            notification.showError(data.message || 'Failed to delete module');
          }
        } catch (error) {
          console.error('Error deleting module:', error);
          notification.showError('Failed to delete module');
        }
      }
    );
  };

  const [draggedModuleIndex, setDraggedModuleIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedModuleIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedModuleIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedModuleIndex === null || draggedModuleIndex === dropIndex) {
      return;
    }

    // Reorder modules
    const newModules = [...modules];
    const draggedModule = newModules[draggedModuleIndex];
    newModules.splice(draggedModuleIndex, 1);
    newModules.splice(dropIndex, 0, draggedModule);

    setModules(newModules);
    setDraggedModuleIndex(null);

    // Persist to database
    try {
      const items = newModules.map((m, idx) => ({ id: m.id, order: idx }));
      const response = await fetch(`/api/courses/${course.id}/modules/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items })
      });
      if (!response.ok) {
        notification.showError('Failed to update module order');
        fetchModules(course.id);
      }
    } catch (error) {
      notification.showError('Failed to update module order');
      fetchModules(course.id);
    }
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
        <div className="flex gap-2">
          {courseId && (
            <button
              onClick={() => setShowQBankManager(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
            >
              <Database size={14} /> Manage Q-Bank
            </button>
          )}
          <button onClick={handleSaveCourse} className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold">Save Changes</button>
        </div>
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
              {/* Course Access Settings */}
              <div className="col-span-2 mt-4 space-y-3">
                <h5 className="text-sm font-bold text-slate-300 mb-3">Access & Visibility Settings</h5>
                <ToggleSwitch
                  label="Published"
                  checked={isPublished}
                  onChange={setIsPublished}
                  description="Published courses are visible to students. Draft courses are hidden."
                />
                <ToggleSwitch
                  label="Public Course (Direct Enrollment)"
                  checked={isPublic}
                  onChange={setIsPublic}
                  description="When enabled, students can enroll directly without admin approval. When disabled, students must request access."
                />
                <ToggleSwitch
                  label="Allow Access Requests"
                  checked={isRequestable}
                  onChange={setIsRequestable}
                  description="Allow students to request access to this course. Disable to prevent all access requests."
                />
                <ToggleSwitch
                  label="Default Unlocked"
                  checked={isDefaultUnlocked}
                  onChange={setIsDefaultUnlocked}
                  description="When enabled, all course content is unlocked by default. When disabled, students must complete prerequisites."
                />
              </div>
            </div>
          </div>

          {/* Modules */}
          {modules.map((mod: any, i: number) => (
            <div
              key={mod.id}
              className={`bg-[#161922] border-2 rounded-xl overflow-hidden transition-all ${draggedModuleIndex === i
                ? 'opacity-40 scale-95 border-purple-500'
                : draggedModuleIndex !== null
                  ? 'border-slate-800/60 hover:border-purple-500/50'
                  : 'border-slate-800/60'
                }`}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
            >
              <div className="p-4 bg-[#1a1d26] border-b border-slate-800/60 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <GripVertical size={18} className="text-slate-500 cursor-grab active:cursor-grabbing" />
                  <h4 className="font-bold text-white">Module {i + 1}: {mod.title}</h4>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      const newTitle = prompt('Edit module title:', mod.title);
                      if (newTitle && newTitle.trim() && newTitle !== mod.title) {
                        try {
                          const response = await fetch(`/api/modules/${mod.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ title: newTitle.trim() })
                          });

                          if (response.ok) {
                            // Update local state
                            setModules(modules.map((m: any) =>
                              m.id === mod.id ? { ...m, title: newTitle.trim() } : m
                            ));
                            notification.showSuccess('Module title updated!');
                          } else {
                            const data = await response.json();
                            notification.showError(data.message || 'Failed to update module');
                          }
                        } catch (error) {
                          console.error('Error updating module:', error);
                          notification.showError('Failed to update module');
                        }
                      }
                    }}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deleteModule(mod.id)}
                    className="p-1.5 hover:bg-slate-700 rounded text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {mod.items.length === 0 && <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">Drop documents here</div>}
                {mod.items.map((item: any) => (
                  <div key={item.id} className="flex items-center p-3 bg-[#13151d] border border-slate-800/50 rounded-lg hover:border-purple-500/30 transition-colors">
                    <div className={`mr-3 p-2 rounded-lg ${item.type === 'mcq' || item.type === 'qbank'
                      ? 'bg-purple-500/10 text-purple-400'
                      : item.type === 'document'
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'bg-blue-500/10 text-blue-400'
                      }`}>
                      {item.type === 'video' ? <Video size={16} /> :
                        item.type === 'document' ? <FileText size={16} /> :
                          item.type === 'mcq' || item.type === 'qbank' ? <Zap size={16} /> :
                            <FileText size={16} />}
                    </div>
                    <span className="text-sm font-medium text-slate-300">{item.title}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => editChapter(item, mod.id)}
                        className="p-1 text-slate-500 hover:text-blue-400"
                        title="Edit chapter"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id, mod.id, item.type)}
                        className="p-1 text-slate-500 hover:text-red-400"
                        title="Delete chapter"
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
            setEditingChapter(null);
          }}
          onSave={async (title: string, videoUrl: string) => {
            if (!currentModuleId || !title) return;

            // Convert video URL to embed format if provided (hides branding)
            const parsed = parseVideoUrl(videoUrl);
            const finalVideoUrl = parsed.embedUrl;
            const finalProvider = parsed.provider;

            const contentData: any = {
              title,
              type: 'video',
              order: editingChapter?.order || 999,
              videoUrl: finalVideoUrl,
              videoProvider: finalProvider,
              videoDuration: 15,
            };

            try {
              const isEditing = !!editingChapter;
              const url = isEditing
                ? `/api/chapters/${editingChapter.id}`
                : `/api/modules/${currentModuleId}/chapters`;

              const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(contentData),
              });

              if (response.ok) {
                const data = await response.json();
                if (isEditing) {
                  // Update existing chapter
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: m.items.map((i: any) => i.id === editingChapter.id ? data.chapter : i)
                  } : m));
                  notification.showSuccess('Video updated successfully');
                } else {
                  // Add new chapter
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: [...m.items, data.chapter]
                  } : m));
                  notification.showSuccess('Video added successfully');
                }
                setShowVideoModal(false);
                setCurrentModuleId(null);
                setEditingChapter(null);
              } else {
                const errorData = await response.json();
                notification.showError(errorData.message || 'Failed to save video');
              }
            } catch (error) {
              console.error('Error saving video:', error);
              notification.showError('Failed to save video', error instanceof Error ? error.message : undefined);
            }
          }}
          initialData={editingChapter ? { title: editingChapter.title, videoUrl: editingChapter.videoUrl } : undefined}
        />
      )}

      {/* Quiz Selector Modal */}
      {showQuizSelectorModal && (
        <QuizSelectorModal
          onClose={() => {
            setShowQuizSelectorModal(false);
            setCurrentModuleId(null);
            setEditingChapter(null);
          }}
          initialData={editingChapter?.quizData ? {
            title: editingChapter.title,
            passMark: editingChapter.quizData.passMark,
            maxAttempts: editingChapter.quizData.maxAttempts,
            questions: editingChapter.questions || [],
          } : undefined}
          onSave={async (title, passMark, maxAttempts, questions, sourceQBankId) => {
            if (!currentModuleId) return;

            const isEditing = !!editingChapter?.quizData;

            try {
              if (isEditing) {
                // Update existing quiz
                const response = await fetch(`/api/quizzes/${editingChapter.quizData.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    title,
                    passMark,
                    maxAttempts,
                    customQuestions: questions
                  }),
                });

                if (response.ok) {
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: m.items.map((i: any) => i.id === editingChapter.id ? { ...i, title } : i)
                  } : m));
                  notification.showSuccess('Quiz updated!', `${questions.length} question(s)`);
                } else {
                  const errorData = await response.json();
                  notification.showError(errorData.message || 'Failed to update quiz');
                }
              } else {
                // Create new quiz
                const response = await fetch(`/api/modules/${currentModuleId}/quizzes`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    title,
                    passMark,
                    maxAttempts,
                    sourceQBankId: sourceQBankId || undefined,
                    customQuestions: questions
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: [...m.items, { ...data.chapter, quiz: data.quiz }]
                  } : m));
                  setCurrentQuizId(data.quiz.id);
                  notification.showSuccess('Quiz created!', sourceQBankId ? `Imported ${data.importedCount} questions.` : `${questions.length} custom question(s) added.`);
                } else {
                  const errorData = await response.json();
                  notification.showError(errorData.message || 'Failed to create quiz', errorData.error);
                }
              }

              setShowQuizSelectorModal(false);
              setCurrentModuleId(null);
              setEditingChapter(null);
            } catch (error) {
              console.error('Error saving quiz:', error);
              notification.showError('Failed to save quiz');
            }
          }}
        />
      )}

      {/* Reading Modal */}
      {showReadingModal && (
        <ReadingModal
          onClose={() => {
            setShowReadingModal(false);
            setCurrentModuleId(null);
          }}
          onSave={async (title, content, readingTime) => {
            if (!currentModuleId) return;

            const contentData: any = {
              title,
              type: 'textbook',
              order: editingChapter?.order || 999,
              textbookContent: content,
              readingTime: readingTime
            };

            try {
              const isEditing = !!editingChapter;
              const url = isEditing
                ? `/api/chapters/${editingChapter.id}`
                : `/api/modules/${currentModuleId}/chapters`;

              const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(contentData),
              });

              if (response.ok) {
                const data = await response.json();
                if (isEditing) {
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: m.items.map((i: any) => i.id === editingChapter.id ? data.chapter : i)
                  } : m));
                  notification.showSuccess('Reading material updated!');
                } else {
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: [...m.items, data.chapter]
                  } : m));
                  notification.showSuccess('Reading material added!');
                }
                setShowReadingModal(false);
                setCurrentModuleId(null);
                setEditingChapter(null);
              } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to save reading material' }));
                notification.showError(errorData.message || 'Failed to save reading material', errorData.error);
              }
            } catch (error) {
              console.error('Error saving reading:', error);
              notification.showError('Failed to save reading material');
            }
          }}
          initialData={editingChapter ? {
            title: editingChapter.title,
            textbookContent: editingChapter.textbookContent || '',
            readingTime: editingChapter.readingTime || 10
          } : undefined}
        />
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && (
        <DocumentUploadModal
          onClose={() => {
            setShowDocumentModal(false);
            setCurrentModuleId(null);
          }}
          initialData={editingChapter ? {
            title: editingChapter.title,
            documentUrl: editingChapter.documentUrl || editingChapter.textbookFileUrl || ''
          } : undefined}
          onSave={async (title, documentUrl) => {
            if (!currentModuleId) return;

            const contentData: any = {
              title,
              type: 'document',
              order: editingChapter?.order || 999,
              documentUrl,
              textbookFileUrl: documentUrl, // Compatibility
              documentType: documentUrl.split('.').pop()?.toLowerCase() || 'pdf',
            };

            try {
              const isEditing = !!editingChapter;
              const url = isEditing
                ? `/api/chapters/${editingChapter.id}`
                : `/api/modules/${currentModuleId}/chapters`;

              const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(contentData),
              });

              if (response.ok) {
                const data = await response.json();

                if (isEditing) {
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: m.items.map((i: any) => i.id === editingChapter.id ? data.chapter : i)
                  } : m));
                  notification.showSuccess('Document updated!');
                } else {
                  setModules(modules.map((m: any) => m.id === currentModuleId ? {
                    ...m, items: [...m.items, data.chapter]
                  } : m));
                  notification.showSuccess('Document added!');
                }

                setShowDocumentModal(false);
                setCurrentModuleId(null);
                setEditingChapter(null);
              } else {
                notification.showError('Failed to save document');
              }
            } catch (error) {
              console.error('Error saving document:', error);
              notification.showError('Failed to save document');
            }
          }}
        />
      )}

      {/* Course Q-Bank Manager */}
      {showQBankManager && courseId && (
        <CourseQBankManager
          courseId={courseId}
          onClose={() => setShowQBankManager(false)}
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

  // ⚡ PERFORMANCE: Use React Query for Q-Banks with caching
  const { data: qbanksList = [], isLoading, refetch } = useQuery({
    queryKey: ['qbanks'],
    queryFn: async () => {
      const response = await fetch('/api/admin/qbanks', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('⚡ Q-Banks loaded and cached');
        return data.qbanks || [];
      }
      throw new Error('Failed to fetch Q-Banks');
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const handleDelete = async (id: number) => {
    notification.showConfirm(
      'Delete Q-Bank',
      'Are you sure you want to delete this Q-Bank? All questions in it will also be deleted.',
      async () => {
        try {
          const response = await fetch(`/api/admin/qbanks/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (response.ok) {
            // ⚡ PERFORMANCE: Invalidate cache after mutation
            queryClient.invalidateQueries({ queryKey: ['qbanks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            notification.showSuccess('Q-Bank deleted successfully');
          } else {
            notification.showError('Failed to delete Q-Bank');
          }
        } catch (error) {
          console.error('Error deleting Q-Bank:', error);
          notification.showError('Failed to delete Q-Bank');
        }
      }
    );
  };

  const handleCreate = async () => {
    const name = await notification.showPrompt('Create New Q-Bank', 'Enter Q-Bank name:', '');
    if (!name) return;

    try {
      const response = await fetch('/api/admin/qbanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description: '' }),
      });

      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ['qbanks'] });
        notification.showSuccess('Q-Bank created successfully');
        // Navigate to the new Q-Bank editor
        setActive(data.qbank);
        window.history.pushState({}, '', `/admin/dashboard/qbank/${data.qbank.id}`);
        nav('qbank_editor', data.qbank.id);
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to create Q-Bank' }));
        notification.showError(error.message);
      }
    } catch (error) {
      console.error('Error creating Q-Bank:', error);
      notification.showError('Failed to create Q-Bank');
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Q-Bank Manager</h2>
          <p className="text-slate-400 mt-1 text-sm">Create and manage question banks with all question types.</p>
        </div>
        <button onClick={handleCreate} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center gap-2">
          <Plus size={18} /> Create New Q-Bank
        </button>
      </div>
      <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden flex-1">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-6">Q-Bank Name</th>
                <th className="p-6">Questions</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {qbanksList.map((qb: any) => (
                <tr key={qb.id} className="hover:bg-[#1a1d26] transition-colors">
                  <td className="p-6 font-medium text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500"><Database size={16} /></div>
                    <div>
                      <div>{qb.name}</div>
                      {qb.description && (
                        <div className="text-xs text-slate-500 mt-1">{qb.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded">
                      {qb.questionCount || 0} questions
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${qb.status === 'published' || qb.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/30 text-slate-400'}`}>
                      {qb.status === 'published' || qb.isActive ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => {
                      setActive(qb);
                      window.history.pushState({}, '', `/admin/dashboard/qbank/${qb.id}`);
                      nav('qbank_editor', qb.id);
                    }} className="text-purple-400 hover:text-purple-300 font-semibold mr-4">Edit</button>
                    <button onClick={() => handleDelete(qb.id)} className="text-red-400 hover:text-red-300 font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
              {qbanksList.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No Q-Banks found. Click "Create New Q-Bank" to get started.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --- Q-BANK EDITOR (Like CourseBuilder) ---
const QBankEditor = ({ qbank, back, setActive, nav }: { qbank: any; back: () => void; setActive?: (item: any) => void; nav?: (mod: string, id?: number) => void }) => {
  const notification = useNotification();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(qbank?.name || '');
  const [description, setDescription] = React.useState(qbank?.description || '');
  const [isPublished, setIsPublished] = React.useState(qbank?.status === 'published');
  const [isActive, setIsActive] = React.useState(qbank?.isActive !== false);
  const [isRequestable, setIsRequestable] = React.useState(qbank?.isRequestable !== false);
  const [isPublic, setIsPublic] = React.useState(qbank?.isPublic || false);
  const [isDefaultUnlocked, setIsDefaultUnlocked] = React.useState(qbank?.isDefaultUnlocked || false);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(!!qbank?.id);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'questions' | 'analysis'>('questions');
  const [analysis, setAnalysis] = React.useState<any>(null);

  // Get Q-Bank ID from props or URL
  const urlQBankId = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const parts = window.location.pathname.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart === 'qbank' || lastPart === 'new') return null;
    const parsed = parseInt(lastPart);
    return isNaN(parsed) ? null : parsed;
  }, []);
  const [qbankId, setQBankId] = React.useState(qbank?.id || urlQBankId);

  React.useEffect(() => {
    if (qbank?.id) {
      fetchQuestions(qbank.id);
      fetchQBankData(qbank.id);
    } else if (qbankId && !qbank?.id) {
      loadQBankData(qbankId);
    }
  }, [qbank, qbankId]);

  const loadQBankData = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/qbanks/${id}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const qb = data.qbank;
        setName(qb.name || '');
        setDescription(qb.description || '');
        setIsPublished(qb.status === 'published');
        setIsActive(qb.isActive !== false);
        setIsRequestable(qb.isRequestable !== false);
        setIsPublic(qb.isPublic || false);
        setIsDefaultUnlocked(qb.isDefaultUnlocked || false);
        fetchQuestions(id);
      }
    } catch (error) {
      console.error('Error loading Q-Bank data:', error);
    }
  };

  const fetchQBankData = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/qbanks/${id}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const qb = data.qbank;
        setName(qb.name || '');
        setDescription(qb.description || '');
        setIsPublished(qb.status === 'published');
        setIsActive(qb.isActive !== false);
        setIsRequestable(qb.isRequestable !== false);
        setIsPublic(qb.isPublic || false);
        setIsDefaultUnlocked(qb.isDefaultUnlocked || false);
      }
    } catch (error) {
      console.error('Error fetching Q-Bank data:', error);
    }
  };

  const fetchQuestions = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/qbanks/${id}/questions`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQBank = async () => {
    if (!name) {
      notification.showError('Q-Bank name is required');
      return;
    }

    try {
      const method = qbankId ? 'PUT' : 'POST';
      const url = qbankId ? `/api/admin/qbanks/${qbankId}` : '/api/admin/qbanks';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description: description || null,
          status: isPublished ? 'published' : 'draft',
          isActive,
          isRequestable,
          isPublic,
          isDefaultUnlocked,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!qbankId && data.qbank.id) {
          const newQBankId = data.qbank.id;
          setQBankId(newQBankId);
          window.history.replaceState({}, '', `/admin/dashboard/qbank/${newQBankId}`);
          notification.showSuccess('Q-Bank created!', 'You can now add questions.');
        } else {
          notification.showSuccess('Q-Bank updated successfully');
        }
        queryClient.invalidateQueries({ queryKey: ['qbanks'] });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        notification.showError(errorData.message || 'Failed to save Q-Bank');
      }
    } catch (error) {
      console.error('Error saving Q-Bank:', error);
      notification.showError('Failed to save Q-Bank');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!qbankId) {
      notification.showError('Q-Bank ID is missing');
      return;
    }

    notification.showConfirm(
      'Delete Question',
      'Are you sure you want to delete this question? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/admin/qbanks/${qbankId}/questions/${questionId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (response.ok) {
            setQuestions(questions.filter(q => q.id !== questionId));
            notification.showSuccess('Question deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['qbanks'] });
            if (qbankId) {
              // Refresh questions list
              fetchQuestions(qbankId);
            }
          } else {
            const error = await response.json().catch(() => ({ message: 'Failed to delete question' }));
            notification.showError(error.message || 'Failed to delete question');
          }
        } catch (error) {
          console.error('Error deleting question:', error);
          notification.showError('Failed to delete question');
        }
      }
    );
  };

  const filteredQuestions = React.useMemo(() => {
    if (!searchTerm) return questions;
    return questions.filter((q: any) =>
      q.stem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id?.toString().includes(searchTerm)
    );
  }, [questions, searchTerm]);

  const fetchAnalysis = React.useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/admin/qbanks/${id}/analysis`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  }, []);

  React.useEffect(() => {
    if (viewMode === 'analysis' && qbankId) {
      fetchAnalysis(qbankId);
    }
  }, [viewMode, qbankId, fetchAnalysis]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 bg-[#161922] border-b border-slate-800/60 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={back} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
          <h3 className="font-bold text-white">{name || "New Q-Bank"}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'questions' ? 'analysis' : 'questions')}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
          >
            {viewMode === 'questions' ? '📊 Analysis' : '📝 Questions'}
          </button>
          <button onClick={handleSaveQBank} className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold">Save Changes</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {viewMode === 'questions' ? (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Q-Bank Settings */}
            <div className="bg-[#161922] border border-slate-800/60 rounded-xl p-6 space-y-4">
              <h4 className="font-bold text-white mb-4">Q-Bank Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm h-20" />
                </div>
              </div>

              {/* Q-Bank Access Settings */}
              <div className="mt-6 space-y-3">
                <h5 className="text-sm font-bold text-slate-300 mb-3">Access & Visibility Settings</h5>
                <ToggleSwitch
                  label="Published"
                  checked={isPublished}
                  onChange={setIsPublished}
                  description="Published Q-Banks are visible to students. Draft Q-Banks are hidden."
                />
                <ToggleSwitch
                  label="Active"
                  checked={isActive}
                  onChange={setIsActive}
                  description="Active Q-Banks are available for enrollment. Inactive Q-Banks are hidden from students."
                />
                <ToggleSwitch
                  label="Public Q-Bank (Direct Enrollment)"
                  checked={isPublic}
                  onChange={setIsPublic}
                  description="When enabled, students can enroll directly without admin approval. When disabled, students must request access."
                />
                <ToggleSwitch
                  label="Allow Access Requests"
                  checked={isRequestable}
                  onChange={setIsRequestable}
                  description="Allow students to request access to this Q-Bank. Disable to prevent all access requests."
                />
                <ToggleSwitch
                  label="Default Unlocked"
                  checked={isDefaultUnlocked}
                  onChange={setIsDefaultUnlocked}
                  description="When enabled, all Q-Bank content is unlocked by default. When disabled, students must complete prerequisites."
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="bg-[#161922] border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="p-4 bg-[#1a1d26] border-b border-slate-800/60 flex justify-between items-center">
                <h4 className="font-bold text-white">Questions ({questions.length})</h4>
                <div className="flex gap-3">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#161922] border border-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm focus:border-purple-500 outline-none w-64"
                    placeholder="Search questions..."
                  />
                  <button
                    onClick={() => {
                      if (!qbankId) {
                        notification.showWarning('Please save the Q-Bank first');
                        return;
                      }
                      // Navigate to question editor for new question
                      if (setActive) {
                        setActive({ id: null, category: 'classic', type: 'standard', questionBankId: qbankId });
                      }
                      if (nav) {
                        window.history.pushState({}, '', `/admin/dashboard/qbank/${qbankId}/question/new`);
                        nav('question_editor');
                      } else {
                        window.location.href = `/admin/dashboard/qbank/${qbankId}/question/new`;
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                  >
                    <Plus size={18} /> Add Question
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {isLoading ? (
                  <div className="text-center py-20 text-slate-400">Loading questions...</div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <p>{searchTerm ? 'No questions match your search.' : 'No questions yet. Click "Add Question" to create your first question.'}</p>
                  </div>
                ) : (
                  filteredQuestions.map((q: any) => (
                    <div key={q.id} className="flex items-center p-3 bg-[#13151d] border border-slate-800/50 rounded-lg hover:border-purple-500/30 transition-colors">
                      <div className="mr-3 p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <Database size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-300">{q.stem?.substring(0, 100)}...</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {q.label} • {q.category === 'ngn' ? 'NGN' : 'Classic'} • {q.difficulty || 'medium'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Navigate to edit question
                            if (setActive) {
                              setActive(q);
                            }
                            if (nav) {
                              window.history.pushState({}, '', `/admin/dashboard/qbank/${qbankId}/question/${q.id}`);
                              nav('question_editor');
                            } else {
                              window.location.href = `/admin/dashboard/qbank/${qbankId}/question/${q.id}`;
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-bold transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <QBankAnalysis qbankId={qbankId} analysis={analysis} onRefresh={() => qbankId && fetchAnalysis(qbankId)} />
        )}
      </div>
    </div>
  );
};

// --- Q-BANK ANALYSIS COMPONENT ---
const QBankAnalysis = ({ qbankId, analysis, onRefresh }: { qbankId: number | null; analysis: any; onRefresh?: () => void }) => {
  const [isLoading, setIsLoading] = React.useState(!analysis);
  const [analysisData, setAnalysisData] = React.useState(analysis);

  React.useEffect(() => {
    setAnalysisData(analysis);
    setIsLoading(!analysis);
  }, [analysis]);

  React.useEffect(() => {
    if (!analysisData && qbankId && onRefresh) {
      setIsLoading(true);
      onRefresh();
    }
  }, [qbankId, analysisData, onRefresh]);

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">Loading analysis...</div>;
  }

  if (isLoading) {
    return <div className="text-center py-20 text-slate-400">Loading analysis...</div>;
  }

  if (!analysisData) {
    return <div className="text-center py-20 text-slate-400">No analysis data available</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-[#161922] border border-slate-800/60 rounded-xl p-6">
        <h4 className="font-bold text-white mb-6 text-xl">Q-Bank Analysis & Reports</h4>

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1d26] rounded-lg p-4 border border-slate-800/40">
            <p className="text-xs text-slate-500 mb-1">Total Questions</p>
            <p className="text-2xl font-bold text-white">{analysisData.statistics?.totalQuestions || 0}</p>
          </div>
          <div className="bg-[#1a1d26] rounded-lg p-4 border border-slate-800/40">
            <p className="text-xs text-slate-500 mb-1">Total Tests</p>
            <p className="text-2xl font-bold text-white">{analysisData.statistics?.totalTests || 0}</p>
          </div>
          <div className="bg-[#1a1d26] rounded-lg p-4 border border-slate-800/40">
            <p className="text-xs text-slate-500 mb-1">Average Score</p>
            <p className="text-2xl font-bold text-white">
              {analysisData.statistics?.averageScore ? `${analysisData.statistics.averageScore.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div className="bg-[#1a1d26] rounded-lg p-4 border border-slate-800/40">
            <p className="text-xs text-slate-500 mb-1">Classic / NGN</p>
            <p className="text-2xl font-bold text-white">
              {analysisData.statistics?.classicCount || 0} / {analysisData.statistics?.ngnCount || 0}
            </p>
          </div>
        </div>

        {/* Breakdown by Type */}
        {analysisData.breakdown?.byType && analysisData.breakdown.byType.length > 0 && (
          <div className="mb-6">
            <h5 className="font-bold text-white mb-3">Questions by Type</h5>
            <div className="grid grid-cols-2 gap-3">
              {analysisData.breakdown.byType.map((item: any) => (
                <div key={`${item.type}-${item.testType}`} className="bg-[#1a1d26] rounded-lg p-3 border border-slate-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">{item.type}</span>
                    <span className="text-lg font-bold text-white">{item.count}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{item.testType}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breakdown by Subject */}
        {analysisData.breakdown?.bySubject && analysisData.breakdown.bySubject.length > 0 && (
          <div className="mb-6">
            <h5 className="font-bold text-white mb-3">Questions by Subject</h5>
            <div className="grid grid-cols-3 gap-3">
              {analysisData.breakdown.bySubject.map((item: any) => (
                <div key={item.subject} className="bg-[#1a1d26] rounded-lg p-3 border border-slate-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">{item.subject}</span>
                    <span className="text-lg font-bold text-white">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Performance */}
        {analysisData.performance && analysisData.performance.length > 0 && (
          <div>
            <h5 className="font-bold text-white mb-3">Question Performance</h5>
            <div className="bg-[#1a1d26] rounded-lg border border-slate-800/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#161922] text-slate-400 text-xs uppercase font-bold">
                  <tr>
                    <th className="p-3 text-left">Question ID</th>
                    <th className="p-3 text-center">Attempts</th>
                    <th className="p-3 text-center">Correct</th>
                    <th className="p-3 text-center">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {analysisData.performance.slice(0, 20).map((p: any) => (
                    <tr key={p.questionId} className="hover:bg-[#161922]">
                      <td className="p-3 text-slate-300">#{p.questionId}</td>
                      <td className="p-3 text-center text-slate-300">{p.totalAttempts}</td>
                      <td className="p-3 text-center text-slate-300">{p.correctAttempts}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.accuracy >= 70 ? 'bg-green-500/10 text-green-400' :
                          p.accuracy >= 50 ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                          {p.accuracy.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      const response = await fetch('/api/admin/courses', { credentials: 'include' });
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
      const response = await fetch(`/api/admin/courses/${courseId}/modules`, { credentials: 'include' });
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
  const [questionData, setQuestionData] = useState(question || {
    options: ['', '', '', ''],
    correctAnswer: 0,
    format: 'multiple_choice'
  });
  const notification = useNotification();

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
      'standard': 'multiple_choice',
      'sata_classic': 'sata',
      'matrix': 'matrix_multiple_response',
      'drag_drop': 'extended_drag_drop',
      'cloze': 'cloze_dropdown',
      'bowtie': 'bowtie',
      'trend': 'trend_item',
      'ordering': 'ranking',
      'casestudy': 'case_study',
      'calculation': 'dosage_calculation',
      'highlight': 'highlight_text'
    };
    return formatMap[questionType] || 'multiple_choice';
  };

  // Handle question data changes
  const handleQuestionChange = (updatedQuestion: any) => {
    setQuestionData(updatedQuestion);
  };

  // Save the question
  const handleSave = async () => {
    try {
      // Determine if we're creating a new question or updating an existing one
      const isNew = !question?.id;
      const qbankId = question?.questionBankId || questionData?.questionBankId;

      if (!qbankId) {
        notification.showError('Error', 'Missing Q-Bank ID');
        return;
      }

      const payload = {
        ...questionData,
        category,
        type,
        questionBankId: qbankId
      };

      const url = isNew
        ? `/api/admin/qbanks/${qbankId}/questions`
        : `/api/admin/qbanks/${qbankId}/questions/${question.id}`;

      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save question');
      }

      notification.showSuccess(isNew ? 'Question created successfully' : 'Question updated successfully');
      back(); // Navigate back to Q-Bank editor
    } catch (error: any) {
      console.error('Error saving question:', error);
      notification.showError('Failed to save question', error.message);
    }
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
          <button className="text-slate-400 px-5 py-2 text-sm font-bold hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">Preview</button>
          <button onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20">Save Item</button>
        </div>
      </div>

      {/* EDITOR BODY */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: SCENARIO / STEM (Shared) */}
        <div className="w-1/2 border-r border-slate-800/50 flex flex-col bg-gradient-to-br from-[#11131a] to-[#0b0d12]">
          {/* If NGN, show tabs. If Classic, just simple stem header */}
          {category === 'ngn' ? (
            <div className="p-4 border-b border-slate-800/50 bg-[#161922] flex gap-2">
              {['Scenario', 'Vitals', 'Labs', 'Notes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === tab.toLowerCase()
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
                {CJMM_STEPS.map(s => (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${activeStep === s.step
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

const BowTieColumn = ({ title, color, count, center }: { title: string; color: string; count: number; center?: boolean }) => {
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
                    {user?.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : 'N/A'}
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

          </div>
        </div>
      </div>
    </div>
  );
};

// --- DAILY VIDEOS MODULE ---
const DailyVideos = ({ nav }: { nav: (mod: string) => void }) => {
  const notification = useNotification();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = React.useState(false);
  const [editingVideo, setEditingVideo] = React.useState<any>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState('');
  const [scheduledDate, setScheduledDate] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [uploadMethod, setUploadMethod] = React.useState<'url' | 'file'>('url');
  const [uploadedVideoUrl, setUploadedVideoUrl] = React.useState('');

  // ⚡ PERFORMANCE: Use React Query for daily videos with caching
  const { data: videos = [], isLoading, refetch } = useQuery({
    queryKey: ['daily-videos'],
    queryFn: async () => {
      const response = await fetch('/api/admin/daily-videos', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('⚡ Daily videos loaded and cached');
        return data.videos || [];
      }
      throw new Error('Failed to fetch daily videos');
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const handleCreate = () => {
    setEditingVideo(null);
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setScheduledDate('');
    setIsActive(true);
    setUploadMethod('url');
    setUploadedVideoUrl('');
    setShowModal(true);
  };

  const handleEdit = (video: any) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    setVideoUrl(video.videoUrl);
    setScheduledDate(new Date(video.scheduledDate).toISOString().split('T')[0]);
    setIsActive(video.isActive);
    setUploadMethod(video.videoUrl.startsWith('http') ? 'url' : 'file');
    setUploadedVideoUrl(video.videoUrl);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    notification.showConfirm(
      'Delete Daily Video',
      'Are you sure you want to delete this daily video?',
      async () => {
        try {
          const response = await fetch(`/api/admin/daily-videos/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ['daily-videos'] });
            notification.showSuccess('Daily video deleted successfully');
          } else {
            notification.showError('Failed to delete daily video');
          }
        } catch (error) {
          notification.showError('Error deleting daily video');
        }
      }
    );
  };

  const handleSave = async () => {
    if (!title || !scheduledDate) {
      notification.showError('Title and scheduled date are required');
      return;
    }

    const finalVideoUrl = uploadMethod === 'url' ? videoUrl : uploadedVideoUrl;
    if (!finalVideoUrl) {
      notification.showError('Please provide a video URL or upload a video file');
      return;
    }

    try {
      const payload = {
        title,
        description: description || null,
        videoUrl: finalVideoUrl,
        scheduledDate: new Date(scheduledDate).toISOString(),
        isActive,
      };

      const url = editingVideo
        ? `/api/admin/daily-videos/${editingVideo.id}`
        : '/api/admin/daily-videos';
      const method = editingVideo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['daily-videos'] });
        notification.showSuccess(
          editingVideo ? 'Daily video updated successfully' : 'Daily video created successfully'
        );
        setShowModal(false);
      } else {
        const data = await response.json();
        notification.showError(data.message || 'Failed to save daily video');
      }
    } catch (error) {
      notification.showError('Error saving daily video');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Daily Videos</h2>
          <p className="text-slate-400 mt-1 text-sm">Schedule videos for students to watch daily.</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Create Daily Video
        </button>
      </div>

      <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden flex-1">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="p-6">Title</th>
                <th className="p-6">Scheduled Date</th>
                <th className="p-6">Status</th>
                <th className="p-6">Created</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    No daily videos found. Create your first daily video to get started.
                  </td>
                </tr>
              ) : (
                videos.map((video: any) => (
                  <tr key={video.id} className="hover:bg-[#1a1d26] transition-colors">
                    <td className="p-6 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                        <Video size={16} />
                      </div>
                      {video.title}
                    </td>
                    <td className="p-6">
                      {new Date(video.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="p-6">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${video.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-slate-700/30 text-slate-400'
                          }`}
                      >
                        {video.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-6">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-6 text-right">
                      <button
                        onClick={() => handleEdit(video)}
                        className="text-purple-400 hover:text-purple-300 font-semibold mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="text-red-400 hover:text-red-300 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161922] border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingVideo ? 'Edit Daily Video' : 'Create Daily Video'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  placeholder="Enter video description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Upload Method</label>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setUploadMethod('url')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${uploadMethod === 'url'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#1a1d26] text-slate-400 border border-slate-800'
                      }`}
                  >
                    <LinkIcon size={16} className="inline mr-2" />
                    Video URL
                  </button>
                  <button
                    onClick={() => setUploadMethod('file')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${uploadMethod === 'file'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#1a1d26] text-slate-400 border border-slate-800'
                      }`}
                  >
                    <Upload size={16} className="inline mr-2" />
                    Upload File
                  </button>
                </div>

                {uploadMethod === 'url' ? (
                  <div>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Supports YouTube, Vimeo, or direct video URLs
                    </p>
                  </div>
                ) : (
                  <div>
                    <FileUpload
                      type="video"
                      label="Upload Video File"
                      onUploadComplete={(url) => setUploadedVideoUrl(url)}
                      currentUrl={uploadedVideoUrl}
                      maxSizeMB={500}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Scheduled Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-[#1a1d26] text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-400">
                  Active (visible to students)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                {editingVideo ? 'Update' : 'Create'} Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


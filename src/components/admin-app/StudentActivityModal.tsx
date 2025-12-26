'use client';

import React, { useState, useEffect } from 'react';
import { X, Activity, LogIn, LogOut, BookOpen, Video, FileText, ClipboardCheck, Award, Clock, Search, Filter } from 'lucide-react';

interface Activity {
  id: number;
  activityType: string;
  title: string;
  description?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface StudentActivityModalProps {
  studentId: number;
  studentName: string;
  onClose: () => void;
}

export default function StudentActivityModal({ studentId, studentName, onClose }: StudentActivityModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [studentId]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/students/${studentId}/activities?limit=200`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <LogIn size={18} className="text-green-400" />;
      case 'logout':
        return <LogOut size={18} className="text-red-400" />;
      case 'course_view':
        return <BookOpen size={18} className="text-blue-400" />;
      case 'module_access':
      case 'chapter_access':
        return <FileText size={18} className="text-purple-400" />;
      case 'video_watch':
        return <Video size={18} className="text-pink-400" />;
      case 'test_attempt':
      case 'test_result':
        return <ClipboardCheck size={18} className="text-yellow-400" />;
      default:
        return <Activity size={18} className="text-slate-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-green-500/10 border-green-500/30';
      case 'logout':
        return 'bg-red-500/10 border-red-500/30';
      case 'course_view':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'module_access':
      case 'chapter_access':
        return 'bg-purple-500/10 border-purple-500/30';
      case 'video_watch':
        return 'bg-pink-500/10 border-pink-500/30';
      case 'test_attempt':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'test_result':
        return 'bg-orange-500/10 border-orange-500/30';
      default:
        return 'bg-slate-500/10 border-slate-500/30';
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.activityType === filter;
    const matchesSearch = searchTerm === '' || 
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.metadata?.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'course_view', label: 'Course Views' },
    { value: 'module_access', label: 'Module Access' },
    { value: 'video_watch', label: 'Video Watch' },
    { value: 'test_attempt', label: 'Test Attempts' },
    { value: 'test_result', label: 'Test Results' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={24} />
              Activity Log - {studentName}
            </h3>
            <p className="text-sm text-slate-400 mt-1">Total: {activities.length} activities</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Activities List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Activity size={48} className="mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 rounded-lg border ${getActivityColor(activity.activityType)} transition-all hover:border-opacity-60`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.activityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm mb-1">{activity.title}</h4>
                        {activity.description && (
                          <p className="text-xs text-slate-400 mb-2">{activity.description}</p>
                        )}
                        {activity.metadata && (
                          <div className="text-xs text-slate-500 space-y-1">
                            {activity.metadata.courseTitle && (
                              <p>Course: <span className="text-slate-300">{activity.metadata.courseTitle}</span></p>
                            )}
                            {activity.metadata.moduleTitle && (
                              <p>Module: <span className="text-slate-300">{activity.metadata.moduleTitle}</span></p>
                            )}
                            {activity.metadata.chapterTitle && (
                              <p>Chapter: <span className="text-slate-300">{activity.metadata.chapterTitle}</span></p>
                            )}
                            {activity.metadata.quizTitle && (
                              <p>Quiz: <span className="text-slate-300">{activity.metadata.quizTitle}</span></p>
                            )}
                            {activity.metadata.score !== undefined && (
                              <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-1">
                                  <Award size={14} className="text-yellow-400" />
                                  Score: <span className="text-yellow-400 font-bold">{activity.metadata.score}%</span>
                                </span>
                                {activity.metadata.totalQuestions && (
                                  <span className="text-slate-400">
                                    {activity.metadata.score >= (activity.metadata.passMark || 70) ? (
                                      <span className="text-green-400">✓ Passed</span>
                                    ) : (
                                      <span className="text-red-400">✗ Failed</span>
                                    )}
                                  </span>
                                )}
                                {activity.metadata.timeSpent && (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <Clock size={14} />
                                    {Math.floor(activity.metadata.timeSpent / 60)}m {activity.metadata.timeSpent % 60}s
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-slate-500">
                        {formatTime(activity.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}












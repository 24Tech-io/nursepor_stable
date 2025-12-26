// src/app/student/profile/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { syncClient } from '@/lib/sync-client';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    hoursLearned: 0,
    avgRating: 0,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchUser = async () => {
      const storedUserData = sessionStorage.getItem('userData');
      let hasStoredData = false;
      if (storedUserData && isMounted) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          setUser({
            ...parsedUser,
            phone: parsedUser.phone ? String(parsedUser.phone) : null,
            bio: parsedUser.bio || null,
            joinedDate: parsedUser.joinedDate ? new Date(parsedUser.joinedDate) : new Date(),
            avatar: parsedUser.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsedUser.name || 'User')}&background=E31C25&color=fff&size=150`,
          });
          hasStoredData = true;
          setIsLoading(false);
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!isMounted) return;

      try {
        const response = await fetch('/api/auth/me', { 
          credentials: 'include',
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser({
              ...data.user,
              phone: data.user.phone ? String(data.user.phone) : null,
              bio: data.user.bio || null,
              joinedDate: data.user.joinedDate ? new Date(data.user.joinedDate) : new Date(),
              avatar: data.user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name || 'User')}&background=E31C25&color=fff&size=150`,
            });
            setIsLoading(false);
            if (storedUserData) {
              sessionStorage.removeItem('userData');
            }
          }
        } else if (!hasStoredData) {
          setIsLoading(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        if (!hasStoredData && isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/student/stats', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          setStats({
            coursesEnrolled: data.stats.coursesEnrolled,
            coursesCompleted: data.stats.coursesCompleted,
            hoursLearned: data.stats.hoursLearned,
            avgRating: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          const notificationsList = (data.notifications || []).map((notif: any) => ({
            ...notif,
            read: notif.isRead,
            createdAt: new Date(notif.createdAt)
          }));
          setNotifications(notificationsList);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        setNotifications([]);
      }
    };

    fetchStats();
    fetchNotifications();

    // TEMP DISABLED: Causing excessive requests`r`n

    // syncClient.start();
    const handleSync = () => fetchStats();
    syncClient.on('sync', handleSync);

    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, [user]);


  const handleMarkAllRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    setUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/upload-picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser((prev: any) => ({
          ...prev,
          profilePicture: data.url,
          avatar: data.url,
        }));
        alert('Profile picture uploaded successfully!');
      } else {
        alert(data.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      alert('An error occurred while uploading the profile picture');
    } finally {
      setUploadingPicture(false);
      if (event.target) event.target.value = '';
    }
  };

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading your profile..." fullScreen />;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10">
        <div className="absolute inset-0 bg-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(227,28,37,0.2),_transparent_70%)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-nurse-red-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />

        <div className="relative z-10 p-8 flex items-center space-x-6">
          <div className="relative group">
            <img
              src={user.profilePicture || user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-nurse-red-500/30 shadow-glow-red object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handlePictureUpload}
                className="hidden"
                id="profile-picture-upload"
                disabled={uploadingPicture}
              />
              <label htmlFor="profile-picture-upload" className="cursor-pointer flex flex-col items-center justify-center text-white">
                {uploadingPicture ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6 mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-xs font-semibold">Change</span>
                  </>
                )}
              </label>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
            <p className="text-nurse-silver-300 mb-1">{user.email}</p>
            <p className="text-sm text-nurse-silver-500">
              Member since {user.joinedDate ? (typeof user.joinedDate === 'string' ? new Date(user.joinedDate) : user.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
            </p>
          </div>
          <Link 
            href="/student/settings"
            className="px-4 py-2 bg-white/10 text-nurse-silver-300 rounded-xl font-medium hover:bg-white/20 transition border border-white/10 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white'
                  : 'text-nurse-silver-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-nurse-red-500/20 rounded-xl flex items-center justify-center border border-nurse-red-500/30">
                        <svg className="w-6 h-6 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-nurse-silver-500">Full Name</p>
                        <p className="font-semibold text-white">{user.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-nurse-silver-500">Email Address</p>
                        <p className="font-semibold text-white">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-nurse-silver-500/20 rounded-xl flex items-center justify-center border border-nurse-silver-500/30">
                        <svg className="w-6 h-6 text-nurse-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-nurse-silver-500">Phone Number</p>
                        <p className="font-semibold text-white">{user.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Account Status</h3>
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-green-400">Account Active</p>
                        <p className="text-sm text-green-400/70">Your account is in good standing</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.coursesEnrolled}</p>
                      <p className="text-sm text-nurse-silver-400">Courses Enrolled</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.coursesCompleted}</p>
                      <p className="text-sm text-nurse-silver-400">Courses Completed</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.hoursLearned.toFixed(1)}</p>
                      <p className="text-sm text-nurse-silver-400">Hours Learned</p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-2xl font-bold text-white">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}</p>
                      <p className="text-sm text-nurse-silver-400">Avg Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Notifications</h2>
                <button 
                  onClick={handleMarkAllRead}
                  disabled={notifications.length === 0 || notifications.every(n => n.read)}
                  className="px-4 py-2 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white rounded-xl font-semibold hover:from-nurse-red-700 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark All Read
                </button>
              </div>

              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div key={notification.id} className={`p-6 rounded-2xl border transition ${
                      notification.read
                        ? 'bg-white/5 border-white/10'
                        : 'bg-nurse-red-500/10 border-nurse-red-500/30'
                    }`}>
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                          notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                          notification.type === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-nurse-red-500/20 text-nurse-red-400'
                        }`}>
                          {notification.type === 'success' ? '✓' :
                           notification.type === 'warning' ? '⚠' :
                           notification.type === 'error' ? '✕' : 'ℹ'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{notification.title}</h3>
                          <p className="text-nurse-silver-400 mb-2">{notification.message}</p>
                          <p className="text-sm text-nurse-silver-500">
                            {notification.createdAt.toLocaleDateString()} at {notification.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-3 h-3 bg-nurse-red-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">🔔</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
                    <p className="text-nurse-silver-400">You're all caught up! Check back later for new updates.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

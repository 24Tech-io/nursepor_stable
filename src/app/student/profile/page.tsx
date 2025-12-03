// src/app/student/profile/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { getAchievements, getNotifications } from '../../../lib/data';
import BiometricEnrollment from '@/components/auth/BiometricEnrollment';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { syncClient } from '@/lib/sync-client';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'achievements' | 'notifications' | 'settings'
  >('profile');
  const [user, setUser] = useState<any>(null);
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [showFingerprintEnrollment, setShowFingerprintEnrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    hoursLearned: 0,
    avgRating: 0,
  });

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    // Fetch user data
    const fetchUser = async () => {
      // First, try to get user data from sessionStorage (set during login)
      const storedUserData = sessionStorage.getItem('userData');
      let hasStoredData = false;
      if (storedUserData && isMounted) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          console.log('📦 Profile: Using user data from sessionStorage:', parsedUser);
          setUser({
            ...parsedUser,
            // Use real data from API, ensure phone is a string
            phone: parsedUser.phone ? String(parsedUser.phone) : null,
            bio: parsedUser.bio || null,
            joinedDate: parsedUser.joinedDate ? new Date(parsedUser.joinedDate) : new Date(),
            // Use profile picture if available, otherwise generate avatar from name initials
            avatar:
              parsedUser.profilePicture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(parsedUser.name || 'User')}&background=9333ea&color=fff&size=150`,
            faceIdEnrolled: parsedUser.faceIdEnrolled || false,
            fingerprintEnrolled: parsedUser.fingerprintEnrolled || false,
          });
          hasStoredData = true;
          setIsLoading(false); // Show profile immediately with stored data
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }

      // Wait a bit for cookie to be available, then fetch from API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!isMounted) return;

      try {
        console.log('🔍 Profile: Fetching user data from /api/auth/me...');
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: abortController.signal,
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Profile: User data received from API:', data.user);
          console.log(
            '✅ Profile: Phone number from API:',
            data.user?.phone,
            'Type:',
            typeof data.user?.phone
          );
          if (data.user) {
            // Update with fresh data from API
            setUser({
              ...data.user,
              // Use real data from API, ensure phone is a string
              phone: data.user.phone ? String(data.user.phone) : null,
              bio: data.user.bio || null,
              joinedDate: data.user.joinedDate ? new Date(data.user.joinedDate) : new Date(),
              // Use profile picture if available, otherwise generate avatar from name initials
              avatar:
                data.user.profilePicture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name || 'User')}&background=9333ea&color=fff&size=150`,
              faceIdEnrolled: data.user.faceIdEnrolled || false,
              fingerprintEnrolled: data.user.fingerprintEnrolled || false,
            });
            setIsLoading(false);
            // Clear sessionStorage only after successful API fetch
            if (storedUserData) {
              sessionStorage.removeItem('userData');
            }
          } else {
            console.error('❌ Profile: No user data in API response');
            if (!hasStoredData) {
              setIsLoading(false);
            }
          }
        } else if (response.status === 401) {
          console.error('❌ Profile: Unauthorized (401) - cookie might not be set yet');
          // If we already have user data displayed, don't redirect - just retry ONCE
          if (hasStoredData && isMounted) {
            console.log(
              '⚠️ Profile: Using stored user data while cookie is being set - will retry'
            );
            // Retry fetching after a longer delay (only once)
            setTimeout(async () => {
              if (!isMounted) return;
              try {
                console.log('🔄 Profile: Retrying /api/auth/me...');
                const retryResponse = await fetch('/api/auth/me', {
                  credentials: 'include',
                  signal: abortController.signal,
                  cache: 'no-store',
                });
                if (retryResponse.ok && isMounted) {
                  const retryData = await retryResponse.json();
                  if (retryData.user) {
                    console.log('✅ Profile: Retry successful - updating user data');
                    setUser({
                      ...retryData.user,
                      // Use real data from API, ensure phone is a string
                      phone: retryData.user.phone ? String(retryData.user.phone) : null,
                      bio: retryData.user.bio || null,
                      joinedDate: retryData.user.joinedDate
                        ? new Date(retryData.user.joinedDate)
                        : new Date(),
                      // Use profile picture if available, otherwise generate avatar from name initials
                      avatar:
                        retryData.user.profilePicture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(retryData.user.name || 'User')}&background=9333ea&color=fff&size=150`,
                      faceIdEnrolled: retryData.user.faceIdEnrolled || false,
                      fingerprintEnrolled: retryData.user.fingerprintEnrolled || false,
                    });
                    sessionStorage.removeItem('userData');
                  }
                } else {
                  console.error('❌ Profile: Retry still failed - status:', retryResponse.status);
                }
              } catch (e: any) {
                if (e.name === 'AbortError') return;
                console.error('Profile retry failed:', e);
              }
            }, 3000);
          } else {
            setIsLoading(false);
          }
        } else {
          console.error('❌ Profile: Failed to fetch user - status:', response.status);
          if (!hasStoredData) {
            setIsLoading(false);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('❌ Profile: Exception fetching user:', error);
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

  // Fetch stats when user is loaded
  useEffect(() => {
    if (!user) {
      return;
    }

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
            avgRating: 0, // TODO: Calculate from course ratings
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    // Start sync client for auto-refresh
    syncClient.start();
    const handleSync = (syncData: any) => {
      console.log('🔄 Profile: Sync update received:', syncData);
      fetchStats(); // Refresh stats on sync
    };
    syncClient.on('sync', handleSync);

    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, [user]);

  // For now, show empty achievements - in future, fetch from database
  const achievements: any[] = []; // TODO: Fetch real achievements from API
  const notifications = getNotifications();

  // Handle profile picture upload
  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return;
    }

    // Validate file size (5MB)
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
        // Update user state with new profile picture URL
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
      console.error('Error uploading profile picture:', error);
      alert('An error occurred while uploading the profile picture');
    } finally {
      setUploadingPicture(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading your profile..." fullScreen />;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10 flex items-center space-x-6">
          <div className="relative group">
            <img
              src={user.profilePicture || user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            {/* Upload overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handlePictureUpload}
                className="hidden"
                id="profile-picture-upload"
                disabled={uploadingPicture}
              />
              <label
                htmlFor="profile-picture-upload"
                className="cursor-pointer flex flex-col items-center justify-center text-white"
              >
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
          <div>
            <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
            <p className="text-blue-100 mb-1">{user.email}</p>
            <p className="text-sm text-blue-200">
              Member since{' '}
              {user.joinedDate
                ? (typeof user.joinedDate === 'string'
                    ? new Date(user.joinedDate)
                    : user.joinedDate
                  ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : 'Recently'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
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
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email Address</p>
                          <p className="font-semibold text-gray-900">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="font-semibold text-gray-900">
                            {user.phone || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Bio</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {user.bio || 'No bio provided yet.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Account Status</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-green-900">Account Active</p>
                            <p className="text-sm text-green-700">
                              Your account is in good standing
                            </p>
                          </div>
                        </div>
                      </div>

                      {user.faceIdEnrolled && (
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-blue-900">Face ID Enrolled</p>
                              <p className="text-sm text-blue-700">
                                Biometric authentication enabled
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">{stats.coursesEnrolled}</p>
                        <p className="text-sm text-gray-600">Courses Enrolled</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">{stats.coursesCompleted}</p>
                        <p className="text-sm text-gray-600">Courses Completed</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.hoursLearned.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-600">Hours Learned</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">Avg Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Achievements</h2>
                <p className="text-gray-600">Celebrate your learning milestones</p>
              </div>

              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${achievement.color}`}
                        >
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{achievement.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                          {achievement.unlockedAt && (
                            <p className="text-xs text-green-600 font-medium">
                              Unlocked {achievement.unlockedAt.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Achievements Yet</h3>
                  <p className="text-gray-600">
                    Start learning to unlock achievements and track your progress!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition">
                  Mark All Read
                </button>
              </div>

              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 rounded-2xl border transition ${
                      notification.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          notification.type === 'success'
                            ? 'bg-green-100 text-green-600'
                            : notification.type === 'warning'
                              ? 'bg-yellow-100 text-yellow-600'
                              : notification.type === 'error'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {notification.type === 'success'
                          ? '✓'
                          : notification.type === 'warning'
                            ? '⚠'
                            : notification.type === 'error'
                              ? '✕'
                              : 'ℹ'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-sm text-gray-500">
                          {notification.createdAt.toLocaleDateString()} at{' '}
                          {notification.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Profile Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue={user.email}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          defaultValue={user.phone}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                        <textarea
                          defaultValue={user.bio}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                    <div className="space-y-4">
                      {/* Face ID Authentication */}
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Face ID Authentication</p>
                              <p className="text-sm text-gray-600">
                                {user.faceIdEnrolled
                                  ? 'Face ID is enrolled'
                                  : 'Use your face for quick login'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {user.faceIdEnrolled ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => setShowFaceEnrollment(true)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition text-sm"
                            >
                              Enroll
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fingerprint Authentication */}
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04c.654-1.923 1.011-3.96 1.011-6.131 0-1.623-.277-3.18-.784-4.612M17.193 9.75c.585 1.923.907 3.96.907 6.131 0 1.623-.277 3.18-.784 4.612m-2.753-9.571c-1.744 2.772-4.753 4.571-8.193 4.571-3.44 0-6.449-1.799-8.193-4.571"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                Fingerprint Authentication
                              </p>
                              <p className="text-sm text-gray-600">
                                {user.fingerprintEnrolled
                                  ? 'Fingerprint is enrolled'
                                  : 'Use your fingerprint for quick login'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {user.fingerprintEnrolled ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => setShowFingerprintEnrollment(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
                            >
                              Enroll
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-600">Add an extra layer of security</p>
                        </div>
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition">
                          Enable
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Notification Preferences
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive updates via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900">Push Notifications</p>
                          <p className="text-sm text-gray-600">Receive push notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition">
                      Cancel
                    </button>
                    <button className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Biometric Enrollment Modals */}
      {showFaceEnrollment && (
        <BiometricEnrollment
          type="face"
          onComplete={() => {
            setShowFaceEnrollment(false);
            // Refresh user data
            fetch('/api/auth/me', { credentials: 'include' })
              .then((res) => res.json())
              .then((data) => setUser({ ...user, faceIdEnrolled: data.user.faceIdEnrolled }))
              .catch(console.error);
          }}
          onError={(error) => {
            console.error('Face enrollment error:', error);
            alert(error);
          }}
          onCancel={() => setShowFaceEnrollment(false)}
        />
      )}

      {showFingerprintEnrollment && (
        <BiometricEnrollment
          type="fingerprint"
          onComplete={() => {
            setShowFingerprintEnrollment(false);
            // Refresh user data
            fetch('/api/auth/me', { credentials: 'include' })
              .then((res) => res.json())
              .then((data) =>
                setUser({ ...user, fingerprintEnrolled: data.user.fingerprintEnrolled })
              )
              .catch(console.error);
          }}
          onError={(error) => {
            console.error('Fingerprint enrollment error:', error);
            alert(error);
          }}
          onCancel={() => setShowFingerprintEnrollment(false)}
        />
      )}
    </div>
  );
}

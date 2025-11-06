// src/app/student/profile/page.tsx

'use client';

import { useState } from 'react';
import { getAchievements, getNotifications } from '../../../lib/data';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'achievements' | 'notifications' | 'settings'>('profile');

  const achievements = getAchievements();
  const notifications = getNotifications();

  // Mock user data - in real app this would come from auth context
  const user = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91-9876543210',
    bio: 'Passionate learner exploring web development and design.',
    joinedDate: new Date('2024-01-15'),
    faceIdEnrolled: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10 flex items-center space-x-6">
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
            <p className="text-blue-100 mb-1">{user.email}</p>
            <p className="text-sm text-blue-200">Member since {user.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
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
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email Address</p>
                          <p className="font-semibold text-gray-900">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="font-semibold text-gray-900">{user.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Bio</h3>
                    <p className="text-gray-600 leading-relaxed">{user.bio}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Account Status</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-green-900">Account Active</p>
                            <p className="text-sm text-green-700">Your account is in good standing</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900">Face ID Enrolled</p>
                            <p className="text-sm text-blue-700">Biometric authentication enabled</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">12</p>
                        <p className="text-sm text-gray-600">Courses Enrolled</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">8</p>
                        <p className="text-sm text-gray-600">Courses Completed</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">156</p>
                        <p className="text-sm text-gray-600">Hours Learned</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900">4.8</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map(achievement => (
                  <div key={achievement.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${achievement.color}`}>
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
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-6 rounded-2xl border transition ${
                    notification.read
                      ? 'bg-white border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        notification.type === 'success' ? 'bg-green-100 text-green-600' :
                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        notification.type === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notification.type === 'success' ? '✓' :
                         notification.type === 'warning' ? '⚠' :
                         notification.type === 'error' ? '✕' : 'ℹ'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-sm text-gray-500">
                          {notification.createdAt.toLocaleDateString()} at {notification.createdAt.toLocaleTimeString()}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          defaultValue={user.name}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          defaultValue={user.email}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
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
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900">Face ID Authentication</p>
                          <p className="text-sm text-gray-600">Use biometric authentication for login</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked={user.faceIdEnrolled} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
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
    </div>
  );
}

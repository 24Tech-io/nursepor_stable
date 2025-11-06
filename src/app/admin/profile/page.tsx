// src/app/admin/profile/page.tsx

'use client';

import { useState, useEffect } from 'react';
import BiometricEnrollment from '@/components/auth/BiometricEnrollment';

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [user, setUser] = useState<any>(null);
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [showFingerprintEnrollment, setShowFingerprintEnrollment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    // Fetch user data
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUser({
            ...data.user,
            phone: data.user.phone || null,
            bio: data.user.bio || null,
            joinedDate: data.user.joinedDate ? new Date(data.user.joinedDate) : new Date(),
            // Use profile picture if available, otherwise generate avatar from name initials
            avatar: data.user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name || 'Admin')}&background=9333ea&color=fff&size=150`,
            faceIdEnrolled: data.user.faceIdEnrolled || false,
            fingerprintEnrolled: data.user.fingerprintEnrolled || false,
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Handle profile picture upload
  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Security Settings', icon: '🔒' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">Manage your account information and security settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {user.profilePicture || user.avatar ? (
                  <img
                    src={user.profilePicture || user.avatar}
                    alt={user.name}
                    className="w-32 h-32 rounded-full border-4 border-purple-200 shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handlePictureUpload}
                    className="hidden"
                    id="admin-profile-picture-upload"
                    disabled={uploadingPicture}
                  />
                  <label
                    htmlFor="admin-profile-picture-upload"
                    className="cursor-pointer flex flex-col items-center justify-center text-white"
                  >
                    {uploadingPicture ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-semibold">Change</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-gray-500 text-sm mt-2">{user.bio}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{user.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joined</label>
                  <p className="text-gray-900">{user.joinedDate.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
            
            {/* Face ID */}
            <div className="mb-6 p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Face ID Authentication</h3>
                  <p className="text-sm text-gray-600 mt-1">Use facial recognition for quick and secure login</p>
                </div>
                <div className="flex items-center space-x-4">
                  {user.faceIdEnrolled ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
                  ) : (
                    <button
                      onClick={() => setShowFaceEnrollment(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Fingerprint */}
            <div className="mb-6 p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Fingerprint Authentication</h3>
                  <p className="text-sm text-gray-600 mt-1">Use fingerprint for quick and secure login</p>
                </div>
                <div className="flex items-center space-x-4">
                  {user.fingerprintEnrolled ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
                  ) : (
                    <button
                      onClick={() => setShowFingerprintEnrollment(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2FA */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
                  <p className="text-sm text-gray-600 mt-1">Add an extra layer of security to your account</p>
                </div>
                <div className="flex items-center space-x-4">
                  {user.twoFactorEnabled ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Enabled</span>
                  ) : (
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Enrollment Modals */}
      {showFaceEnrollment && (
        <BiometricEnrollment
          type="face"
          onComplete={() => {
            setShowFaceEnrollment(false);
            // Refresh user data
            fetch('/api/auth/me', { credentials: 'include' })
              .then(res => res.json())
              .then(data => {
                if (data.user) {
                  setUser({ ...user, faceIdEnrolled: data.user.faceIdEnrolled });
                }
              });
          }}
          onError={(error) => {
            alert(`Face enrollment failed: ${error}`);
            setShowFaceEnrollment(false);
          }}
        />
      )}

      {showFingerprintEnrollment && (
        <BiometricEnrollment
          type="fingerprint"
          onComplete={() => {
            setShowFingerprintEnrollment(false);
            // Refresh user data
            fetch('/api/auth/me', { credentials: 'include' })
              .then(res => res.json())
              .then(data => {
                if (data.user) {
                  setUser({ ...user, fingerprintEnrolled: data.user.fingerprintEnrolled });
                }
              });
          }}
          onError={(error) => {
            alert(`Fingerprint enrollment failed: ${error}`);
            setShowFingerprintEnrollment(false);
          }}
        />
      )}
    </div>
  );
}


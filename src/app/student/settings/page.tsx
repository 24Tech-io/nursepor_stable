'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/student/LoadingSpinner';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setFormData({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleToggle2FA = async () => {
    if (user?.twoFactorEnabled) {
      // Disable 2FA
      setShowPasswordModal(true);
    } else {
      // Enable 2FA
      setShowPasswordModal(true);
    }
  };

  const confirmToggle2FA = async () => {
    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    setEnabling2FA(true);
    setPasswordError('');

    try {
      const response = await fetch('/api/auth/toggle-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          password,
          enable: !user?.twoFactorEnabled 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser({ ...user, twoFactorEnabled: !user?.twoFactorEnabled });
        setShowPasswordModal(false);
        setPassword('');
        alert(data.message || (user?.twoFactorEnabled ? '2FA disabled successfully' : '2FA enabled successfully'));
      } else {
        setPasswordError(data.message || 'Failed to update 2FA settings');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setEnabling2FA(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading settings..." fullScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-nurse-silver-400">Manage your account preferences and security</p>
      </div>

      {/* Profile Information */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-nurse-silver-300 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nurse-silver-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-nurse-silver-300 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
        <div className="space-y-4">
          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                user?.twoFactorEnabled 
                  ? 'bg-green-500/20 border-green-500/30' 
                  : 'bg-nurse-silver-500/20 border-nurse-silver-500/30'
              }`}>
                <svg className={`w-6 h-6 ${user?.twoFactorEnabled ? 'text-green-400' : 'text-nurse-silver-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Two-Factor Authentication</p>
                <p className="text-sm text-nurse-silver-400">
                  {user?.twoFactorEnabled 
                    ? 'Enabled - Password login requires OTP verification' 
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleToggle2FA}
              className={`px-4 py-2 rounded-xl font-semibold transition ${
                user?.twoFactorEnabled
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white hover:from-nurse-red-700 hover:to-red-700'
              }`}
            >
              {user?.twoFactorEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* Change Password */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-nurse-silver-500/20 rounded-xl flex items-center justify-center border border-nurse-silver-500/30">
                <svg className="w-6 h-6 text-nurse-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Change Password</p>
                <p className="text-sm text-nurse-silver-400">Update your password regularly</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white/10 text-nurse-silver-300 rounded-xl font-semibold hover:bg-white/20 transition border border-white/10">
              Change
            </button>
          </div>
        </div>

        {/* 2FA Info Box */}
        <div className="mt-6 p-4 bg-nurse-red-500/10 rounded-xl border border-nurse-red-500/20">
          <h4 className="font-semibold text-white mb-2">How Two-Factor Authentication Works:</h4>
          <ul className="text-sm text-nurse-silver-400 space-y-1">
            <li>• <strong className="text-white">Password Login:</strong> If 2FA is enabled, you'll need to enter an OTP sent to your email after entering your password.</li>
            <li>• <strong className="text-white">OTP Login:</strong> If 2FA is enabled, you'll need to enter your password in addition to the OTP.</li>
            <li>• <strong className="text-white">Without 2FA:</strong> Regular login with just password or just OTP works normally.</li>
          </ul>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <p className="font-semibold text-white">Email Notifications</p>
              <p className="text-sm text-nurse-silver-400">Receive updates via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nurse-red-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nurse-red-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <p className="font-semibold text-white">Push Notifications</p>
              <p className="text-sm text-nurse-silver-400">Receive push notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nurse-red-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nurse-red-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <p className="font-semibold text-white">Course Updates</p>
              <p className="text-sm text-nurse-silver-400">Get notified about new course content</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nurse-red-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nurse-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <button className="px-6 py-3 bg-white/10 text-nurse-silver-300 rounded-xl font-semibold hover:bg-white/20 transition border border-white/10">
          Cancel
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white rounded-xl font-semibold hover:from-nurse-red-700 hover:to-red-700 shadow-glow-red transition">
          Save Changes
        </button>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">
              {user?.twoFactorEnabled ? 'Disable' : 'Enable'} Two-Factor Authentication
            </h3>
            <p className="text-nurse-silver-400 mb-6">
              Enter your password to confirm this action.
            </p>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-nurse-silver-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPasswordError('');
                }}
                className="px-5 py-3 bg-white/10 text-nurse-silver-300 rounded-xl font-semibold hover:bg-white/20 transition border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle2FA}
                disabled={enabling2FA}
                className={`px-6 py-3 rounded-xl font-semibold transition ${
                  user?.twoFactorEnabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white hover:from-nurse-red-700 hover:to-red-700'
                } disabled:opacity-50`}
              >
                {enabling2FA ? 'Processing...' : (user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FaceLogin from '@/components/auth/FaceLogin';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceLoginEmail, setFaceLoginEmail] = useState('');
  const [showOTPLogin, setShowOTPLogin] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setError(''); // Clear any previous errors
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role: 'student' }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        window.location.href = '/student';
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role: 'student',
        }),
        credentials: 'include',
      });

      if (response.status === 0) {
        setError('Network error. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      let data: any = null;

      if (response.ok) {
        try {
          const responseText = await response.text();

          if (!responseText || responseText.trim() === '' || responseText.trim().startsWith('<!')) {
            window.location.replace('/student');
            return;
          }

          data = JSON.parse(responseText);
        } catch (parseError) {
          window.location.replace('/student');
          return;
        }

        if (!data.user) {
          setError('Login successful but user data missing');
          setIsLoading(false);
          return;
        }

        // Only allow student role
        if (data.user.role !== 'student') {
          setError('This account is not a student account. Please use the admin portal to login.');
          setIsLoading(false);
          return;
        }

        const redirectUrl = '/student';

        setError('');
        setIsLoading(false);

        sessionStorage.setItem('userData', JSON.stringify(data.user));

        // Wait for password manager to catch up
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);

        return;

      } else {
        try {
          const responseText = await response.text();
          if (responseText) {
            data = JSON.parse(responseText);
          }
        } catch (e) {
          // Ignore parse errors
        }

        setError(data?.message || `Login failed (Status: ${response.status})`);
        setIsLoading(false);
      }
    } catch (error: any) {
      setError(error?.message || 'Network error. Please try again.');
      setIsLoading(false);
    } finally {
      if (window.location.pathname === '/login') {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-fuchsia-600/30 to-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/30 to-purple-600/20 blur-3xl" />

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-[0_10px_40px_-12px_rgba(99,102,241,0.6)]">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-300">Sign in to your Nurse Pro Academy student account</p>
        </div>

        {/* OTP Login Toggle */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => { setShowOTPLogin(false); setError(''); setOtpSent(false); setOtp(''); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!showOTPLogin ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Password
          </button>
          <button
            onClick={() => { setShowOTPLogin(true); setError(''); setOtpSent(false); setOtp(''); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${showOTPLogin ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            OTP
          </button>
        </div>

        {/* Form */}
        {!showOTPLogin ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmit}
            name="login-form"
            id="login-form"
            action="/api/auth/login"
            method="POST"
          >
            <div className="space-y-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-indigo-900/20">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-white/10 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(99,102,241,0.6)]"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-indigo-300 hover:text-indigo-200 font-medium"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={otpSent ? handleVerifyOTP : handleSendOTP}>
            <div className="space-y-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-indigo-900/20">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter your email"
                />
              </div>

              {otpSent && (
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-200">
                    Enter OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-white/10 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(99,102,241,0.6)]"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {otpSent ? 'Verifying...' : 'Sending OTP...'}
                  </div>
                ) : (
                  otpSent ? 'Verify OTP' : 'Send OTP'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-slate-300">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-indigo-300 hover:text-indigo-200"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Face Login Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-slate-400">Or</span>
          </div>
        </div>

        {/* Face Login Button */}
        <button
          type="button"
          onClick={() => setShowFaceLogin(true)}
          className="w-full flex items-center justify-center px-4 py-3 border border-white/20 text-sm font-medium rounded-xl text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Login with Face
        </button>
      </div>

      {/* Face Login Modal */}
      {showFaceLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Face Login</h3>
              <button
                onClick={() => setShowFaceLogin(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={faceLoginEmail}
                  onChange={(e) => setFaceLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 text-slate-100 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your email"
                />
              </div>
              {faceLoginEmail && (
                <FaceLogin
                  mode="verify"
                  onVerify={async (descriptor) => {
                    try {
                      const response = await fetch('/api/auth/face-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: faceLoginEmail,
                          descriptor: Array.from(descriptor),
                          role: 'student', // Force student role
                        }),
                      });

                      const data = await response.json();
                      if (response.ok) {
                        if (data.user.role === 'student') {
                          router.push('/student');
                          return true;
                        } else {
                          setError('This account is not a student account. Please use the admin portal to login.');
                          return false;
                        }
                      } else {
                        setError(data.message || 'Face login failed');
                        return false;
                      }
                    } catch (err) {
                      setError('Network error. Please try again.');
                      return false;
                    }
                  }}
                  onComplete={() => setShowFaceLogin(false)}
                  onError={(err) => setError(err)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

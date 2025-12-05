'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginTab = 'email' | 'otp';

export default function AdminLoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'admin') {
            router.replace('/admin/dashboard');
            return;
          }
        }
      } catch (error) {
        console.log('Not authenticated, showing login form');
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          rememberMe,
        }),
        credentials: 'include',
      });

      if (response.status === 0) {
        setError('Network error. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        let data: any = null;

        try {
          data = await response.json();
        } catch (parseError) {
          window.location.replace('/admin/dashboard');
          return;
        }

        if (!data || !data.user) {
          setError('Login successful but user data missing');
          setIsLoading(false);
          return;
        }

        if (data.user.role !== 'admin') {
          setError('This account is not an admin account. Please use the student portal to login.');
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem('adminUser', JSON.stringify(data.user));

        // Redirect to admin dashboard immediately
        window.location.href = '/admin/dashboard';

        return;
      } else {
        let errorData: any = null;
        try {
          const responseText = await response.text();
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (e) {
          // Ignore parse errors
        }

        setError(errorData?.message || `Login failed (Status: ${response.status})`);
        setIsLoading(false);
      }
    } catch (error: any) {
      setError(error?.message || 'Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setError('');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role: 'admin' }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.user) {
        if (data.user.role !== 'admin') {
          setError('This account is not an admin account.');
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem('adminUser', JSON.stringify(data.user));
        window.location.href = '/admin/dashboard';
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative gradients - Teal/Emerald theme */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/30 to-emerald-600/20 blur-3xl" />

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-[0_10px_40px_-12px_rgba(16,185,129,0.6)]">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-300">Sign in to your Admin Portal account</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl backdrop-blur-xl border border-white/10">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'email'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab('otp')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'otp'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            OTP
          </button>
        </div>

        {/* Form Container */}
        <div className="space-y-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-teal-900/20">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Email Login Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/30 bg-white/10 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-2 text-slate-200">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-emerald-300 hover:text-white font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-white/10 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(16,185,129,0.6)]"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* OTP Login Tab */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter your email"
                    disabled={otpSent}
                    required
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && (
                <form onSubmit={handleOTPLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                    <p className="mt-2 text-sm text-slate-300">
                      OTP sent to {email}.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp('');
                        }}
                        className="text-emerald-300 hover:text-emerald-200 font-medium"
                      >
                        Change email
                      </button>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_10px_40px_-12px_rgba(16,185,129,0.6)]"
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="w-full text-sm text-emerald-300 hover:text-emerald-200 font-medium"
                  >
                    Resend OTP
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-slate-300">
            Don't have an account?{' '}
            <Link href="/admin/register" className="font-medium text-emerald-300 hover:text-emerald-200">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CustomCursor from '@/components/CustomCursor';

type LoginTab = 'email' | 'otp';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAOtp, setTwoFAOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  
  // For OTP login with 2FA
  const [otpLoginRequires2FA, setOtpLoginRequires2FA] = useState(false);
  const [otpLoginPassword, setOtpLoginPassword] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const message = urlParams.get('message');
      if (message) {
        setSuccessMessage(decodeURIComponent(message));
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me?type=student', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'student') {
            router.replace('/student/dashboard');
            return;
          }
        }
      } catch (error) {
        // Not authenticated
      }
    }

    checkAuth();
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          role: 'student',
          rememberMe: rememberMe
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.requires2FA) {
        // User has 2FA enabled, need to verify OTP
        setRequires2FA(true);
        setTempToken(data.tempToken);
        setSuccessMessage('OTP sent to your email. Please verify to complete login.');
        setIsLoading(false);
        return;
      }

      if (response.ok && data.user) {
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        const redirectUrl = data.redirectUrl || (data.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
        router.push(redirectUrl);
      } else {
        setError(data.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (error: any) {
      setError(error.message || 'Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tempToken,
          otp: twoFAOtp,
          email
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.user) {
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        const redirectUrl = data.redirectUrl || '/student/dashboard';
        router.push(redirectUrl);
      } else {
        setError(data.message || 'Invalid OTP');
        setIsLoading(false);
      }
    } catch (error: any) {
      setError(error.message || 'Network error. Please try again.');
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
        body: JSON.stringify({ email, role: 'student' }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setError('');
        // Check if user has 2FA enabled
        if (data.requires2FAPassword) {
          setOtpLoginRequires2FA(true);
        }
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
        body: JSON.stringify({ 
          email, 
          otp, 
          role: 'student',
          password: otpLoginRequires2FA ? otpLoginPassword : undefined
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.requires2FAPassword && !otpLoginPassword) {
        // User has 2FA, need password too
        setOtpLoginRequires2FA(true);
        setError('Two-Factor Authentication is enabled. Please enter your password.');
        setIsLoading(false);
        return;
      }

      if (response.ok && data.user) {
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        const redirectUrl = data.redirectUrl || '/student/dashboard';
        router.push(redirectUrl);
      } else {
        setError(data.message || 'Invalid OTP');
        setIsLoading(false);
      }
    } catch (error: any) {
      setError(error.message || 'Network error. Please try again.');
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <CustomCursor />
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,37,0.15),_transparent_50%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nurse-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-nurse-red-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Nurse Pro Academy"
              width={64}
              height={64}
              loading="lazy"
              fetchPriority="low"
              unoptimized
              className="rounded-2xl shadow-glow-red"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-nurse-silver-400">Sign in to your Nurse Pro Academy account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-xl p-8 border border-white/10">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('email');
                setRequires2FA(false);
                setError('');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'email'
                  ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
                  : 'text-nurse-silver-400 hover:text-white'
                }`}
            >
              Password
            </button>
            <button
              onClick={() => {
                setActiveTab('otp');
                setRequires2FA(false);
                setError('');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === 'otp'
                  ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
                  : 'text-nurse-silver-400 hover:text-white'
                }`}
            >
              OTP
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
              <p className="text-sm text-green-400">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Email Login Tab */}
          {activeTab === 'email' && !requires2FA && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nurse-silver-300 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-nurse-silver-500 focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nurse-silver-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-nurse-silver-500 focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer group">
                  <div 
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                      rememberMe 
                        ? 'bg-nurse-red-500 border-nurse-red-500' 
                        : 'border-white/30 bg-white/5 group-hover:border-nurse-red-500/50'
                    }`}
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    {rememberMe && (
                      <svg 
                        className="w-3 h-3 text-white"
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="ml-2 text-nurse-silver-400 group-hover:text-white transition-colors">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-nurse-silver-400 hover:text-white font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white font-medium rounded-xl hover:from-nurse-red-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-nurse-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-red flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}

          {/* 2FA Verification (after password login) */}
          {activeTab === 'email' && requires2FA && (
            <form onSubmit={handle2FAVerify} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-nurse-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-red-500/30">
                  <svg className="w-8 h-8 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
                <p className="text-sm text-nurse-silver-400 mt-1">Enter the OTP sent to your email</p>
              </div>

              <div>
                <input
                  type="text"
                  value={twoFAOtp}
                  onChange={(e) => setTwoFAOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-nurse-silver-500 focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || twoFAOtp.length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white font-medium rounded-xl hover:from-nurse-red-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-red"
              >
                {isLoading ? 'Verifying...' : 'Verify & Sign in'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFAOtp('');
                  setTempToken('');
                }}
                className="w-full text-sm text-nurse-silver-400 hover:text-white font-medium transition-colors"
              >
                ← Back to login
              </button>
            </form>
          )}

          {/* OTP Login Tab */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nurse-silver-300 mb-2">
                  Email address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-nurse-silver-500 focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                    disabled={otpSent}
                    required
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white font-medium rounded-xl hover:from-nurse-red-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && (
                <form onSubmit={handleOTPLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-nurse-silver-300 mb-2">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-nurse-silver-500 focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                    <p className="mt-2 text-sm text-nurse-silver-400">
                      OTP sent to {email}.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp('');
                          setOtpLoginRequires2FA(false);
                          setOtpLoginPassword('');
                        }}
                        className="text-nurse-red-400 hover:text-white font-medium transition-colors"
                      >
                        Change email
                      </button>
                    </p>
                  </div>

                  {/* Password field for 2FA users doing OTP login */}
                  {otpLoginRequires2FA && (
                    <div>
                      <label className="block text-sm font-medium text-nurse-silver-300 mb-2">
                        Password <span className="text-nurse-red-400">(2FA enabled)</span>
                      </label>
                      <input
                        type="password"
                        value={otpLoginPassword}
                        onChange={(e) => setOtpLoginPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-nurse-silver-500 focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent"
                        placeholder="Enter your password"
                        required
                      />
                      <p className="mt-1 text-xs text-nurse-silver-500">
                        Two-Factor Authentication is enabled. Password is required.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6 || (otpLoginRequires2FA && !otpLoginPassword)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white font-medium rounded-xl hover:from-nurse-red-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-red"
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="w-full text-sm text-nurse-silver-400 hover:text-white font-medium transition-colors"
                  >
                    Resend OTP
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-nurse-silver-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-nurse-red-400 hover:text-white font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

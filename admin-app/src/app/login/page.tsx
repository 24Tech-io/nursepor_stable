'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginTab = 'email' | 'otp' | 'face';

export default function AdminLoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'admin') {
            router.replace('/dashboard');
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role: 'admin',
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
          window.location.replace('/dashboard');
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
        sessionStorage.setItem('shouldRedirect', 'true');

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);

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
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
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
          <button
            onClick={() => setActiveTab('face')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'face'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Face ID
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

          {/* Face ID Login Tab */}
          {activeTab === 'face' && (
            <FaceLoginTab
              email={email}
              setEmail={setEmail}
              setIsLoading={setIsLoading}
              setError={setError}
              router={router}
            />
          )}
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-slate-300">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-emerald-300 hover:text-emerald-200">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Face Login Component
function FaceLoginTab({
  email,
  setEmail,
  setIsLoading,
  setError,
  router,
}: {
  email: string;
  setEmail: (email: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  router: any;
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
        setStatus('Camera ready. Position your face in the frame.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to access camera');
    }
  };

  const handleFaceLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!videoRef.current || !cameraReady) {
      setError('Camera not ready');
      return;
    }

    setIsVerifying(true);
    setError('');
    setStatus('Verifying face...');

    try {
      const { enrollFace } = await import('@/lib/simple-face-auth');

      const result = await enrollFace(videoRef.current);

      if (!result.success || !result.features) {
        throw new Error(result.error || 'Face capture failed');
      }

      // Convert features to base64
      const faceTemplate = btoa(JSON.stringify(result.features));

      const response = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), faceTemplate }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Face verification failed');
      }

      const data = await response.json();

      if (data.user && data.user.role === 'admin') {
        sessionStorage.setItem('adminUser', JSON.stringify(data.user));
        sessionStorage.setItem('shouldRedirect', 'true');

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        throw new Error('Invalid admin account');
      }
    } catch (err: any) {
      setError(err.message || 'Face login failed');
      setIsVerifying(false);
      setStatus('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Enter your email"
          required
          disabled={isVerifying}
        />
      </div>

      {!cameraReady ? (
        <button
          onClick={initializeCamera}
          className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-500 hover:to-teal-500 transition-all"
        >
          Enable Camera
        </button>
      ) : (
        <>
          <div className="relative bg-black/20 rounded-xl overflow-hidden border border-white/10">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
            {isVerifying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-white font-medium">{status}</p>
                </div>
              </div>
            )}
          </div>
          {status && !isVerifying && <p className="text-slate-400 text-sm text-center">{status}</p>}
          <button
            onClick={handleFaceLogin}
            disabled={isVerifying || !email.trim()}
            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verifying...' : 'Login with Face ID'}
          </button>
        </>
      )}
    </div>
  );
}

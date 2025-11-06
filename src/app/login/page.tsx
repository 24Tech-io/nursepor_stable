'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin' | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // If user specified a role and it doesn't match, show error
        if (role !== 'auto' && data.user.role !== role) {
          setError(`This account is registered as ${data.user.role}, but you selected ${role}. Please select the correct role.`);
          setIsLoading(false);
          return;
        }
        
        // Redirect based on role
        if (data.user.role === 'admin') {
          router.push('/admin/students');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
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
          <p className="mt-2 text-sm text-slate-300">Sign in to your LMS Platform account</p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-indigo-900/20">
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

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Account Type (Optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('auto')}
                  className={`p-3 rounded-xl border transition-all text-sm font-semibold ${
                    role === 'auto'
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                      : 'border-white/20 bg-white/5 text-slate-300 hover:border-white/30'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-xl border transition-all text-sm font-semibold ${
                    role === 'student'
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                      : 'border-white/20 bg-white/5 text-slate-300 hover:border-white/30'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-3 rounded-xl border transition-all text-sm font-semibold ${
                    role === 'admin'
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                      : 'border-white/20 bg-white/5 text-slate-300 hover:border-white/30'
                  }`}
                >
                  Admin
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">Select your account type or leave as "Auto" to detect automatically</p>
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
        </form>
      </div>
    </div>
  );
}

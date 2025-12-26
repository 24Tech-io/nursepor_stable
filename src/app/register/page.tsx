'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomCursor from '@/components/CustomCursor';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: 'student',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login?message=Registration successful! Please sign in.');
      } else {
        setError(data.message || 'Registration failed');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <CustomCursor />
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,37,0.15),_transparent_50%)]" />
      
      <div className="relative max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-nurse-red-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg glow-pulse">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">Create your student account</h2>
          <p className="mt-2 text-sm text-nurse-silver-400">
            Join our learning community today
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-nurse-silver-300">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-3 border border-white/20 rounded-xl shadow-sm placeholder-nurse-silver-500 focus:outline-none focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white bg-white/5"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-nurse-silver-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-3 border border-white/20 rounded-xl shadow-sm placeholder-nurse-silver-500 focus:outline-none focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white bg-white/5"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-nurse-silver-300">
                  Phone Number <span className="text-nurse-silver-500 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-3 border border-white/20 rounded-xl shadow-sm placeholder-nurse-silver-500 focus:outline-none focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white bg-white/5"
                  placeholder="Enter your phone number (optional)"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-nurse-silver-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-3 border border-white/20 rounded-xl shadow-sm placeholder-nurse-silver-500 focus:outline-none focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white bg-white/5"
                  placeholder="Create a password"
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-nurse-silver-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-3 border border-white/20 rounded-xl shadow-sm placeholder-nurse-silver-500 focus:outline-none focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white bg-white/5"
                  placeholder="Confirm your password"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="glow-pulse group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nurse-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(227,28,37,0.5)]"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-nurse-silver-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-nurse-red-500 hover:text-nurse-red-400"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
      </div>
    </div>
  );
}

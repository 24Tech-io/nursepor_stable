'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import NclexRegistrationCTA from '@/components/forms/NclexRegistrationCTA';
import CustomCursor from '@/components/CustomCursor';

export default function HomePage() {
  const router = useRouter();

  // Check if user is already authenticated as student
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
        // Not authenticated, show landing page
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950">
      <CustomCursor />
      {/* Header */}
      <header className="bg-slate-950 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <Link href="/" className="flex items-center group">
              <Image
                src="/logo.png"
                alt="Nurse Pro Academy"
                width={48}
                height={48}
                loading="lazy"
                fetchPriority="low"
                unoptimized
                className="object-contain group-hover:scale-110 transition-transform duration-300"
              />
              <span className="ml-3 text-xl font-bold text-white group-hover:text-nurse-red-400 transition-colors duration-300">
                <span className="inline-block hover-letter" style={{ animationDelay: '0ms' }}>N</span>
                <span className="inline-block hover-letter" style={{ animationDelay: '30ms' }}>u</span>
                <span className="inline-block hover-letter" style={{ animationDelay: '60ms' }}>r</span>
                <span className="inline-block hover-letter" style={{ animationDelay: '90ms' }}>s</span>
                <span className="inline-block hover-letter" style={{ animationDelay: '120ms' }}>e</span>
                <span className="inline-block"> </span>
                <span className="inline-block hover-letter" style={{ animationDelay: '150ms' }}>P</span>
                <span className="inline-block hover-letter" style={{ animationDelay: '180ms' }}>r</span>
                <span className="inline-block hover-letter" style={{ animationDelay: '210ms' }}>o</span>
                <span className="inline-block"> </span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '240ms' }}>A</span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '270ms' }}>c</span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '300ms' }}>a</span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '330ms' }}>d</span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '360ms' }}>e</span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '390ms' }}>m</span>
                <span className="inline-block hover-letter text-nurse-red-500" style={{ animationDelay: '420ms' }}>y</span>
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="link-hover-line text-nurse-silver-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="glow-pulse bg-gradient-to-r from-nurse-red-600 to-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-nurse-red-700 hover:to-red-700 transition-all duration-200 hover:shadow-[0_0_30px_rgba(227,28,37,0.6)]"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,37,0.15),_transparent_50%)]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nurse-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-nurse-red-500/5 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="text-center">
              {/* Hero Logo - Large and Attention-Grabbing */}
              <div className="flex justify-center mb-10">
                <div className="relative group cursor-pointer">
                  {/* Soft glow behind logo */}
                  <div className="absolute inset-0 bg-nurse-red-500/20 blur-3xl scale-150 group-hover:bg-nurse-red-500/30 transition-all duration-500"></div>
                  {/* Logo */}
                  <Image
                    src="/logo.png"
                    alt="Nurse Pro Academy"
                    width={200}
                    height={200}
                    loading="lazy"
                    fetchPriority="low"
                    unoptimized
                    className="relative object-contain group-hover:scale-105 transition-transform duration-500"
                    style={{ filter: 'drop-shadow(0 0 30px rgba(227, 28, 37, 0.3))' }}
                  />
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                Learn Without
                <span className="italic font-bold" style={{
                  background: 'linear-gradient(135deg, #E31C25 0%, #ff6b6b 50%, #E31C25 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}> Limits</span>
              </h1>
              <p className="text-xl text-nurse-silver-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                Access world-class courses, interactive learning experiences, and personalized education
                tailored to your goals. Join thousands of learners transforming their careers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="glow-pulse shine-effect bg-gradient-to-r from-nurse-red-600 to-red-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-nurse-red-700 hover:to-red-700 transition-all duration-300 hover:shadow-[0_0_40px_rgba(227,28,37,0.7)] hover:scale-105 active:scale-95"
                >
                  Start Learning Today
                </Link>
                <Link
                  href="/login"
                  className="border-2 border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 hover:border-nurse-red-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(227,28,37,0.4)] hover:scale-105 active:scale-95"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-tilt hover-slide-up text-center p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-nurse-red-500/30 cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-r from-nurse-red-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-red group-hover:scale-110 hover-heartbeat transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 neon-text transition-all">Interactive Courses</h3>
              <p className="text-nurse-silver-400">Engage with video content, quizzes, and hands-on projects designed by industry experts.</p>
            </div>

            <div className="card-tilt hover-slide-up text-center p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-green-500/30 cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 hover-jello transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 neon-text transition-all">Learn at Your Pace</h3>
              <p className="text-nurse-silver-400">Flexible learning schedules with lifetime access to course materials and updates.</p>
            </div>

            <div className="card-tilt hover-slide-up text-center p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-nurse-silver-500/30 cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-r from-nurse-silver-500 to-nurse-silver-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 hover-wobble transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 neon-text transition-all">Community Support</h3>
              <p className="text-nurse-silver-400">Connect with fellow learners, share insights, and get help from instructors and peers.</p>
            </div>
          </div>
        </div>

        <NclexRegistrationCTA />

        {/* Stats Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-nurse-red-600 to-red-600" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.1),_transparent_70%)]" />

            <div className="relative p-12">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Join Our Growing Community</h2>
                <p className="text-xl text-white/80">Trusted by learners worldwide</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">10K+</div>
                  <div className="text-white/70">Active Students</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">500+</div>
                  <div className="text-white/70">Expert Instructors</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">1000+</div>
                  <div className="text-white/70">Courses Available</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">95%</div>
                  <div className="text-white/70">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/logo.png"
                  alt="Nurse Pro Academy"
                  width={40}
                  height={40}
                  loading="lazy"
                  fetchPriority="low"
                  unoptimized
                  className="rounded-lg"
                />
                <span className="ml-2 text-lg font-bold text-white">Nurse Pro Academy</span>
              </div>
              <p className="text-nurse-silver-400">
                Empowering learners worldwide with quality education and innovative learning experiences.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Platform</h3>
              <ul className="space-y-2 text-nurse-silver-400">
                <li><a href="#" className="hover:text-white transition">Courses</a></li>
                <li><a href="#" className="hover:text-white transition">Instructors</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2 text-nurse-silver-400">
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition">System Status</a></li>
                <li><a href="#" className="hover:text-white transition">Feedback</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-nurse-silver-400">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-nurse-silver-500">
            <p>&copy; 2024 Nurse Pro Academy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

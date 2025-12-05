'use client';

import Link from 'next/link';
import { Shield, Users, BookOpen, Database, BarChart, Settings } from 'lucide-react';

export default function AdminWelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-black text-white">
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/30 to-emerald-600/20 blur-3xl" />

      <div className="relative">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold">Nurse Pro Academy</span>
              <span className="text-sm text-emerald-400 font-semibold">Admin Portal</span>
            </div>
            <Link
              href="/admin/login"
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-8 shadow-lg shadow-emerald-500/50">
              <Shield className="w-10 h-10" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Admin Command Center
            </h1>
            
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Manage your learning platform, oversee students, create courses, and build comprehensive question banks—all from one powerful dashboard.
            </p>

            <div className="flex gap-4 justify-center">
              <Link
                href="/admin/login"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 hover:scale-105"
              >
                Access Dashboard
              </Link>
              <Link
                href="/"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg transition-all border border-white/20"
              >
                Student Portal
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Student Management</h3>
              <p className="text-slate-400">
                Manage student accounts, enrollments, and track progress across all courses.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Course Builder</h3>
              <p className="text-slate-400">
                Create and manage courses with modules, chapters, quizzes, and multimedia content.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Q-Bank Manager</h3>
              <p className="text-slate-400">
                Build comprehensive question banks with flexible organization for any course type.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Analytics Dashboard</h3>
              <p className="text-slate-400">
                Track engagement, monitor performance, and gain insights into student learning.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Access Control</h3>
              <p className="text-slate-400">
                Manage enrollment requests, approve access, and control student permissions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Platform</h3>
              <p className="text-slate-400">
                Enterprise-grade security with role-based access and audit logging.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Ready to Manage Your Platform?</h2>
              <p className="text-slate-300 mb-6">
                Sign in to access the full admin dashboard and start managing your educational platform.
              </p>
              <Link
                href="/admin/login"
                className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/50"
              >
                Go to Admin Login
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-20">
          <div className="container mx-auto px-6 py-8 text-center text-slate-400">
            <p>© 2024 Nurse Pro Academy Admin Portal. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}


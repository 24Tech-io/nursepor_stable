'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FaceLogin from '@/components/auth/FaceLogin';
import { enrollFace, base64ToDescriptor } from '@/lib/face-recognition';

interface AccountOption {
  id: number;
  role: string;
  name: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin' | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceLoginEmail, setFaceLoginEmail] = useState('');
  const [multipleRoles, setMultipleRoles] = useState<AccountOption[] | null>(null);
  const router = useRouter();
  
  const handleRoleSelection = async (selectedRole: string) => {
    setIsLoading(true);
    setError('');
    setMultipleRoles(null); // Clear the multiple roles selector
    
    try {
      console.log('=== ROLE SELECTION LOGIN ===');
      console.log('Email:', email);
      console.log('Selected role:', selectedRole);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role: selectedRole, // Explicit role, not 'auto'
        }),
        credentials: 'include',
      });
      
      console.log('Role selection response status:', response.status);
      
      // Check for network errors (status 0)
      if (response.status === 0) {
        console.error('✗ Network error - Status 0 (CORS or network issue)');
        setError('Network error. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }
      
      // Parse JSON response
      let data: any = null;
      try {
        const responseText = await response.text();
        console.log('Role selection response text:', responseText);
        
        if (!responseText || responseText.trim() === '') {
          console.log('Empty response, redirecting to dashboard');
          window.location.replace('/student');
          return;
        }
        
        data = JSON.parse(responseText);
        console.log('Role selection response data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('Failed to parse role selection response:', parseError);
        // Try to redirect anyway
        window.location.replace('/student');
        return;
      }
      
      if (response.ok && data.user) {
        const redirectUrl = data.redirectUrl || (data.user.role === 'admin' ? '/admin' : '/student');
        console.log('✓ Role selection successful!');
        console.log('✓ User role:', data.user.role);
        console.log('✓ Redirect URL:', redirectUrl);
        console.log('✓ Redirecting NOW...');
        
        // Clear state
        setError('');
        
        // Store user data temporarily in sessionStorage
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        console.log('💾 User data stored in sessionStorage:', data.user);
        
        // Navigate to redirect URL
        console.log('=== EXECUTING ROLE SELECTION REDIRECT ===');
        console.log('Redirect URL:', redirectUrl);
        console.log('Cookie was set in response');
        
        setIsLoading(false);
        
        setTimeout(() => {
          console.log('Navigating to:', redirectUrl);
          window.location.href = redirectUrl;
        }, 300); // Increased delay to ensure cookie is set
        
        return;
      } else {
        console.error('✗ Role selection failed:', data?.message);
        setError(data?.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('✗ Role selection exception:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setError(error?.message || 'Failed to login with selected role');
      setIsLoading(false);
    } finally {
      // Ensure loading is set to false if we're still here
      if (window.location.pathname === '/login') {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== LOGIN ATTEMPT START ===');
      console.log('Email:', email);
      console.log('Password length:', password.length);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          role: role !== 'auto' ? role : undefined, // Only send role if not 'auto'
        }),
        credentials: 'include',
      });
      
      console.log('Login request sent with role:', role !== 'auto' ? role : 'auto (not sent)');

      console.log('Response status:', response.status);
      console.log('Response type:', response.type);
      console.log('Response URL:', response.url);
      
      // Check for network errors (status 0)
      if (response.status === 0) {
        console.error('✗ Network error - Status 0 (CORS or network issue)');
        setError('Network error. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }
      
      // Parse JSON response (API now returns JSON instead of redirect)
      let data: any = null;
      
      if (response.ok) {
        // Response is OK (200), try to parse as JSON
        try {
          const responseText = await response.text();
          console.log('Response text:', responseText);
          
          // Check if response is empty or HTML (might be a redirect that wasn't caught)
          if (!responseText || responseText.trim() === '' || responseText.trim().startsWith('<!')) {
            console.log('Response appears to be empty or HTML, treating as redirect');
            const redirectUrl = '/student';
            window.location.replace(redirectUrl);
            return;
          }
          
          data = JSON.parse(responseText);
          console.log('Response data:', JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          // If parsing fails, it might be a redirect - try to follow it
          console.log('Attempting to follow redirect...');
          const redirectUrl = '/student';
          window.location.replace(redirectUrl);
          return;
        }
        
        console.log('✓ Response OK - Login successful');
        
        // Check if multiple roles exist - show role selector
        if (data.hasMultipleRoles && data.accounts) {
          console.log('Multiple roles found:', data.accounts);
          setError(''); // Clear any errors
          setMultipleRoles(data.accounts);
          setIsLoading(false);
          return;
        }
        
        // Validate user data exists
        if (!data.user) {
          console.error('✗ No user data in response:', data);
          setError('Login successful but user data missing');
          setIsLoading(false);
          return;
        }
        
        console.log('User data:', data.user);
        console.log('User role:', data.user.role);
        
        // If user specified a role and it doesn't match, show error
        if (role !== 'auto' && data.user.role !== role) {
          setError(`This account is registered as ${data.user.role}, but you selected ${role}. Please select the correct role.`);
          setIsLoading(false);
          return;
        }
        
        // Determine redirect URL (use from response or calculate)
        const redirectUrl = data.redirectUrl || (data.user.role === 'admin' ? '/admin' : '/student');
        console.log('✓ Login successful!');
        console.log('✓ User role:', data.user.role);
        console.log('✓ Redirect URL:', redirectUrl);
        console.log('✓ Cookie was set in response');
        
        // Clear any error state
        setError('');
        setMultipleRoles(null);
        setIsLoading(false);
        
        // Store user data temporarily in sessionStorage for immediate use
        // This ensures the dashboard has data even if cookie isn't ready yet
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        console.log('💾 User data stored in sessionStorage:', data.user);
        
        // Navigate to redirect URL
        // Longer delay to ensure cookie is processed by browser
        console.log('=== EXECUTING REDIRECT ===');
        console.log('Redirect URL:', redirectUrl);
        console.log('Current pathname:', window.location.pathname);
        
        setTimeout(() => {
          console.log('Navigating to:', redirectUrl);
          window.location.href = redirectUrl;
        }, 300); // Increased delay to ensure cookie is set
        
        return;
        
      } else {
        // Error response - try to parse error message
        try {
          const responseText = await response.text();
          if (responseText) {
            data = JSON.parse(responseText);
          }
        } catch (e) {
          // Ignore parse errors for error responses
        }
        
        console.error('✗ Login failed - Status:', response.status);
        console.error('Error message:', data?.message);
        setError(data?.message || `Login failed (Status: ${response.status})`);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('✗ EXCEPTION during login:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setError(error?.message || 'Network error. Please try again.');
      setIsLoading(false);
    } finally {
      // Ensure loading is set to false if we're still here
      // (redirect should have happened, but just in case)
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

          {/* Multiple Roles Selector */}
          {multipleRoles && multipleRoles.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-indigo-200">Multiple Accounts Found</h3>
                  <p className="text-sm text-indigo-300/80">You have multiple accounts with this email. Please select which account to login with:</p>
                </div>
              </div>
              <div className="space-y-2">
                {multipleRoles.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleRoleSelection(account.role)}
                    disabled={isLoading}
                    className="w-full p-4 rounded-xl border border-indigo-400/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-indigo-200 capitalize">{account.role} Account</p>
                        <p className="text-xs text-indigo-300/70">{account.name}</p>
                      </div>
                      <svg className="h-5 w-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMultipleRoles(null)}
                className="text-sm text-indigo-300/70 hover:text-indigo-200 underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && !multipleRoles && (
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
        </form>
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
                        }),
                      });

                      const data = await response.json();
                      if (response.ok) {
                        if (data.user.role === 'admin') {
                          router.push('/admin');
                        } else {
                          router.push('/student');
                        }
                      } else {
                        setError(data.message || 'Face login failed');
                      }
                    } catch (err) {
                      setError('Network error. Please try again.');
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

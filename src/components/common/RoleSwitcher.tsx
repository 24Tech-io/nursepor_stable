'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Account {
  id: number;
  role: string;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function RoleSwitcher() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fetch current user and all accounts
    const fetchData = async () => {
      try {
        // Get current user
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user);

          // Fetch all accounts for this email
          const accountsResponse = await fetch('/api/auth/get-roles', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: userData.user.email }),
            credentials: 'include',
          });

          if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            if (process.env.NODE_ENV === 'development') {
            console.log('RoleSwitcher - Accounts received:', accountsData);
            }
            if (accountsData.accounts) {
              setAccounts(accountsData.accounts);
            }
          } else {
            const errorData = await accountsResponse.json().catch(() => ({}));
            console.error('RoleSwitcher - Failed to fetch accounts:', accountsResponse.status, errorData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchData();
  }, []);

  const handleSwitchRole = async (targetRole: string) => {
    if (!currentUser || targetRole === currentUser.role) {
      setShowSwitcher(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: targetRole }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || window.location.origin;

        if (data.user.role === 'admin') {
          window.location.href = `${adminUrl}/admin/dashboard`;
        } else {
          router.push('/student/dashboard');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to switch role');
      }
    } catch (error) {
      console.error('Role switch error:', error);
      alert('Failed to switch role. Please try again.');
    } finally {
      setIsLoading(false);
      setShowSwitcher(false);
    }
  };

  // Show loading state
  if (!currentUser) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-400/50 text-sm font-semibold text-white shadow-lg animate-pulse border-2 border-gray-400/30">
        <div className="h-4 w-4 rounded-full bg-white/30"></div>
        <div className="h-4 w-20 bg-white/30 rounded"></div>
      </div>
    );
  }

  const otherAccount = accounts.find((acc) => acc.role !== currentUser.role);
  const hasMultipleAccounts = accounts.length > 1;
  const isAdmin = currentUser.role === 'admin';

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
  console.log('RoleSwitcher - Current user:', currentUser);
  console.log('RoleSwitcher - Accounts:', accounts);
  console.log('RoleSwitcher - Has multiple accounts:', hasMultipleAccounts);
  console.log('RoleSwitcher - Other account:', otherAccount);
  }

  return (
    <div className="relative">
      <button
        onClick={() => hasMultipleAccounts && setShowSwitcher(!showSwitcher)}
        disabled={isLoading || !hasMultipleAccounts}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-bold text-white shadow-xl border-2 ${hasMultipleAccounts
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 cursor-pointer border-indigo-400/50 hover:border-indigo-300 hover:shadow-2xl hover:scale-105'
          : 'bg-gray-500/80 cursor-not-allowed opacity-80 border-gray-400/30'
          } disabled:opacity-50`}
        title={hasMultipleAccounts ? `Switch to ${otherAccount?.role || ''} account` : 'Only one account available'}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <span className="capitalize">{currentUser.role}</span>
        {hasMultipleAccounts && (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {!hasMultipleAccounts && (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        )}
      </button>

      {showSwitcher && hasMultipleAccounts && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSwitcher(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-gray-200 shadow-xl z-50 overflow-hidden">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <p className="text-xs font-semibold">Switch Account</p>
            </div>
            <div className="p-1.5">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSwitchRole(account.role)}
                  disabled={isLoading || account.role === currentUser.role}
                  className={`w-full px-3 py-2 rounded-md text-left transition-all mb-1 ${account.role === currentUser.role
                    ? 'bg-indigo-50 border border-indigo-500 text-indigo-700 cursor-default'
                    : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${account.role === 'admin'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-blue-100 text-blue-600'
                        }`}>
                        {account.role === 'admin' ? (
                          <svg
                            className="w-4 h-4"
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
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold capitalize">{account.role}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">
                          {account.name}
                        </p>
                      </div>
                    </div>
                    {account.role === currentUser.role && (
                      <svg
                        className="h-4 w-4 text-indigo-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {account.role !== currentUser.role && !isLoading && (
                      <svg
                        className="h-4 w-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

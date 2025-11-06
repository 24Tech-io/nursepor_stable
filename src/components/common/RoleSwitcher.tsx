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
            if (accountsData.accounts && accountsData.accounts.length > 1) {
              setAccounts(accountsData.accounts);
            }
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
        // Redirect to appropriate dashboard
        const redirectUrl = data.user.role === 'admin' ? '/admin/students' : '/student/dashboard';
        window.location.href = redirectUrl; // Use window.location for full page reload
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

  // Don't show switcher if user only has one account or user data not loaded
  if (!currentUser || accounts.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSwitcher(!showSwitcher)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-400/30 hover:bg-indigo-500/20 transition-all text-sm font-medium text-indigo-200"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="capitalize">{currentUser.role}</span>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showSwitcher && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSwitcher(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">Switch Account</p>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSwitchRole(account.role)}
                  disabled={isLoading || account.role === currentRole}
                  className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                    account.role === currentUser.role
                      ? 'bg-indigo-500/20 text-indigo-200 cursor-default'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{account.role}</p>
                      <p className="text-xs text-slate-400">{account.name}</p>
                    </div>
                    {account.role === currentUser.role && (
                      <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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


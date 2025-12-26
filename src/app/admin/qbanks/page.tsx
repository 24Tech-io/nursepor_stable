'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface QBank {
  id: number;
  name: string;
  description: string | null;
  instructor: string | null;
  status: string;
  totalQuestions: number | null;
  enrolledCount: number;
  pendingRequests: number;
  isPublic: boolean;
  isRequestable: boolean;
  pricing: number;
  createdAt: string;
}

export default function AdminQBanksPage() {
  const [qbanks, setQbanks] = useState<QBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchQBanks();
  }, []);

  const fetchQBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/qbanks', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Q-Banks');
      }

      const data = await response.json();
      setQbanks(data.qbanks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteQBank = async (id: number) => {
    if (!confirm('Are you sure you want to delete this Q-Bank? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/qbanks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete Q-Bank');
      }

      fetchQBanks();
    } catch (err: any) {
      alert('Error deleting Q-Bank: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Q-Bank Management</h1>
            <p className="text-gray-600 mt-2">Manage question banks and access requests</p>
          </div>
          <Link
            href="/admin/qbanks/create"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Create Q-Bank
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Q-Banks</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{qbanks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Published</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {qbanks.filter(q => q.status === 'published').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Questions</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {qbanks.reduce((sum, q) => sum + (q.totalQuestions || 0), 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Enrollments</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {qbanks.reduce((sum, q) => sum + q.enrolledCount, 0)}
            </div>
          </div>
        </div>

        {/* Q-Banks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {qbanks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No Q-Banks found. Create your first Q-Bank to get started.
                  </td>
                </tr>
              ) : (
                qbanks.map((qbank) => (
                  <tr key={qbank.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{qbank.name}</div>
                      {qbank.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {qbank.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          qbank.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : qbank.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {qbank.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {qbank.totalQuestions || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {qbank.enrolledCount}
                      {qbank.pendingRequests > 0 && (
                        <span className="ml-2 text-orange-600">
                          ({qbank.pendingRequests} pending)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {qbank.isPublic ? (
                        <span className="text-green-600">Public</span>
                      ) : qbank.isRequestable ? (
                        <span className="text-orange-600">Requestable</span>
                      ) : (
                        <span className="text-gray-600">Private</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <Link
                        href={`/admin/qbanks/${qbank.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/qbanks/${qbank.id}/questions`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Questions
                      </Link>
                      <Link
                        href={`/admin/qbanks/${qbank.id}/analytics`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Analytics
                      </Link>
                      <button
                        onClick={() => deleteQBank(qbank.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Request Management Link */}
        <div className="mt-8">
          <Link
            href="/admin/qbank-requests"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
          >
            Manage Access Requests →
          </Link>
        </div>
      </div>
    </div>
  );
}


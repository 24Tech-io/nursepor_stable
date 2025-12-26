'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Request {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  qbankId: number;
  qbankName: string;
  reason: string | null;
  status: string;
  requestedAt: string;
}

export default function AdminQBankRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/admin/qbank-requests'
        : `/api/admin/qbank-requests?status=${filter}`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(`/api/admin/qbank-requests/${requestId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      fetchRequests();
    } catch (err: any) {
      alert('Error approving request: ' + err.message);
    }
  };

  const handleReject = async (requestId: number, reason?: string) => {
    const rejectionReason = reason || prompt('Enter rejection reason (optional):') || undefined;

    try {
      const response = await fetch(`/api/admin/qbank-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      fetchRequests();
    } catch (err: any) {
      alert('Error rejecting request: ' + err.message);
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Q-Bank Access Requests</h1>
            <p className="text-gray-600 mt-2">Review and manage student access requests</p>
          </div>
          <Link
            href="/admin/qbanks"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Q-Banks
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'pending' && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      {requests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No {filter === 'all' ? '' : filter} requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{request.qbankName}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'pending'
                            ? 'bg-orange-100 text-orange-800'
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Student:</strong> {request.studentName} ({request.studentEmail})
                    </div>
                    {request.reason && (
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-2">
                        <strong>Reason:</strong> {request.reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Requested: {new Date(request.requestedAt).toLocaleString()}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex space-x-3 ml-4">
                      <button
                        onClick={() => handleApprove(request.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


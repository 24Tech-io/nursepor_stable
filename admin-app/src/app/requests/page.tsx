'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock, XCircle, Filter, Search } from 'lucide-react';

interface AccessRequest {
    id: number;
    studentId: number;
    studentName: string;
    studentEmail: string;
    courseId: number;
    courseTitle: string;
    reason: string | null;
    status: string;
    requestedAt: string;
    reviewedAt: string | null;
}

export default function RequestsPage() {
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<AccessRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchRequests();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [requests, filter, searchTerm]);

    const fetchRequests = async () => {
        try {
            const response = await fetch('/api/admin/requests', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setRequests(data.requests || []);
            } else if (response.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = requests;

        if (filter !== 'all') {
            filtered = filtered.filter(req => req.status === filter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(req =>
                req.studentName.toLowerCase().includes(term) ||
                req.studentEmail.toLowerCase().includes(term) ||
                req.courseTitle.toLowerCase().includes(term)
            );
        }

        setFilteredRequests(filtered);
    };

    const handleApprove = async (requestId: number) => {
        if (!confirm('Approve this access request? Student will immediately gain access to the course.')) {
            return;
        }

        setProcessingId(requestId);
        try {
            const response = await fetch(`/api/admin/requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'approve' })
            });

            if (response.ok) {
                await fetchRequests(); // Refresh list
                alert('Request approved successfully!');
            } else {
                const data = await response.json();
                alert(`Failed to approve request: ${data.message}`);
            }
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Failed to approve request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeny = async (requestId: number) => {
        if (!confirm('Deny this access request? The student will be notified of the rejection.')) {
            return;
        }

        setProcessingId(requestId);
        try {
            const response = await fetch(`/api/admin/requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'deny' })
            });

            if (response.ok) {
                await fetchRequests(); // Refresh list
                alert('Request denied');
            } else {
                const data = await response.json();
                alert(`Failed to deny request: ${data.message}`);
            }
        } catch (error) {
            console.error('Error denying request:', error);
            alert('Failed to deny request');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                        <Clock size={12} />
                        Pending
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                        <CheckCircle size={12} />
                        Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                        <XCircle size={12} />
                        Denied
                    </span>
                );
            default:
                return null;
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0b14] p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Course Access Requests</h1>
                    <p className="text-slate-400">Manage student course access requests</p>
                    {pendingCount > 0 && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <AlertCircle className="text-yellow-400" size={20} />
                            <span className="text-yellow-400 font-semibold">{pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search by student or course..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[#1a1d26] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2">
                            {['all', 'pending', 'approved', 'rejected'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status as any)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${filter === status
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-[#1a1d26] text-slate-400 hover:bg-slate-800'
                                        }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Requests List */}
                <div className="space-y-4">
                    {filteredRequests.length === 0 ? (
                        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-12 text-center">
                            <AlertCircle className="mx-auto mb-4 text-slate-600" size={48} />
                            <p className="text-slate-400 text-lg">No requests found</p>
                        </div>
                    ) : (
                        filteredRequests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 hover:border-purple-500/30 transition-colors"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{request.studentName}</h3>
                                            {getStatusBadge(request.status)}
                                        </div>
                                        <p className="text-slate-400 text-sm mb-1">{request.studentEmail}</p>
                                        <p className="text-purple-400 font-semibold mb-2">→ {request.courseTitle}</p>
                                        {request.reason && (
                                            <div className="mt-3 p-3 bg-[#1a1d26] rounded-lg border border-slate-800/40">
                                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Reason</p>
                                                <p className="text-slate-300 text-sm">{request.reason}</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-600 mt-2">
                                            Requested {new Date(request.requestedAt).toLocaleString()}
                                        </p>
                                        {request.reviewedAt && (
                                            <p className="text-xs text-slate-600">
                                                Reviewed {new Date(request.reviewedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {request.status === 'pending' && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApprove(request.id)}
                                                disabled={processingId === request.id}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processingId === request.id ? 'Processing...' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleDeny(request.id)}
                                                disabled={processingId === request.id}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

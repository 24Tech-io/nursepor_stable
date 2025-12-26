'use client';

import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    Card, CardContent, CardHeader, CardTitle,
    Badge, Button
} from '@/components/ui';
// We'll use standard HTML/Tailwind since we might not have all UI library components installed
import { Search, Download, Eye, FileText, RefreshCw } from 'lucide-react';

interface NursingCandidate {
    id: number;
    referenceNumber: string;
    personalDetails: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    targetCountry: string;
    nclexHistory: {
        hasTakenBefore: string;
        attempts: any[];
    };
    createdAt: string;
    documentEmailStatus: string;
}

export default function NursingCandidateList({ nav }: { nav: (mod: string) => void }) {
    const [candidates, setCandidates] = useState<NursingCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCandidates = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/nursing-candidates', {
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                const data = await response.json();
                setCandidates(data.submissions || []);
            }
        } catch (error) {
            console.error('Failed to fetch candidates', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const filteredCandidates = candidates.filter(c =>
        c.personalDetails.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.personalDetails.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.personalDetails.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-8 border-b border-slate-800/50 bg-[#0b0d12]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Nursing Registrations</h1>
                        <p className="text-slate-400 mt-2">Manage NCLEX candidate applications and documents.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchCandidates}
                            className="flex items-center gap-2 px-4 py-2 bg-[#161922] text-slate-300 rounded-lg hover:bg-[#1c202b] transition-colors border border-slate-800"
                        >
                            <RefreshCw size={16} />
                            <span>Refresh</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium">
                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email or reference..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#161922] border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                ) : (
                    <div className="bg-[#161922] rounded-2xl border border-slate-800/50 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1c202b] text-slate-400 font-medium border-b border-slate-800/50">
                                <tr>
                                    <th className="p-4 pl-6">Reference</th>
                                    <th className="p-4">Candidate Name</th>
                                    <th className="p-4">Target Country</th>
                                    <th className="p-4">Email Status</th>
                                    <th className="p-4">Submitted</th>
                                    <th className="p-4 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredCandidates.length > 0 ? (
                                    filteredCandidates.map((candidate) => (
                                        <tr key={candidate.id} className="hover:bg-[#1c202b]/50 transition-colors group">
                                            <td className="p-4 pl-6 font-mono text-purple-400">
                                                {candidate.referenceNumber}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-white">
                                                    {candidate.personalDetails.firstName} {candidate.personalDetails.lastName}
                                                </div>
                                                <div className="text-xs text-slate-500">{candidate.personalDetails.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${candidate.targetCountry === 'USA'
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : candidate.targetCountry === 'Australia'
                                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {candidate.targetCountry || 'Canada'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${candidate.documentEmailStatus === 'sent'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : candidate.documentEmailStatus === 'failed'
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                    }`}>
                                                    {candidate.documentEmailStatus === 'sent' ? 'Sent' :
                                                        candidate.documentEmailStatus === 'failed' ? 'Failed' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500">
                                                {new Date(candidate.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <button className="text-slate-400 hover:text-white p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            No submissions found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

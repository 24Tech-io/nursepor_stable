'use client';

import { useEffect, useState } from 'react';
import { FileText, Eye, Globe, Calendar, User } from 'lucide-react';
import type { NursingCandidateFormPayload } from '@/types/nursing-candidate';

interface RegistrationSubmission {
  id: number;
  referenceNumber: string;
  country: 'USA' | 'Canada' | 'Australia';
  personalDetails: NursingCandidateFormPayload['personalDetails'];
  educationDetails: NursingCandidateFormPayload['educationDetails'];
  registrationDetails: NursingCandidateFormPayload['registrationDetails'];
  employmentHistory: NursingCandidateFormPayload['employmentHistory'];
  canadaEmploymentHistory: NursingCandidateFormPayload['canadaEmploymentHistory'];
  canadianImmigrationApplied?: 'Yes' | 'No';
  documentChecklistAcknowledged: boolean;
  documentEmailStatus: string;
  createdAt: string;
}

export default function RegistrationsView() {
  const [submissions, setSubmissions] = useState<RegistrationSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<RegistrationSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState<'all' | 'USA' | 'Canada' | 'Australia'>('all');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/nursing-candidates', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubmissions = filterCountry === 'all' 
    ? submissions 
    : submissions.filter(s => s.country === filterCountry);

  const getCountryColor = (country: string) => {
    switch (country) {
      case 'Canada': return 'bg-blue-500/20 border-blue-400/60 text-blue-200';
      case 'USA': return 'bg-red-500/20 border-red-400/60 text-red-200';
      case 'Australia': return 'bg-yellow-500/20 border-yellow-400/60 text-yellow-200';
      default: return 'bg-slate-500/20 border-slate-400/60 text-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 overflow-y-auto h-full flex items-center justify-center">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Registration Form Submissions</h2>
          <p className="text-slate-400 mt-2 text-sm">
            View and manage all NCLEX-RN registration form submissions
          </p>
        </div>
      </header>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-slate-300 font-semibold">Filter by Country:</label>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value as any)}
          className="px-4 py-2 rounded-lg bg-[#161922] border border-slate-800/60 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
        >
          <option value="all">All Countries</option>
          <option value="Canada">Canada</option>
          <option value="USA">USA</option>
          <option value="Australia">Australia</option>
        </select>
        <span className="text-slate-400">
          {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-8 text-center">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No submissions found</p>
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-white">
                      {submission.referenceNumber}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCountryColor(submission.country)}`}>
                      <Globe className="w-3 h-3 inline mr-1" />
                      {submission.country}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4" />
                      <span>
                        {submission.personalDetails?.firstName} {submission.personalDetails?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(submission.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Email: {submission.personalDetails?.email}
                    </div>
                    <div className="text-slate-400">
                      Phone: {submission.personalDetails?.phoneNumber}
                    </div>
                    {submission.country === 'Canada' && submission.canadianImmigrationApplied && (
                      <div className="text-slate-400">
                        Canadian Immigration: {submission.canadianImmigrationApplied}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubmission(submission)}
                  className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 max-w-5xl max-h-[90vh] overflow-y-auto w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedSubmission.referenceNumber}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getCountryColor(selectedSubmission.country)}`}>
                  {selectedSubmission.country}
                </span>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-6">
              {/* Personal Details */}
              <div className="border border-slate-800/60 rounded-xl p-4 bg-[#0b0d12]/50">
                <h3 className="text-lg font-semibold text-white mb-4">Personal Details</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white ml-2">
                      {selectedSubmission.personalDetails?.firstName} {selectedSubmission.personalDetails?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white ml-2">{selectedSubmission.personalDetails?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-white ml-2">{selectedSubmission.personalDetails?.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Date of Birth:</span>
                    <span className="text-white ml-2">{selectedSubmission.personalDetails?.dateOfBirth}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Gender:</span>
                    <span className="text-white ml-2">{selectedSubmission.personalDetails?.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Place of Birth:</span>
                    <span className="text-white ml-2">{selectedSubmission.personalDetails?.placeOfBirth}</span>
                  </div>
                  {selectedSubmission.country === 'Canada' && selectedSubmission.canadianImmigrationApplied && (
                    <div className="md:col-span-2">
                      <span className="text-slate-400">Canadian Immigration Applied:</span>
                      <span className="text-white ml-2">{selectedSubmission.canadianImmigrationApplied}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Employment History */}
              <div className="border border-slate-800/60 rounded-xl p-4 bg-[#0b0d12]/50">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Employment History ({selectedSubmission.country === 'Canada' ? 'Canada' : selectedSubmission.country})
                </h3>
                {selectedSubmission.country === 'Canada' ? (
                  <div className="space-y-4">
                    {selectedSubmission.canadaEmploymentHistory?.map((entry: any, index: number) => (
                      entry.employer && (
                        <div key={index} className="bg-[#161922] rounded-lg p-3">
                          <div className="grid md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-slate-400">Employer:</span> <span className="text-white">{entry.employer}</span></div>
                            <div><span className="text-slate-400">Position:</span> <span className="text-white">{entry.position}</span></div>
                            <div><span className="text-slate-400">Employment Type:</span> <span className="text-white">{entry.employmentType}</span></div>
                            <div><span className="text-slate-400">Hours/Month:</span> <span className="text-white">{entry.hoursPerMonth}</span></div>
                            <div><span className="text-slate-400">From:</span> <span className="text-white">{entry.dates?.from}</span></div>
                            <div><span className="text-slate-400">To:</span> <span className="text-white">{entry.dates?.to}</span></div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSubmission.employmentHistory?.map((entry: any, index: number) => (
                      entry.employer && (
                        <div key={index} className="bg-[#161922] rounded-lg p-3">
                          <div className="grid md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-slate-400">Employer:</span> <span className="text-white">{entry.employer}</span></div>
                            <div><span className="text-slate-400">Position:</span> <span className="text-white">{entry.position}</span></div>
                            <div><span className="text-slate-400">From:</span> <span className="text-white">{entry.dates?.from}</span></div>
                            <div><span className="text-slate-400">To:</span> <span className="text-white">{entry.dates?.to}</span></div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Education Details - can be expanded */}
              <div className="border border-slate-800/60 rounded-xl p-4 bg-[#0b0d12]/50">
                <h3 className="text-lg font-semibold text-white mb-4">Education Details</h3>
                <div className="text-sm text-slate-400">
                  <p>BSc Nursing: {selectedSubmission.educationDetails?.bsc?.institutionName || 'N/A'}</p>
                  <p>GNM: {selectedSubmission.educationDetails?.gnm?.institutionName || 'N/A'}</p>
                  <p>Plus Two: {selectedSubmission.educationDetails?.plusTwo?.institutionName || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


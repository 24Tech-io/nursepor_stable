'use client';

import { useEffect, useMemo, useState } from 'react';

interface CandidateSubmission {
  id: number;
  referenceNumber: string;
  personalDetails: any;
  registrationDetails: any;
  educationDetails: any;
  employmentHistory: any[];
  canadaEmploymentHistory: any[];
  documentChecklistAcknowledged: boolean;
  disciplinaryAction: string;
  documentEmailStatus: string;
  documentEmailError?: string | null;
  createdAt?: string;
}

type TabKey = 'responses' | 'checklist';

export default function NursingCandidatesPage() {
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<CandidateSubmission | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('responses');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/nursing-candidates', { credentials: 'include' });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.message || 'Failed to load submissions');
        }
        setSubmissions(result.submissions || []);
        if ((result.submissions || []).length > 0) {
          setSelectedSubmission(result.submissions[0]);
        }
      } catch (err: any) {
        setError(err?.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const stats = useMemo(() => {
    const total = submissions.length;
    const pendingEmail = submissions.filter((item) => item.documentEmailStatus === 'pending' || item.documentEmailStatus === 'failed').length;
    const acknowledged = submissions.filter((item) => item.documentChecklistAcknowledged).length;
    return { total, pendingEmail, acknowledged };
  }, [submissions]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl shadow-xl border border-white/10 p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-indigo-500 font-semibold mb-2">Admin &gt; Nursing Candidates</p>
            <h1 className="text-3xl font-bold text-slate-900">NCLEX-RN Form Responses</h1>
            <p className="text-slate-500 mt-1">Review and manage submissions captured directly from the public homepage.</p>
          </div>
        </div>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-500 font-semibold">Total Submissions</p>
            <p className="text-3xl font-bold text-indigo-900 mt-2">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm text-amber-500 font-semibold">Pending Email Follow-ups</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">{stats.pendingEmail}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-500 font-semibold">Document Acknowledged</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2">{stats.acknowledged}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl border border-white/10">
        <div className="flex border-b border-slate-100">
          {[
            { key: 'responses', label: 'Form Responses' },
            { key: 'checklist', label: 'Document Checklist' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`px-6 py-4 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => setActiveTab(tab.key as TabKey)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-slate-500">Fetching submissions…</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700">
              {error}
            </div>
          ) : activeTab === 'checklist' ? (
            <div className="space-y-4 text-slate-600">
              <p className="text-lg font-semibold text-slate-900">Document Submission Instructions</p>
              <p>
                Candidates are reminded on the public form to email the following documents to{' '}
                <span className="font-semibold text-indigo-600">nurses@nurseproacademy.ca</span>. Use this checklist during reviews.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>All nursing mark lists and transcripts</li>
                <li>All nursing registration/licence documents</li>
                <li>Affidavit for any name change (if applicable)</li>
                <li>10th and Plus Two certificates</li>
                <li>Passport</li>
              </ul>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-2xl font-semibold text-slate-900 mb-2">No submissions yet</p>
              <p className="text-slate-500">Once students complete the public form, their data will appear here.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {submissions.map((submission) => (
                  <button
                    key={submission.id}
                    onClick={() => setSelectedSubmission(submission)}
                    className={`w-full text-left p-4 rounded-2xl border transition ${
                      selectedSubmission?.id === submission.id
                        ? 'border-indigo-200 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-mono">{submission.referenceNumber}</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {submission.personalDetails?.firstName} {submission.personalDetails?.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{submission.personalDetails?.email}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          submission.documentEmailStatus === 'sent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : submission.documentEmailStatus === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        Email {submission.documentEmailStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Submitted: {new Date(submission.createdAt || '').toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>

              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50">
                {selectedSubmission ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500 font-mono">{selectedSubmission.referenceNumber}</p>
                      <h3 className="text-xl font-bold text-slate-900">
                        {selectedSubmission.personalDetails?.firstName} {selectedSubmission.personalDetails?.lastName}
                      </h3>
                      <p className="text-sm text-slate-500">{selectedSubmission.personalDetails?.email}</p>
                      <p className="text-sm text-slate-500">{selectedSubmission.personalDetails?.phoneNumber}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <h4 className="text-base font-semibold text-slate-900">Identity</h4>
                      <p><span className="font-semibold">DOB:</span> {selectedSubmission.personalDetails?.dateOfBirth}</p>
                      <p><span className="font-semibold">Address:</span> {selectedSubmission.personalDetails?.address}</p>
                      <p><span className="font-semibold">Disciplinary history:</span> {selectedSubmission.disciplinaryAction}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <h4 className="text-base font-semibold text-slate-900">Latest Education</h4>
                      <p>
                        <span className="font-semibold">MSc / Degree:</span>{' '}
                        {selectedSubmission.educationDetails?.msc?.institutionName || 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">BSc / Degree:</span>{' '}
                        {selectedSubmission.educationDetails?.bsc?.institutionName || 'N/A'}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <h4 className="text-base font-semibold text-slate-900">Employment Snapshot</h4>
                      {selectedSubmission.employmentHistory?.slice(0, 2).map((role, index) => (
                        <p key={index}>
                          <span className="font-semibold">{role.employer || 'N/A'}</span> – {role.position || 'N/A'}
                        </p>
                      ))}
                    </div>

                    {selectedSubmission.documentEmailError && (
                      <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
                        Email error: {selectedSubmission.documentEmailError}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-slate-500">Select a submission to view details.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


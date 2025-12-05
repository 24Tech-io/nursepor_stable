'use client';

import { useState, useEffect } from 'react';
import { Download, Award, Calendar, CheckCircle, Share2, ExternalLink } from 'lucide-react';
import LoadingSpinner from '@/components/student/LoadingSpinner';

interface Certificate {
  id: number;
  userId: number;
  courseId: number;
  courseName: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string | null;
  grade: string | null;
  credentialUrl: string | null;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/certificates', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (certId: number) => {
    try {
      const response = await fetch(`/api/student/certificates/${certId}/download`, {
        credentials: 'include',
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
    }
  };

  const handleShare = (cert: Certificate) => {
    if (navigator.share) {
      navigator.share({
        title: 'My Certificate',
        text: `I earned a certificate for ${cert.courseName}!`,
        url: cert.credentialUrl || window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      const url = cert.credentialUrl || `${window.location.origin}/verify/${cert.certificateNumber}`;
      navigator.clipboard.writeText(url);
      alert('Certificate link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Award size={36} className="text-yellow-400" />
            <h1 className="text-4xl font-extrabold text-white">My Certificates</h1>
          </div>
          <p className="text-purple-200">Your achievements and course completions</p>
        </div>

        {certificates.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <Award size={64} className="text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Certificates Yet</h2>
            <p className="text-purple-200 mb-6">
              Complete a course to earn your first certificate!
            </p>
            <a
              href="/student/courses"
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
            >
              Browse Courses
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-purple-500/50 transition-all hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
                onClick={() => setSelectedCert(cert)}
              >
                {/* Certificate Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-xl">
                    <Award size={32} className="text-white" />
                  </div>
                  <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-sm text-green-400 font-semibold">Verified</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                  {cert.courseName}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-purple-200">
                    <Calendar size={16} />
                    <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                  </div>
                  {cert.grade && (
                    <div className="text-sm text-purple-200">
                      <span className="font-semibold">Grade:</span> {cert.grade}
                    </div>
                  )}
                  <div className="text-xs text-purple-300 font-mono bg-white/5 px-2 py-1 rounded">
                    #{cert.certificateNumber}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(cert.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(cert);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certificate Detail Modal */}
        {selectedCert && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCert(null)}
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Award size={40} className="text-yellow-400" />
                  <h2 className="text-2xl font-bold text-white">Certificate Details</h2>
                </div>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="text-white/60 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">{selectedCert.courseName}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-purple-300 mb-1">Certificate Number</div>
                    <div className="text-white font-mono font-semibold">
                      {selectedCert.certificateNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-purple-300 mb-1">Issue Date</div>
                    <div className="text-white font-semibold">
                      {new Date(selectedCert.issueDate).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedCert.grade && (
                    <div>
                      <div className="text-sm text-purple-300 mb-1">Grade</div>
                      <div className="text-white font-semibold">{selectedCert.grade}</div>
                    </div>
                  )}
                  {selectedCert.expiryDate && (
                    <div>
                      <div className="text-sm text-purple-300 mb-1">Expires On</div>
                      <div className="text-white font-semibold">
                        {new Date(selectedCert.expiryDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(selectedCert.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
                >
                  <Download size={20} />
                  Download PDF
                </button>
                <button
                  onClick={() => handleShare(selectedCert)}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  <Share2 size={20} />
                  Share
                </button>
                {selectedCert.credentialUrl && (
                  <a
                    href={selectedCert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition"
                  >
                    <ExternalLink size={20} />
                    Verify
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import StatisticsTab from '@/components/qbank/StatisticsTab';
import PreviousTestsTab from '@/components/qbank/PreviousTestsTab';
import RemediationTab from '@/components/qbank/RemediationTab';
import CreateTestModal from '@/components/qbank/CreateTestModal';

type TabType = 'statistics' | 'previous-tests' | 'remediation' | 'notes';

export default function QBankPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [course, setCourse] = useState<any>(null);
  const [questionBank, setQuestionBank] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  async function fetchCourseData() {
    try {
      setIsLoading(true);
      
      // First ensure question bank exists
      await fetch(`/api/qbank/${courseId}/ensure`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const [courseResponse, qbankResponse] = await Promise.all([
        fetch(`/api/student/courses/${courseId}`, { credentials: 'include' }),
        fetch(`/api/qbank/${courseId}`, { credentials: 'include' }),
      ]);

      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourse(courseData.course);
      }

      if (qbankResponse.ok) {
        const qbankData = await qbankResponse.json();
        setQuestionBank(qbankData.questionBank);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading Q-Bank..." fullScreen />;
  }

  const tabs = [
    { id: 'statistics' as TabType, name: 'Statistics', icon: '📊' },
    { id: 'previous-tests' as TabType, name: 'Previous Tests', icon: '📝' },
    { id: 'remediation' as TabType, name: 'Remediation', icon: '🔄' },
    { id: 'notes' as TabType, name: 'Notes', icon: '📄' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Course Info */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Q-Bank</h1>
                <p className="text-sm text-gray-500">Expires in 37 days</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                JS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Actions Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex items-center space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-6 py-4 text-sm font-medium transition-all
                    ${activeTab === tab.id
                      ? 'text-gray-900 bg-white border-b-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3 py-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCreateTestModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 flex items-center space-x-2 shadow-md transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Test</span>
              </button>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'statistics' && (
          <StatisticsTab courseId={courseId} />
        )}
        {activeTab === 'previous-tests' && (
          <PreviousTestsTab courseId={courseId} />
        )}
        {activeTab === 'remediation' && (
          <RemediationTab courseId={courseId} />
        )}
        {activeTab === 'notes' && (
          <div>Notes Tab - Coming Soon</div>
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateTestModal && (
        <CreateTestModal
          courseId={courseId}
          onClose={() => setShowCreateTestModal(false)}
          onTestCreated={() => {
            setShowCreateTestModal(false);
            if (activeTab !== 'previous-tests') {
              setActiveTab('previous-tests');
            }
          }}
        />
      )}
    </div>
  );
}


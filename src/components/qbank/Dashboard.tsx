'use client';

import { useState, useEffect } from 'react';
import { BookOpen, BarChart3, History, TrendingUp, Plus, ArrowLeft } from 'lucide-react';
import StatisticsTab from './StatisticsTab';
import CreateTestModal from './CreateTestModal';
import PreviousTestsTab from './PreviousTestsTab';
import RemediationTab from './RemediationTab';

interface QBankDashboardProps {
  courseId: string;
  courseName?: string;
  onBack?: () => void;
}

type TabType = 'statistics' | 'history' | 'remediation';

export default function QBankDashboard({ courseId, courseName, onBack }: QBankDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testCreatedTrigger, setTestCreatedTrigger] = useState(0);

  const handleTestCreated = () => {
    setShowCreateModal(false);
    setActiveTab('history');
    setTestCreatedTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header - Light Theme */}
        <div className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition font-medium"
            >
              <ArrowLeft size={20} />
              Back to Courses
            </button>
          )}
          
          {/* Hero Section - Match student portal gradient */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden border border-blue-400/20 mb-6">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
                  {courseName || 'Q-Bank Practice'}
                </h1>
                <p className="text-blue-100">
                  Master your knowledge with comprehensive practice questions and performance tracking
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white hover:bg-blue-50 text-purple-700 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Plus size={20} />
                Create New Test
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Light Theme */}
        <div className="bg-white border border-gray-200 rounded-2xl p-2 mb-6 flex gap-2 flex-wrap shadow-sm">
          <TabButton
            icon={<BarChart3 size={18} />}
            label="Statistics"
            active={activeTab === 'statistics'}
            onClick={() => setActiveTab('statistics')}
          />
          <TabButton
            icon={<History size={18} />}
            label="Test History"
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          />
          <TabButton
            icon={<TrendingUp size={18} />}
            label="Remediation"
            active={activeTab === 'remediation'}
            onClick={() => setActiveTab('remediation')}
          />
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'statistics' && (
            <div className="animate-fadeIn">
              <StatisticsTab courseId={courseId} />
            </div>
          )}
          {activeTab === 'history' && (
            <div className="animate-fadeIn">
              <PreviousTestsTab courseId={courseId} key={testCreatedTrigger} />
            </div>
          )}
          {activeTab === 'remediation' && (
            <div className="animate-fadeIn">
              <RemediationTab courseId={courseId} />
            </div>
          )}
        </div>

        {/* Create Test Modal */}
        {showCreateModal && (
          <CreateTestModal
            courseId={courseId}
            onClose={() => setShowCreateModal(false)}
            onTestCreated={handleTestCreated}
          />
        )}
      </div>
    </div>
  );
}

// Tab Button Component - Light Theme
function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}


'use client';

import { useState, useEffect } from 'react';

interface StatisticsTabProps {
  courseId: string;
}

interface Stats {
  totalQuestions: number;
  usedQuestions: number;
  unusedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  omittedQuestions: number;
  correctOnReattempt: number;
  yourScore?: number;
  maxScore?: number;
}

export default function StatisticsTab({ courseId }: StatisticsTabProps) {
  const [activeTestType, setActiveTestType] = useState<'classic' | 'ngn'>('classic');
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('Adult Health');
  const [selectedLesson, setSelectedLesson] = useState('Cardiovascular');
  const [selectedClientNeed, setSelectedClientNeed] = useState('Physiological Adaptation');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Alterations in Body Systems');
  const [isLoading, setIsLoading] = useState(true);

  const subjects = ['Adult Health', 'Child Health', 'Critical Care', 'Fundamentals', 'Leadership & Management', 'Maternal & Newborn Health', 'Mental Health', 'Pharmacology', 'Nutrition'];
  const lessons = ['Cardiovascular', 'Endocrine', 'Gastrointestinal', 'Hematological/Oncological', 'Immune', 'Infectious Disease', 'Integumentary', 'Musculoskeletal', 'Neurologic', 'Reproductive', 'Respiratory', 'Urinary/Renal/Fluid and Electrolytes', 'Visual/Auditory'];
  const clientNeeds = ['Physiological Adaptation', 'Reduction of Risk Potential', 'Health Promotion and Maintenance', 'Basic Care and Comfort', 'Safety & Infection Control', 'Psychosocial Integrity', 'Pharmacological and Parenteral Therapies', 'Management of Care'];
  const subcategories = ['Alterations in Body Systems', 'F&E Imbalances', 'Hemodynamics', 'Illness Management', 'Medical Emergencies', 'Pathophysiology', 'Unexpected Responses to Therapies'];

  useEffect(() => {
    fetchStatistics();
  }, [courseId, activeTestType]);

  async function fetchStatistics() {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/qbank/${courseId}/statistics?testType=${activeTestType}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data.statistics || {
          totalQuestions: activeTestType === 'classic' ? 2010 : 1171,
          usedQuestions: activeTestType === 'classic' ? 1594 : 890,
          unusedQuestions: activeTestType === 'classic' ? 416 : 281,
          correctQuestions: activeTestType === 'classic' ? 640 : 412,
          incorrectQuestions: activeTestType === 'classic' ? 834 : 412,
          omittedQuestions: 3,
          correctOnReattempt: 5,
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStats({
        totalQuestions: activeTestType === 'classic' ? 2010 : 1171,
        usedQuestions: activeTestType === 'classic' ? 1594 : 890,
        unusedQuestions: activeTestType === 'classic' ? 416 : 281,
        correctQuestions: activeTestType === 'classic' ? 640 : 412,
        incorrectQuestions: activeTestType === 'classic' ? 834 : 412,
        omittedQuestions: 3,
        correctOnReattempt: 5,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function DonutChart({ 
    value, 
    total, 
    label, 
    segments 
  }: { 
    value: number; 
    total: number; 
    label: string; 
    segments: { value: number; color: string }[] 
  }) {
    const radius = 70;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;
    
    let currentOffset = 0;

    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative" style={{ width: 200, height: 200 }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
            {/* Colored segments */}
            {segments.map((segment, index) => {
              const segmentPercentage = total > 0 ? (segment.value / total) * 100 : 0;
              const segmentLength = (segmentPercentage / 100) * circumference;
              const dashArray = `${segmentLength} ${circumference}`;
              const rotation = (currentOffset / circumference) * 360 - 90;
              
              currentOffset += segmentLength;

              return (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset="0"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: '100px 100px',
                  }}
                />
              );
            })}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">{label}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const usedPercentage = stats.totalQuestions > 0 ? Math.round((stats.usedQuestions / stats.totalQuestions) * 100) : 0;
  const unusedPercentage = 100 - usedPercentage;
  const correctPercentage = stats.usedQuestions > 0 ? Math.round((stats.correctQuestions / stats.usedQuestions) * 100) : 0;
  const incorrectPercentage = stats.usedQuestions > 0 ? Math.round((stats.incorrectQuestions / stats.usedQuestions) * 100) : 0;

  // Mock subject/lesson data
  const subjectData = {
    totalQuestions: 561,
    usedQuestions: 445,
    correctQuestions: 203,
    incorrectQuestions: 242,
    omittedQuestions: 0,
    yourScore: 637,
    maxScore: 1299,
  };

  const lessonData = {
    totalQuestions: 147,
    usedQuestions: 120,
    correctQuestions: 64,
    incorrectQuestions: 55,
    omittedQuestions: 1,
    yourScore: 102,
    maxScore: 257,
  };

  const clientNeedData = {
    totalQuestions: 380,
    usedQuestions: 310,
    correctQuestions: 133,
    incorrectQuestions: 177,
    omittedQuestions: 0,
    yourScore: 552,
    maxScore: 1143,
  };

  const subcategoryData = {
    totalQuestions: 150,
    usedQuestions: 125,
    correctQuestions: 50,
    incorrectQuestions: 75,
    omittedQuestions: 0,
    yourScore: 300,
    maxScore: 606,
  };

  return (
    <div className="space-y-8">
      {/* Test Type Toggle */}
      <div className="flex justify-end items-center space-x-3">
        <button
          onClick={() => setActiveTestType('classic')}
          className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
            activeTestType === 'classic'
              ? 'bg-teal-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Classic (2010)
        </button>
        <button
          onClick={() => setActiveTestType('ngn')}
          className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
            activeTestType === 'ngn'
              ? 'bg-teal-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          NGN (1171)
        </button>
      </div>

      {/* Statistics Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Statistics</h2>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Chart */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <DonutChart
              value={stats.usedQuestions}
              total={stats.totalQuestions}
              label="Usage"
              segments={[
                { value: stats.usedQuestions, color: '#6366F1' },
                { value: stats.unusedQuestions, color: '#CBD5E1' },
              ]}
            />
            <div className="flex-1 ml-8 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Total Questions</span>
                <span className="font-bold text-gray-900">{stats.totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Used Questions</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900">{stats.usedQuestions}</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    {usedPercentage}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 font-medium">Unused Questions</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900">{stats.unusedQuestions}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    {unusedPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Performance Chart */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <DonutChart
              value={stats.correctQuestions}
              total={stats.usedQuestions}
              label="Questions"
              segments={[
                { value: stats.correctQuestions, color: '#10B981' },
                { value: stats.incorrectQuestions, color: '#EF4444' },
              ]}
            />
            <div className="flex-1 ml-8 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Total Correct</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-green-600">{stats.correctQuestions}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    {correctPercentage}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Total Incorrect</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-red-600">{stats.incorrectQuestions}</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    {incorrectPercentage}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">Total Omitted</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-yellow-600">{stats.omittedQuestions}</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    {stats.usedQuestions > 0 ? Math.round((stats.omittedQuestions / stats.usedQuestions) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 font-medium">Total Correct On Reattempt</span>
                <span className="font-bold text-blue-600">{stats.correctOnReattempt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects and Lessons Statistics */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Subjects and Lessons Statistics</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subjects Statistics */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subjects Statistics</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <DonutChart
                  value={subjectData.correctQuestions}
                  total={subjectData.usedQuestions}
                  label="Score"
                  segments={[
                    { value: subjectData.correctQuestions, color: '#10B981' },
                    { value: subjectData.incorrectQuestions, color: '#EF4444' },
                  ]}
                />
                <div className="flex-1 ml-6 space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Questions</span>
                    <span className="font-bold text-gray-900">{subjectData.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Used Questions</span>
                    <span className="font-bold text-gray-900">{subjectData.usedQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Correct Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-green-600">{subjectData.correctQuestions}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {Math.round((subjectData.correctQuestions / subjectData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Incorrect Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-600">{subjectData.incorrectQuestions}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        {Math.round((subjectData.incorrectQuestions / subjectData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Omitted Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-yellow-600">{subjectData.omittedQuestions}</span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                        {Math.round((subjectData.omittedQuestions / subjectData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lessons Statistics */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lessons Statistics</label>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {lessons.map((lesson) => (
                  <option key={lesson} value={lesson}>
                    {lesson}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <DonutChart
                  value={lessonData.correctQuestions}
                  total={lessonData.usedQuestions}
                  label="Score"
                  segments={[
                    { value: lessonData.correctQuestions, color: '#10B981' },
                    { value: lessonData.incorrectQuestions, color: '#EF4444' },
                  ]}
                />
                <div className="flex-1 ml-6 space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Questions</span>
                    <span className="font-bold text-gray-900">{lessonData.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Used Questions</span>
                    <span className="font-bold text-gray-900">{lessonData.usedQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Correct Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-green-600">{lessonData.correctQuestions}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {Math.round((lessonData.correctQuestions / lessonData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Incorrect Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-600">{lessonData.incorrectQuestions}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        {Math.round((lessonData.incorrectQuestions / lessonData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Omitted Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-yellow-600">{lessonData.omittedQuestions}</span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                        {Math.round((lessonData.omittedQuestions / lessonData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Need Areas Statistics */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Client Need Areas Statistics</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Client Need Statistics */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Client Need Statistics</label>
              <select
                value={selectedClientNeed}
                onChange={(e) => setSelectedClientNeed(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {clientNeeds.map((need) => (
                  <option key={need} value={need}>
                    {need}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <DonutChart
                  value={clientNeedData.correctQuestions}
                  total={clientNeedData.usedQuestions}
                  label="Score"
                  segments={[
                    { value: clientNeedData.correctQuestions, color: '#10B981' },
                    { value: clientNeedData.incorrectQuestions, color: '#EF4444' },
                  ]}
                />
                <div className="flex-1 ml-6 space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Questions</span>
                    <span className="font-bold text-gray-900">{clientNeedData.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Used Questions</span>
                    <span className="font-bold text-gray-900">{clientNeedData.usedQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Correct Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-green-600">{clientNeedData.correctQuestions}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {Math.round((clientNeedData.correctQuestions / clientNeedData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Incorrect Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-600">{clientNeedData.incorrectQuestions}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        {Math.round((clientNeedData.incorrectQuestions / clientNeedData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Omitted Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-yellow-600">{clientNeedData.omittedQuestions}</span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                        {Math.round((clientNeedData.omittedQuestions / clientNeedData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subcategory Statistics */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory Statistics</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {subcategories.map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <DonutChart
                  value={subcategoryData.correctQuestions}
                  total={subcategoryData.usedQuestions}
                  label="Score"
                  segments={[
                    { value: subcategoryData.correctQuestions, color: '#10B981' },
                    { value: subcategoryData.incorrectQuestions, color: '#EF4444' },
                  ]}
                />
                <div className="flex-1 ml-6 space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Questions</span>
                    <span className="font-bold text-gray-900">{subcategoryData.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Used Questions</span>
                    <span className="font-bold text-gray-900">{subcategoryData.usedQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Correct Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-green-600">{subcategoryData.correctQuestions}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {Math.round((subcategoryData.correctQuestions / subcategoryData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Incorrect Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-600">{subcategoryData.incorrectQuestions}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        {Math.round((subcategoryData.incorrectQuestions / subcategoryData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Omitted Questions</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-yellow-600">{subcategoryData.omittedQuestions}</span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                        {Math.round((subcategoryData.omittedQuestions / subcategoryData.usedQuestions) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

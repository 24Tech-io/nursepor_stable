'use client';

import { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Info } from 'lucide-react';

interface Module {
  id: number;
  name: string;
  moduleId: number;
  questionCount: number;
}

interface CourseFolder {
  id: number;
  courseName: string;
  courseId: number;
  questionCount: number;
  modules: Module[];
}

interface ModuleBasedTestCreatorProps {
  courseId: string;
  onClose: () => void;
  onTestCreated: () => void;
}

export default function ModuleBasedTestCreator({
  courseId,
  onClose,
  onTestCreated,
}: ModuleBasedTestCreatorProps) {
  const [step, setStep] = useState(1);
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unused' | 'marked' | 'incorrect'>('all');
  const [mode, setMode] = useState<'tutorial' | 'timed' | 'cat'>('tutorial');
  const [questionCount, setQuestionCount] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/qbank/folders', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = (moduleId: number) => {
    const newSelected = new Set(selectedModuleIds);
    if (newSelected.has(moduleId)) {
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
    }
    setSelectedModuleIds(newSelected);
  };

  const toggleCourse = (courseFolder: CourseFolder) => {
    const allModuleIds = courseFolder.modules.map((m) => m.moduleId);
    const allSelected = allModuleIds.every((id) => selectedModuleIds.has(id));

    const newSelected = new Set(selectedModuleIds);
    if (allSelected) {
      // Deselect all
      allModuleIds.forEach((id) => newSelected.delete(id));
    } else {
      // Select all
      allModuleIds.forEach((id) => newSelected.add(id));
    }
    setSelectedModuleIds(newSelected);
  };

  const getTotalQuestions = () => {
    let total = 0;
    folders.forEach((folder) => {
      folder.modules.forEach((module) => {
        if (selectedModuleIds.has(module.moduleId)) {
          total += module.questionCount;
        }
      });
    });
    return total;
  };

  const handleCreateTest = async () => {
    try {
      setIsCreating(true);

      const response = await fetch(`/api/qbank/${courseId}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          moduleIds: Array.from(selectedModuleIds),
          filter,
          mode,
          questionCount,
          title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Practice Test`,
        }),
      });

      if (response.ok) {
        onTestCreated();
      } else {
        alert('Failed to create test. Please try again.');
      }
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create test. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const totalAvailable = getTotalQuestions();
  const maxQuestions = Math.min(totalAvailable, 150);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Practice Test</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Select Modules */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Select Practice Content</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Choose modules to practice. You can select multiple modules from the same
                      course or mix modules from different courses!
                    </p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading modules...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.map((folder) => {
                    const allModulesSelected = folder.modules.every((m) =>
                      selectedModuleIds.has(m.moduleId)
                    );

                    return (
                      <div key={folder.id} className="border border-gray-200 rounded-xl p-4">
                        {/* Course Header */}
                        <div
                          className="flex items-center gap-3 mb-3 cursor-pointer"
                          onClick={() => toggleCourse(folder)}
                        >
                          {allModulesSelected ? (
                            <CheckSquare size={24} className="text-purple-600 flex-shrink-0" />
                          ) : (
                            <Square size={24} className="text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{folder.courseName}</h3>
                            <p className="text-sm text-gray-600">
                              {folder.questionCount} questions · {folder.modules.length} modules
                            </p>
                          </div>
                        </div>

                        {/* Modules */}
                        <div className="ml-9 space-y-2">
                          {folder.modules.map((module) => (
                            <div
                              key={module.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                              onClick={() => toggleModule(module.moduleId)}
                            >
                              {selectedModuleIds.has(module.moduleId) ? (
                                <CheckSquare
                                  size={20}
                                  className="text-blue-600 flex-shrink-0"
                                />
                              ) : (
                                <Square size={20} className="text-gray-400 flex-shrink-0" />
                              )}
                              <span className="text-lg">{module.icon || '📂'}</span>
                              <span className="flex-1 text-gray-800">{module.name}</span>
                              <span className="text-sm text-purple-600 font-medium">
                                {module.questionCount} Q
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selection Summary */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm font-medium text-purple-900">
                  Selected: {selectedModuleIds.size} modules ({totalAvailable} questions available)
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedModuleIds.size === 0}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Filter Questions →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Filter */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Choose Practice Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFilter('all')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      filter === 'all'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">📚</div>
                    <div className="font-semibold text-gray-900">All Questions</div>
                    <div className="text-sm text-gray-600 mt-1">{totalAvailable} available</div>
                  </button>

                  <button
                    onClick={() => setFilter('unused')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      filter === 'unused'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">✨</div>
                    <div className="font-semibold text-gray-900">Unused Only</div>
                    <div className="text-sm text-gray-600 mt-1">New material</div>
                  </button>

                  <button
                    onClick={() => setFilter('marked')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      filter === 'marked'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🚩</div>
                    <div className="font-semibold text-gray-900">Marked for Review</div>
                    <div className="text-sm text-gray-600 mt-1">Flagged questions</div>
                  </button>

                  <button
                    onClick={() => setFilter('incorrect')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      filter === 'incorrect'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">❌</div>
                    <div className="font-semibold text-gray-900">Previously Incorrect</div>
                    <div className="text-sm text-gray-600 mt-1">Focus on mistakes</div>
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
                >
                  Next: Test Settings →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Test Settings */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Test Mode</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setMode('tutorial')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mode === 'tutorial'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">💡</div>
                    <div className="font-semibold text-gray-900">Tutorial</div>
                    <div className="text-xs text-gray-600 mt-1">See answers immediately</div>
                  </button>

                  <button
                    onClick={() => setMode('timed')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mode === 'timed'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">⏱️</div>
                    <div className="font-semibold text-gray-900">Timed</div>
                    <div className="text-xs text-gray-600 mt-1">Simulate exam conditions</div>
                  </button>

                  <button
                    onClick={() => setMode('cat')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      mode === 'cat'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="font-semibold text-gray-900">Adaptive</div>
                    <div className="text-xs text-gray-600 mt-1">Adjusts difficulty</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Number of Questions</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Maximum: {maxQuestions} (from {totalAvailable} available)
                </p>
                <input
                  type="number"
                  min="1"
                  max={maxQuestions}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.min(parseInt(e.target.value) || 1, maxQuestions))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                <h4 className="font-bold text-purple-900 mb-3">Test Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Modules selected:</span>
                    <span className="font-semibold text-gray-900">{selectedModuleIds.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Available questions:</span>
                    <span className="font-semibold text-gray-900">{totalAvailable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Filter:</span>
                    <span className="font-semibold text-gray-900 capitalize">{filter}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Mode:</span>
                    <span className="font-semibold text-gray-900 capitalize">{mode}</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-200 pt-2 mt-2">
                    <span className="text-gray-700 font-bold">Test will have:</span>
                    <span className="font-bold text-purple-600">{questionCount} questions</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreateTest}
                  disabled={isCreating || questionCount > maxQuestions || totalAvailable === 0}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isCreating ? 'Creating...' : 'Create Test 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


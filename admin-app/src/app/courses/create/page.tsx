'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminUser } from '@/lib/auth-client';
import QuestionTypeBuilder from '@/components/qbank/QuestionTypeBuilder';

type QuestionFormat = 
  | 'matrix_multiple_response'
  | 'select_n'
  | 'sata'
  | 'extended_multiple_response'
  | 'extended_drag_drop'
  | 'cloze_dropdown'
  | 'bowtie'
  | 'trend_item'
  | 'ranking'
  | 'case_study'
  | 'multiple_choice';

interface Question {
  id: string;
  format: QuestionFormat;
  question: string;
  explanation?: string;
  points?: number;
  data: any;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'course' | 'qbank'>('course');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Course form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [pricing, setPricing] = useState('');
  const [status, setStatus] = useState('draft');
  
  // Q-Bank state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionFormat, setSelectedQuestionFormat] = useState<QuestionFormat>('multiple_choice');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          router.push('/');
          return;
        }

        const data = await response.json();
        if (!data.user || data.user.role !== 'admin') {
          router.push('/');
          return;
        }

        // Check if editing existing course
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('id');
        if (editId) {
          setCourseId(editId);
          setIsEditing(true);
          fetchCourse(editId);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/');
      }
    }

    checkAuth();
  }, [router]);

  async function fetchCourse(id: string) {
    try {
      const response = await fetch(`/api/courses/${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const course = data.course;
        setTitle(course.title);
        setDescription(course.description);
        setInstructor(course.instructor);
        setThumbnail(course.thumbnail || '');
        setPricing(course.pricing?.toString() || '');
        setStatus(course.status);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      format: selectedQuestionFormat,
      question: '',
      explanation: '',
      points: 1,
      data: {},
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestion(newQuestion);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    if (editingQuestion?.id === id) {
      setEditingQuestion({ ...editingQuestion, ...updates });
    }
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (editingQuestion?.id === id) {
      setEditingQuestion(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let course;
      
      if (isEditing && courseId) {
        // Update existing course
        const courseResponse = await fetch(`/api/courses/${courseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title,
            description,
            instructor,
            thumbnail: thumbnail || null,
            pricing: pricing ? parseFloat(pricing) : null,
            status,
          }),
        });

        if (!courseResponse.ok) {
          throw new Error('Failed to update course');
        }

        const data = await courseResponse.json();
        course = data.course;

        // Update Q-Bank if questions exist
        if (questions.length > 0) {
          // Delete existing questions and add new ones
          await fetch(`/api/qbank/${courseId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ questions }),
          });
        }
      } else {
        // Create new course
        const courseResponse = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title,
            description,
            instructor,
            thumbnail: thumbnail || null,
            pricing: pricing ? parseFloat(pricing) : null,
            status,
          }),
        });

        if (!courseResponse.ok) {
          throw new Error('Failed to create course');
        }

        const data = await courseResponse.json();
        course = data.course;

        // Create Q-Bank if questions exist
        if (questions.length > 0) {
          await fetch(`/api/qbank/${course.id}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ questions }),
          });
        }
      }

      router.push('/courses');
    } catch (error: any) {
      alert(`Failed to ${isEditing ? 'update' : 'create'} course: ` + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const questionFormats: { value: QuestionFormat; label: string; icon: string }[] = [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: '○' },
    { value: 'sata', label: 'Select All That Apply', icon: '☑' },
    { value: 'select_n', label: 'Select N', icon: '🔢' },
    { value: 'matrix_multiple_response', label: 'Matrix Multiple Response', icon: '⊞' },
    { value: 'extended_multiple_response', label: 'Extended Multiple Response', icon: '⊠' },
    { value: 'extended_drag_drop', label: 'Extended Drag & Drop', icon: '↔' },
    { value: 'cloze_dropdown', label: 'Cloze / Drop-Down', icon: '▼' },
    { value: 'bowtie', label: 'Bow-Tie', icon: '🎀' },
    { value: 'trend_item', label: 'Trend Item', icon: '📈' },
    { value: 'ranking', label: 'Ranking', icon: '🔢' },
    { value: 'case_study', label: 'Case Study (6 Questions)', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/courses" className="text-xl font-bold text-gray-900 hover:text-purple-600 transition">
                ← Back to Courses
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isEditing ? 'Edit Course' : 'Create New Course'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update course details and Q-Bank' : 'Build a course with integrated NGN Q-Bank'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('course')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'course'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Course Details
            </button>
            <button
              onClick={() => setActiveTab('qbank')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'qbank'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Q-Bank ({questions.length} questions)
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'course' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="e.g., NCLEX-RN Comprehensive Review"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Describe your course..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Instructor *
                  </label>
                  <input
                    type="text"
                    required
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Instructor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Pricing (₹)
                  </label>
                  <input
                    type="number"
                    value={pricing}
                    onChange={(e) => setPricing(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qbank' && (
            <div className="space-y-6">
              {/* Add Question Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Add Question</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {questionFormats.map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setSelectedQuestionFormat(format.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        selectedQuestionFormat === format.value
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.icon} {format.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  + Add {questionFormats.find(f => f.value === selectedQuestionFormat)?.label}
                </button>
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Questions ({questions.length})</h3>
                  <div className="space-y-4">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className={`p-4 border-2 rounded-xl transition ${
                          editingQuestion?.id === q.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                              {questionFormats.find(f => f.value === q.format)?.label}
                            </span>
                            {q.question && (
                              <p className="mt-2 text-gray-900 font-medium line-clamp-2">{q.question}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingQuestion(editingQuestion?.id === q.id ? null : q)}
                              className="px-3 py-1 text-sm font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition"
                            >
                              {editingQuestion?.id === q.id ? 'Collapse' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQuestion(q.id)}
                              className="px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {editingQuestion?.id === q.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
                                <textarea
                                  value={editingQuestion.question}
                                  onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                                  rows={3}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  placeholder="Enter question text..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
                                <textarea
                                  value={editingQuestion.explanation || ''}
                                  onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                                  rows={2}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  placeholder="Explanation for the answer..."
                                />
                              </div>
                              <QuestionTypeBuilder
                                format={q.format}
                                question={editingQuestion.data || {}}
                                onChange={(data) => updateQuestion(q.id, { data })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <Link
              href="/courses"
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || !title || !description || !instructor}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Course' : 'Create Course')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

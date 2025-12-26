'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: number;
  stem: string;
  type: string;
  label: string;
  subject: string | null;
  lesson: string | null;
  clientNeedArea: string | null;
  difficulty: string | null;
  testType: string;
  createdAt: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const qbankId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created' | 'subject' | 'type'>('created');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [qbankId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/qbanks/${qbankId}/questions`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedQuestions.length} questions? This action cannot be undone.`)) return;

    try {
      for (const questionId of selectedQuestions) {
        await fetch(`/api/admin/qbanks/${qbankId}/questions/${questionId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      setSelectedQuestions([]);
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting questions:', error);
      alert('Failed to delete some questions');
    }
  };

  const filteredQuestions = questions
    .filter(q => {
      if (filterSubject && q.subject !== filterSubject) return false;
      if (filterType && q.type !== filterType) return false;
      if (searchQuery && !q.stem.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'subject') return (a.subject || '').localeCompare(b.subject || '');
      return a.type.localeCompare(b.type);
    });

  const uniqueSubjects = [...new Set(questions.map(q => q.subject).filter((s): s is string => !!s))];
  const uniqueTypes = [...new Set(questions.map(q => q.type))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link href="/admin/qbanks" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
              ← Back to Q-Banks
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Question Management</h1>
            <p className="text-gray-600 mt-2">Manage questions in this Q-Bank</p>
          </div>
          <Link
            href={`/admin/qbanks/${qbankId}/questions/create`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Create Question
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created">Sort by Date</option>
              <option value="subject">Sort by Subject</option>
              <option value="type">Sort by Type</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedQuestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
            <span className="text-blue-800 font-medium">
              {selectedQuestions.length} question(s) selected
            </span>
            <div className="space-x-3">
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedQuestions([])}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Questions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestions(filteredQuestions.map(q => q.id));
                        } else {
                          setSelectedQuestions([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {questions.length === 0 ? 'No questions found. Create your first question to get started.' : 'No questions match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((question) => (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuestions([...selectedQuestions, question.id]);
                            } else {
                              setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2 max-w-md">
                          <div dangerouslySetInnerHTML={{ __html: question.stem.substring(0, 150) + (question.stem.length > 150 ? '...' : '') }} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {question.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {question.subject || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {question.lesson || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              question.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {question.difficulty || 'medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Published
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <Link
                          href={`/admin/qbanks/${qbankId}/questions/${question.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this question? This action cannot be undone.')) {
                              try {
                                await fetch(`/api/admin/qbanks/${qbankId}/questions/${question.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include',
                                });
                                fetchQuestions();
                              } catch (error) {
                                alert('Failed to delete question');
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}





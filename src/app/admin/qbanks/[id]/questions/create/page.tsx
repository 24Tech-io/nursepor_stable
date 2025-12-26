'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy load rich text editor
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const CLIENT_NEEDS = [
  'Safe and Effective Care Environment',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Physiological Integrity',
];

const SUBJECTS = [
  'Adult Health',
  'Child Health',
  'Maternal Health',
  'Mental Health',
  'Pharmacology',
  'Fundamentals',
];

const SYSTEMS = [
  'Cardiovascular',
  'Respiratory',
  'Endocrine',
  'Neurological',
  'Gastrointestinal',
  'Renal',
  'Musculoskeletal',
  'Integumentary',
  'Hematology',
  'Oncology',
  'Immunology',
];

export default function CreateQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const qbankId = params.id as string;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Use sets to store unique values for filters
  const [filters, setFilters] = useState({
    subjects: [] as string[],
    systems: [] as string[],
    topics: [] as string[],
    clientNeeds: [] as string[]
  });

  useEffect(() => {
    console.log('CreateQuestionPage mounted. QBankId:', qbankId);
    if (!qbankId) {
      console.error('QBankId is missing!');
    }
    fetchFilters();
  }, [qbankId]);

  const fetchFilters = async () => {
    try {
      const res = await fetch(`/api/student/qbanks/${qbankId}/filters`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFilters(data);
      }
    } catch (e) {
      console.error('Failed to fetch filter options', e);
    }
  };

  const [formData, setFormData] = useState({
    question: '',
    explanation: '',
    questionType: 'multiple_choice',
    testType: 'mixed',
    difficulty: 'medium',
    subject: '',
    lesson: '',
    clientNeedArea: '',
    subcategory: '',
    points: 1,
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctAnswer: 'a',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validation
    if (!formData.question || formData.question.trim().length < 10) {
      setError('Question must be at least 10 characters');
      setSaving(false);
      return;
    }

    if (formData.options.filter(o => o.text.trim()).length < 2) {
      setError('At least 2 answer options are required');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/qbanks/${qbankId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionBankId: parseInt(qbankId),
          question: formData.question,
          explanation: formData.explanation || null,
          questionType: formData.questionType,
          testType: formData.testType,
          difficulty: formData.difficulty,
          subject: formData.subject || null,
          lesson: formData.lesson || null,
          clientNeedArea: formData.clientNeedArea || null,
          subcategory: formData.subcategory || null,
          points: formData.points,
          options: JSON.stringify(formData.options.filter(o => o.text.trim()).map(o => ({ id: o.id, text: o.text }))),
          correctAnswer: JSON.stringify(formData.correctAnswer),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create question');
      }

      router.push(`/admin/qbanks/${qbankId}/questions`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const nextLetter = letters[formData.options.length];
    if (nextLetter) {
      setFormData({
        ...formData,
        options: [...formData.options, { id: nextLetter, text: '' }],
      });
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert('At least 2 options are required');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: newOptions,
      correctAnswer: formData.correctAnswer === formData.options[index].id
        ? newOptions[0].id
        : formData.correctAnswer,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/admin/qbanks/${qbankId}/questions`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Questions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Question</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          {/* Question Stem - Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Stem *
            </label>
            <ReactQuill
              theme="snow"
              value={formData.question}
              onChange={(value) => setFormData({ ...formData, question: value })}
              placeholder="Enter the question stem..."
              className="bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 10 characters required</p>
          </div>

          {/* Metadata Taggers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Need Area
              </label>
              <input
                list="client-needs-list"
                type="text"
                value={formData.clientNeedArea}
                onChange={(e) => setFormData({ ...formData, clientNeedArea: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Select or type..."
              />
              <datalist id="client-needs-list">
                {filters.clientNeeds.map(need => (
                  <option key={need} value={need} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                list="subjects-list"
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Select or type..."
              />
              <datalist id="subjects-list">
                {filters.subjects.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System/Lesson
              </label>
              <input
                list="systems-list"
                type="text"
                value={formData.lesson}
                onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Select or type..."
              />
              <datalist id="systems-list">
                {filters.systems.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic (Subcategory)
              </label>
              <input
                list="topics-list"
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Select or type..."
              />
              <datalist id="topics-list">
                {filters.topics.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type *
            </label>
            <select
              value={formData.questionType}
              onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="multiple_choice">Single Best Answer</option>
              <option value="sata">SATA (Select All That Apply)</option>
              <option value="ngn_case_study">NGN Case Study</option>
              <option value="unfolding_ngn">Unfolding NGN</option>
              <option value="bowtie">Bow-Tie</option>
              <option value="matrix">Matrix</option>
              <option value="trend">Trend</option>
            </select>
          </div>

          {/* Test Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Type *
            </label>
            <select
              value={formData.testType}
              onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="classic">Classic</option>
              <option value="ngn">NGN (Next Gen NCLEX)</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Options * (Select the correct answer)
            </label>
            {formData.options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-3 mb-3">
                <input
                  type="radio"
                  name="correctAnswer"
                  value={option.id}
                  checked={formData.correctAnswer === option.id}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700 w-6">{option.id.toUpperCase()}.</span>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[index].text = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                  placeholder={`Option ${option.id.toUpperCase()}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="mt-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
            >
              + Add Option
            </button>
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points
            </label>
            <input
              type="number"
              min="1"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Explanation - Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explanation
            </label>
            <ReactQuill
              theme="snow"
              value={formData.explanation}
              onChange={(value) => setFormData({ ...formData, explanation: value })}
              placeholder="Enter explanation..."
              className="bg-white"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Link
              href={`/admin/qbanks/${qbankId}/questions`}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





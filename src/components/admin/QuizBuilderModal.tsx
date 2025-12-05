'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, GripVertical, Zap } from 'lucide-react';

interface QuizBuilderModalProps {
  onClose: () => void;
  onSave: (quizData: {
    title: string;
    passMark: number;
    maxAttempts: number;
    questions: any[];
  }) => void;
}

type QuestionType = 'mcq' | 'sata' | 'extended_multiple' | 'extended_drag_drop' | 'cloze' | 'matrix' | 'bowtie' | 'trend' | 'ranking' | 'case_study' | 'select_n';

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string | string[];
  explanation: string;
}

export default function QuizBuilderModal({ onClose, onSave }: QuizBuilderModalProps) {
  const [title, setTitle] = useState('');
  const [passMark, setPassMark] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
  });

  const questionTypes: { value: QuestionType; label: string; description: string }[] = [
    { value: 'mcq', label: 'Multiple Choice', description: 'Single correct answer' },
    { value: 'sata', label: 'Select All That Apply', description: 'Multiple correct answers' },
    { value: 'extended_multiple', label: 'Extended Multiple Response', description: 'NGN format' },
    { value: 'extended_drag_drop', label: 'Extended Drag & Drop', description: 'NGN format' },
    { value: 'cloze', label: 'Cloze (Drop-Down)', description: 'Fill in the blanks' },
    { value: 'matrix', label: 'Matrix/Grid', description: 'Multiple choice grid' },
    { value: 'bowtie', label: 'Bowtie/Highlight', description: 'NGN case study' },
    { value: 'trend', label: 'Trend', description: 'Data analysis' },
    { value: 'ranking', label: 'Ranking/Ordering', description: 'Priority order' },
    { value: 'case_study', label: 'Case Study', description: 'Clinical scenario' },
    { value: 'select_n', label: 'Select N', description: 'Choose specific number' },
  ];

  const handleAddQuestion = () => {
    if (!currentQuestion.question?.trim()) {
      alert('Please enter a question');
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: currentQuestion.type || 'mcq',
      question: currentQuestion.question,
      options: currentQuestion.options || [],
      correctAnswer: currentQuestion.correctAnswer || '',
      explanation: currentQuestion.explanation || '',
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
    });
    setShowQuestionForm(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSaveQuiz = () => {
    if (!title.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    onSave({
      title,
      passMark,
      maxAttempts,
      questions,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Create Quiz</h3>
              <p className="text-sm text-slate-400">Build quiz with NGN question types</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quiz Settings */}
        <div className="p-6 border-b border-slate-800 space-y-4 flex-shrink-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-1">
              <label className="block text-sm font-bold text-slate-400 mb-2">Quiz Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Cardiovascular Assessment"
                className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Pass Mark (%)</label>
              <input
                type="number"
                value={passMark}
                onChange={(e) => setPassMark(parseInt(e.target.value) || 70)}
                min="0"
                max="100"
                className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Max Attempts</label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
                min="1"
                className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-white">Questions ({questions.length})</h4>
              <p className="text-sm text-slate-400">Add questions to your quiz</p>
            </div>
            {!showQuestionForm && (
              <button
                onClick={() => setShowQuestionForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add Question
              </button>
            )}
          </div>

          {/* Question Form */}
          {showQuestionForm && (
            <div className="bg-[#1a1d26] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-md font-bold text-white">New Question</h5>
                <button
                  onClick={() => setShowQuestionForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Question Type Selector */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Question Type</label>
                <select
                  value={currentQuestion.type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value as QuestionType })}
                  className="w-full px-4 py-2 bg-[#161922] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Question</label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="Enter your question here..."
                  className="w-full h-24 px-4 py-2 bg-[#161922] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Options (for MCQ/SATA types) */}
              {(currentQuestion.type === 'mcq' || currentQuestion.type === 'sata') && (
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">Answer Options</label>
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(currentQuestion.options || [])];
                            newOptions[idx] = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 px-4 py-2 bg-[#161922] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        {idx > 1 && (
                          <button
                            onClick={() => {
                              const newOptions = currentQuestion.options?.filter((_, i) => i !== idx);
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                            className="p-2 text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setCurrentQuestion({
                          ...currentQuestion,
                          options: [...(currentQuestion.options || []), ''],
                        });
                      }}
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Correct Answer {currentQuestion.type === 'sata' && '(comma-separated for multiple)'}
                </label>
                <input
                  type="text"
                  value={currentQuestion.correctAnswer}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                  placeholder={currentQuestion.type === 'mcq' ? 'e.g., Option 1' : 'e.g., Option 1, Option 3'}
                  className="w-full px-4 py-2 bg-[#161922] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Explanation (Optional)</label>
                <textarea
                  value={currentQuestion.explanation}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer..."
                  className="w-full h-20 px-4 py-2 bg-[#161922] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Add Question Button */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowQuestionForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Add Question
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((question, idx) => (
                <div
                  key={question.id}
                  className="bg-[#1a1d26] border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-purple-400 uppercase px-2 py-0.5 bg-purple-500/20 rounded">
                              {questionTypes.find(t => t.value === question.type)?.label || question.type}
                            </span>
                          </div>
                          <p className="text-white font-medium">{question.question}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveQuestion(question.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {question.options && question.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((opt, optIdx) => (
                            <div key={optIdx} className="text-sm text-slate-400 flex items-center gap-2">
                              <span className="text-slate-600">{String.fromCharCode(65 + optIdx)}.</span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {question.explanation && (
                        <div className="mt-2 text-xs text-slate-500 italic">
                          💡 {question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {questions.length === 0 && !showQuestionForm && (
            <div className="text-center py-12 text-slate-500">
              <Zap size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No questions yet</p>
              <p className="text-sm">Click "Add Question" to get started</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-slate-400">
            {questions.length} question{questions.length !== 1 ? 's' : ''} • Pass mark: {passMark}%
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuiz}
              disabled={questions.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


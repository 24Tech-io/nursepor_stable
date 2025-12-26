'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Edit3 } from 'lucide-react';

interface QuizEditModalProps {
  quiz: any;
  onClose: () => void;
  onSave: () => void;
}

interface QuizData {
  id: number;
  title: string;
  passMark: number;
  maxAttempts: number;
}

type QuestionType = 'mcq' | 'sata' | 'extended_multiple' | 'extended_drag_drop' | 'cloze' | 'matrix' | 'bowtie' | 'trend' | 'ranking' | 'case_study' | 'select_n';

interface Question {
  id: number | string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string | string[];
  explanation: string;
  order: number;
}

export default function QuizEditModal({ quiz, onClose, onSave }: QuizEditModalProps) {
  const [title, setTitle] = useState(quiz.title || '');
  const [passMark, setPassMark] = useState(quiz.passMark || 70);
  const [maxAttempts, setMaxAttempts] = useState(quiz.maxAttempts || 3);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actualQuizId, setActualQuizId] = useState<number | null>(null);

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

  // Fetch existing quiz questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // First, get the quiz ID from the chapter (if item is a chapter)
        let quizId = quiz.id;
        
        // If quiz.id is actually a chapter ID, fetch the quiz
        if (quiz.type === 'mcq') {
          const quizResponse = await fetch(`/api/quizzes?chapterId=${quiz.id}`, {
            credentials: 'include',
          });
          
          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            if (quizData.quizzes && quizData.quizzes.length > 0) {
              quizId = quizData.quizzes[0].id;
              setActualQuizId(quizId); // Store the actual quiz ID
              // Update the quiz object with actual quiz data
              setTitle(quizData.quizzes[0].title || quiz.title || '');
              setPassMark(quizData.quizzes[0].passMark || 70);
              setMaxAttempts(quizData.quizzes[0].maxAttempts || 3);
              
              // Set questions if they exist
              if (quizData.quizzes[0].questions && Array.isArray(quizData.quizzes[0].questions)) {
                const parsedQuestions = quizData.quizzes[0].questions.map((q: any) => ({
                  ...q,
                  options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
                  correctAnswer: typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer,
                }));
                setQuestions(parsedQuestions);
              }
              
              setIsLoading(false);
              return;
            }
          }
        }
        
        // Otherwise fetch quiz directly
        const response = await fetch(`/api/quizzes/${quizId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const quizData = data.quiz;
          
          // Parse questions
          if (quizData.questions && Array.isArray(quizData.questions)) {
            const parsedQuestions = quizData.questions.map((q: any) => ({
              ...q,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
              correctAnswer: typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer,
            }));
            setQuestions(parsedQuestions);
          }
        }
      } catch (error) {
        console.error('Failed to fetch quiz questions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [quiz.id]);

  const handleAddOrUpdateQuestion = () => {
    if (!currentQuestion.question?.trim()) {
      alert('Please enter a question');
      return;
    }

    if (editingQuestionIndex !== null) {
      // Update existing question
      const updated = [...questions];
      updated[editingQuestionIndex] = {
        ...(updated[editingQuestionIndex] || {}),
        ...currentQuestion,
        id: updated[editingQuestionIndex].id,
        order: updated[editingQuestionIndex].order,
      } as Question;
      setQuestions(updated);
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      const newQuestion: Question = {
        id: Date.now().toString(),
        type: currentQuestion.type || 'mcq',
        question: currentQuestion.question,
        options: currentQuestion.options || [],
        correctAnswer: currentQuestion.correctAnswer || '',
        explanation: currentQuestion.explanation || '',
        order: questions.length,
      };
      setQuestions([...questions, newQuestion]);
    }

    setCurrentQuestion({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
    });
    setShowQuestionForm(false);
  };

  const handleEditQuestion = (index: number) => {
    setCurrentQuestion(questions[index]);
    setEditingQuestionIndex(index);
    setShowQuestionForm(true);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setIsSaving(true);

    try {
      // Use the actual quiz ID (fetched from database)
      const quizIdToUse = actualQuizId || quiz.id;
      
      console.log('💾 Saving quiz:', { quizIdToUse, title, passMark, maxAttempts, questionCount: questions.length });

      // Update quiz metadata
      const updateResponse = await fetch(`/api/quizzes/${quizIdToUse}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          passMark,
          maxAttempts,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('❌ Failed to update quiz:', errorData);
        throw new Error(errorData.message || 'Failed to update quiz');
      }

      console.log('✅ Quiz metadata updated');

      // Delete all existing questions
      await fetch(`/api/quizzes/${quizIdToUse}/questions`, {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('✅ Old questions deleted');

      // Add new questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // Ensure correctAnswer is stored as a simple string (the index)
        let correctAnswerValue = question.correctAnswer;
        if (Array.isArray(correctAnswerValue)) {
          correctAnswerValue = correctAnswerValue[0]; // For SATA, just take first for now
        }
        
        const addResponse = await fetch(`/api/quizzes/${quizIdToUse}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            question: question.question,
            options: JSON.stringify(question.options),
            correctAnswer: correctAnswerValue, // Store as plain string, not JSON
            explanation: question.explanation,
            order: i,
          }),
        });
        
        if (!addResponse.ok) {
          console.error(`❌ Failed to add question ${i + 1}`);
        } else {
          console.log(`✅ Added question ${i + 1} with correct answer: ${correctAnswerValue}`);
        }
      }

      alert('Quiz updated successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...(currentQuestion.options || []), ''],
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || [])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = (currentQuestion.options || []).filter((_, i) => i !== index);
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Quiz</h2>
            <p className="text-sm text-gray-600 mt-1">Update quiz details and questions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quiz Settings */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quiz Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter quiz title..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pass Mark (%)
                      </label>
                      <input
                        type="number"
                        value={passMark}
                        onChange={(e) => setPassMark(Number(e.target.value))}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                        min="1"
                        max="10"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Questions ({questions.length})
                  </h3>
                  <button
                    onClick={() => {
                      setCurrentQuestion({
                        type: 'mcq',
                        question: '',
                        options: ['', '', '', ''],
                        correctAnswer: '',
                        explanation: '',
                      });
                      setEditingQuestionIndex(null);
                      setShowQuestionForm(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Question
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                    No questions yet. Click "Add Question" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, index) => (
                      <div
                        key={q.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                {questionTypes.find(t => t.value === q.type)?.label || q.type}
                              </span>
                              <span className="text-gray-500">
                                {Array.isArray(q.options) ? q.options.length : 0} options
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditQuestion(index)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit question"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleRemoveQuestion(index)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete question"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question Form */}
              {showQuestionForm && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-300">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    {editingQuestionIndex !== null ? 'Edit Question' : 'Add New Question'}
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Type
                      </label>
                      <select
                        value={currentQuestion.type}
                        onChange={(e) =>
                          setCurrentQuestion({ ...currentQuestion, type: e.target.value as QuestionType })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {questionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label} - {type.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question
                      </label>
                      <textarea
                        value={currentQuestion.question}
                        onChange={(e) =>
                          setCurrentQuestion({ ...currentQuestion, question: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your question..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options
                      </label>
                      <div className="space-y-2">
                        {(currentQuestion.options || []).map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleUpdateOption(index, e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder={`Option ${index + 1}`}
                            />
                            <button
                              onClick={() => handleRemoveOption(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={handleAddOption}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                        >
                          + Add Option
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Answer
                      </label>
                      {currentQuestion.type === 'sata' ? (
                        <div className="space-y-2">
                          {(currentQuestion.options || []).map((option, index) => (
                            <label key={index} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={Array.isArray(currentQuestion.correctAnswer) && currentQuestion.correctAnswer.includes(String(index))}
                                onChange={(e) => {
                                  const current = Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer : [];
                                  const newAnswer = e.target.checked
                                    ? [...current, String(index)]
                                    : current.filter(a => a !== String(index));
                                  setCurrentQuestion({ ...currentQuestion, correctAnswer: newAnswer });
                                }}
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <span className="text-gray-700">{option || `Option ${index + 1}`}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <select
                          value={currentQuestion.correctAnswer as string}
                          onChange={(e) =>
                            setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select correct answer</option>
                          {(currentQuestion.options || []).map((option, index) => (
                            <option key={index} value={String(index)}>
                              {option || `Option ${index + 1}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explanation (Optional)
                      </label>
                      <textarea
                        value={currentQuestion.explanation}
                        onChange={(e) =>
                          setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Explain the correct answer..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleAddOrUpdateQuestion}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-semibold"
                      >
                        {editingQuestionIndex !== null ? 'Update Question' : 'Add Question'}
                      </button>
                      <button
                        onClick={() => {
                          setShowQuestionForm(false);
                          setEditingQuestionIndex(null);
                          setCurrentQuestion({
                            type: 'mcq',
                            question: '',
                            options: ['', '', '', ''],
                            correctAnswer: '',
                            explanation: '',
                          });
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveQuiz}
            disabled={isSaving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}


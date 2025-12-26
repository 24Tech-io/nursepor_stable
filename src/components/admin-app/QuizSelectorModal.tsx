'use client';

import React, { useState, useEffect } from 'react';
import { X, Zap, Database, Plus, Edit3, Trash2, GripVertical } from 'lucide-react';
import QuestionEditorModal, { QuizQuestion } from './QuestionEditorModal';

interface QuizSelectorModalProps {
    onClose: () => void;
    onSave: (title: string, passMark: number, maxAttempts: number, questions: QuizQuestion[], sourceQBankId?: number) => void;
    initialData?: {
        title: string;
        passMark: number;
        maxAttempts: number;
        questions?: QuizQuestion[];
        sourceQBankId?: number;
    };
}

export default function QuizSelectorModal({ onClose, onSave, initialData }: QuizSelectorModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [passMark, setPassMark] = useState(initialData?.passMark || 70);
    const [maxAttempts, setMaxAttempts] = useState(initialData?.maxAttempts || 3);
    const [selectedQBankId, setSelectedQBankId] = useState<number | undefined>(undefined);
    const [qbanks, setQBanks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Question management
    const [questions, setQuestions] = useState<QuizQuestion[]>(initialData?.questions || []);
    const [showQuestionEditor, setShowQuestionEditor] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'custom' | 'qbank'>(
        initialData?.sourceQBankId ? 'qbank' : 'custom'
    );

    useEffect(() => {
        // Fetch available Q-Banks to use as templates
        const fetchQBanks = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/qbanks');
                if (response.ok) {
                    const data = await response.json();
                    setQBanks(data.qbanks || []);
                }
            } catch (error) {
                console.error('Failed to load Q-Banks', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQBanks();
    }, []);

    const handleAddQuestion = () => {
        setEditingQuestion(undefined);
        setShowQuestionEditor(true);
    };

    const handleEditQuestion = (question: QuizQuestion) => {
        setEditingQuestion(question);
        setShowQuestionEditor(true);
    };

    const handleSaveQuestion = (question: QuizQuestion) => {
        if (editingQuestion) {
            // Update existing
            setQuestions(questions.map(q => q.id === question.id ? question : q));
        } else {
            // Add new
            setQuestions([...questions, question]);
        }
        setShowQuestionEditor(false);
        setEditingQuestion(undefined);
    };

    const handleDeleteQuestion = (questionId: string) => {
        setQuestions(questions.filter(q => q.id !== questionId));
    };

    const handleSave = () => {
        if (!title.trim()) {
            alert('Please enter a quiz title');
            return;
        }

        // Allow empty quizzes - questions can be added later via edit

        if (activeTab === 'qbank' && !selectedQBankId) {
            alert('Please select a Q-Bank or switch to custom questions');
            return;
        }

        onSave(title, passMark, maxAttempts, questions, activeTab === 'qbank' ? selectedQBankId : undefined);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap size={24} className="text-purple-400" />
                        {initialData ? 'Edit Quiz' : 'Create Quiz'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    {/* Quiz Details */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Quiz Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Cardiovascular Assessment Quiz"
                            className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Pass Mark (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={passMark}
                                onChange={(e) => setPassMark(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Max Attempts</label>
                            <input
                                type="number"
                                min="1"
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                                className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Tab Selector */}
                    <div>
                        <div className="flex gap-2 border-b border-slate-800 mb-4">
                            <button
                                onClick={() => setActiveTab('custom')}
                                className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'custom'
                                    ? 'text-purple-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                Custom Questions
                                {activeTab === 'custom' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('qbank')}
                                className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'qbank'
                                    ? 'text-purple-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                Import from Q-Bank
                                {activeTab === 'qbank' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
                                )}
                            </button>
                        </div>

                        {/* Custom Questions Tab */}
                        {activeTab === 'custom' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-slate-400">
                                        Questions ({questions.length})
                                    </label>
                                    <button
                                        onClick={handleAddQuestion}
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={16} /> Add Question
                                    </button>
                                </div>

                                {questions.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
                                        No questions added yet. Click "Add Question" to get started.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {questions.map((q, index) => (
                                            <div
                                                key={q.id}
                                                className="flex items-start gap-3 p-3 bg-[#1a1d26] border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                                            >
                                                <GripVertical size={16} className="text-slate-600 mt-1 cursor-grab" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-slate-500 font-bold text-sm">Q{index + 1}.</span>
                                                        <p className="text-white text-sm flex-1">{q.question}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {q.type === 'mcq' ? 'Multiple Choice' :
                                                            q.type === 'multiple_select' ? 'Multiple Select' :
                                                                'True/False'} • {q.options.length} options
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEditQuestion(q)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"
                                                        title="Edit question"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(q.id!)}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                                        title="Delete question"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Q-Bank Import Tab */}
                        {activeTab === 'qbank' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-2">
                                    Import Questions from Q-Bank
                                </label>
                                <p className="text-xs text-slate-500 mb-3">
                                    Select a Question Bank to automatically import questions from.
                                </p>

                                {isLoading ? (
                                    <div className="text-slate-500 text-sm animate-pulse">Loading Q-Banks...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                        {qbanks.map((qbank) => (
                                            <div
                                                key={qbank.id}
                                                onClick={() => setSelectedQBankId(selectedQBankId === qbank.id ? undefined : qbank.id)}
                                                className={`
                                                    p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                                                    ${selectedQBankId === qbank.id
                                                        ? 'bg-purple-500/20 border-purple-500 text-white'
                                                        : 'bg-[#1a1d26] border-slate-800 text-slate-400 hover:border-slate-600'}
                                                `}
                                            >
                                                <Database size={16} />
                                                <div className="truncate">
                                                    <div className="font-semibold text-sm truncate">{qbank.name}</div>
                                                    <div className="text-xs opacity-70">{qbank.totalQuestions || 0} questions</div>
                                                </div>
                                            </div>
                                        ))}
                                        {qbanks.length === 0 && (
                                            <div className="col-span-2 text-center text-slate-500 text-sm py-4">
                                                No Question Banks found.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        {initialData ? 'Update Quiz' : 'Create Quiz'}
                    </button>
                </div>
            </div>

            {/* Question Editor Modal */}
            {showQuestionEditor && (
                <QuestionEditorModal
                    onClose={() => {
                        setShowQuestionEditor(false);
                        setEditingQuestion(undefined);
                    }}
                    onSave={handleSaveQuestion}
                    initialData={editingQuestion}
                />
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, CheckCircle, Database, Filter, ChevronRight, ChevronDown, ArrowLeft, Save } from 'lucide-react';
import { useNotification } from './NotificationProvider';

interface Question {
    id: number;
    question: string;
    questionType: string;
    difficulty: string;
    points: number;
    subject?: string;
    system?: string;
    topic?: string;
}

interface QBank {
    id: number;
    name: string;
    description: string;
    questionCount: number;
}

interface CourseQBankManagerProps {
    courseId: number;
    onClose: () => void;
}

export default function CourseQBankManager({ courseId, onClose }: CourseQBankManagerProps) {
    const notification = useNotification();

    // State
    const [activeView, setActiveView] = useState<'assigned' | 'browse'>('assigned');
    const [assignedQuestions, setAssignedQuestions] = useState<any[]>([]);
    const [availableQBanks, setAvailableQBanks] = useState<QBank[]>([]);
    const [selectedQBank, setSelectedQBank] = useState<QBank | null>(null);
    const [qbankQuestions, setQbankQuestions] = useState<Question[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

    // Loading states
    const [isLoadingAssigned, setIsLoadingAssigned] = useState(true);
    const [isLoadingQBanks, setIsLoadingQBanks] = useState(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch assigned questions on mount
    useEffect(() => {
        fetchAssignedQuestions();
        fetchQBanks();
    }, [courseId]);

    const fetchAssignedQuestions = async () => {
        setIsLoadingAssigned(true);
        try {
            const response = await fetch(`/api/admin/courses/${courseId}/questions`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setAssignedQuestions(data.assignments || []);
            }
        } catch (error) {
            console.error('Error fetching assigned questions:', error);
            notification.showError('Failed to load assigned questions');
        } finally {
            setIsLoadingAssigned(false);
        }
    };

    const fetchQBanks = async () => {
        setIsLoadingQBanks(true);
        try {
            const response = await fetch('/api/admin/qbanks', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableQBanks(data.qbanks || []);
            }
        } catch (error) {
            console.error('Error fetching Q-Banks:', error);
        } finally {
            setIsLoadingQBanks(false);
        }
    };

    const fetchQBankQuestions = async (qbankId: number) => {
        setIsLoadingQuestions(true);
        try {
            const response = await fetch(`/api/admin/qbanks/${qbankId}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setQbankQuestions(data.questions || []);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            notification.showError('Failed to load questions');
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const handleAssignQuestions = async () => {
        if (selectedQuestionIds.length === 0) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/admin/courses/${courseId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    questionIds: selectedQuestionIds,
                    isModuleSpecific: false // Assign to course globally
                })
            });

            if (response.ok) {
                const data = await response.json();
                notification.showSuccess(`Successfully assigned ${data.assignments?.length || selectedQuestionIds.length} questions`);
                setActiveView('assigned');
                fetchAssignedQuestions();
                setSelectedQuestionIds([]);
            } else {
                const error = await response.json();
                notification.showError(error.message || 'Failed to assign questions');
            }
        } catch (error) {
            console.error('Error assigning questions:', error);
            notification.showError('Failed to assign questions');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveQuestions = async (questionIds: number[]) => {
        if (!confirm(`Are you sure you want to remove ${questionIds.length} question(s) from this course?`)) return;

        try {
            const response = await fetch(`/api/admin/courses/${courseId}/questions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    questionIds
                })
            });

            if (response.ok) {
                notification.showSuccess('Questions removed successfully');
                fetchAssignedQuestions();
            } else {
                notification.showError('Failed to remove questions');
            }
        } catch (error) {
            console.error('Error removing questions:', error);
            notification.showError('Failed to remove questions');
        }
    };

    const toggleQuestionSelection = (id: number) => {
        setSelectedQuestionIds(prev =>
            prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
        );
    };

    const selectAllQuestions = () => {
        if (selectedQuestionIds.length === qbankQuestions.length) {
            setSelectedQuestionIds([]);
        } else {
            setSelectedQuestionIds(qbankQuestions.map(q => q.id));
        }
    };

    // Filter out questions that are already assigned
    const unassignedQuestions = qbankQuestions.filter(
        q => !assignedQuestions.some(aq => aq.questionId === q.id)
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#161922] w-full max-w-6xl h-[90vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#1a1d26]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Course Q-Bank Manager</h2>
                            <p className="text-sm text-slate-400">Manage comprehensive practice questions for this course</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar */}
                    <div className="w-64 bg-[#13151d] border-r border-slate-800 flex flex-col">
                        <button
                            onClick={() => setActiveView('assigned')}
                            className={`flex items-center gap-3 p-4 border-b border-slate-800/50 transition-colors ${activeView === 'assigned'
                                ? 'bg-purple-600/10 text-purple-400 border-l-4 border-l-purple-500'
                                : 'text-slate-400 hover:bg-slate-800/50'
                                }`}
                        >
                            <CheckCircle size={18} />
                            <div className="text-left">
                                <div className="font-semibold">Assigned Questions</div>
                                <div className="text-xs opacity-70">{assignedQuestions.length} questions</div>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveView('browse')}
                            className={`flex items-center gap-3 p-4 border-b border-slate-800/50 transition-colors ${activeView === 'browse'
                                ? 'bg-purple-600/10 text-purple-400 border-l-4 border-l-purple-500'
                                : 'text-slate-400 hover:bg-slate-800/50'
                                }`}
                        >
                            <Search size={18} />
                            <div className="text-left">
                                <div className="font-semibold">Browse Q-Banks</div>
                                <div className="text-xs opacity-70">Add new questions</div>
                            </div>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-[#0b0d12]">

                        {/* View: Assigned Questions */}
                        {activeView === 'assigned' && (
                            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Curated Questions ({assignedQuestions.length})</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveView('browse')}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                                        >
                                            <Plus size={16} /> Add Questions
                                        </button>
                                    </div>
                                </div>

                                {isLoadingAssigned ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="animate-pulse text-slate-500">Loading questions...</div>
                                    </div>
                                ) : assignedQuestions.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                        <Database size={48} className="mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No questions assigned yet</p>
                                        <p className="mb-6">Add questions from your Q-Banks to build a practice test.</p>
                                        <button
                                            onClick={() => setActiveView('browse')}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium border border-slate-700"
                                        >
                                            Browse Q-Banks
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#161922] rounded-xl border border-slate-800">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-[#1a1d26] text-slate-400 text-xs uppercase font-bold sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-4">Question</th>
                                                    <th className="p-4 w-32">Type</th>
                                                    <th className="p-4 w-32">Difficulty</th>
                                                    <th className="p-4 w-24 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {assignedQuestions.map((q) => (
                                                    <tr key={q.id} className="hover:bg-slate-800/50 group">
                                                        <td className="p-4">
                                                            <div className="font-medium text-slate-200 line-clamp-2">{q.question}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 capitalize">
                                                                {q.questionType?.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
                                                                q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                                                    'bg-green-500/10 text-green-400'
                                                                }`}>
                                                                {q.difficulty}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button
                                                                onClick={() => handleRemoveQuestions([q.questionId])}
                                                                className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* View: Browse Q-Banks */}
                        {activeView === 'browse' && (
                            <div className="flex-1 flex overflow-hidden">
                                {!selectedQBank ? (
                                    /* Q-Bank List */
                                    <div className="flex-1 p-8 overflow-y-auto">
                                        <h3 className="text-lg font-bold text-white mb-6">Select a Source Q-Bank</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {availableQBanks.map(qb => (
                                                <button
                                                    key={qb.id}
                                                    onClick={() => {
                                                        setSelectedQBank(qb);
                                                        fetchQBankQuestions(qb.id);
                                                    }}
                                                    className="flex flex-col text-left p-6 bg-[#161922] border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-[#1a1d26] transition-all group"
                                                >
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors">
                                                            <Database size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white">{qb.name}</div>
                                                            <div className="text-xs text-slate-500">{qb.questionCount} questions</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">
                                                        {qb.description || 'No description provided.'}
                                                    </p>
                                                    <div className="flex items-center text-purple-400 text-sm font-semibold mt-auto">
                                                        Select Source <ChevronRight size={16} className="ml-1" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Question Selector */
                                    <div className="flex-1 flex flex-col h-full">
                                        {/* Toolbar */}
                                        <div className="p-4 bg-[#1a1d26] border-b border-slate-800 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => {
                                                        setSelectedQBank(null);
                                                        setQbankQuestions([]);
                                                        setSelectedQuestionIds([]);
                                                    }}
                                                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <ArrowLeft size={18} /> Back
                                                </button>
                                                <div className="h-6 w-px bg-slate-700"></div>
                                                <h3 className="font-bold text-white">{selectedQBank.name}</h3>
                                                <span className="text-xs px-2 py-1 bg-slate-800 rounded-full text-slate-400">
                                                    {unassignedQuestions.length} available
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-sm text-slate-400">
                                                    {selectedQuestionIds.length} selected
                                                </div>
                                                <button
                                                    onClick={handleAssignQuestions}
                                                    disabled={selectedQuestionIds.length === 0 || isSaving}
                                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            Assigning...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save size={18} />
                                                            Assign to Course
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Question List */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0b0d12] p-4">
                                            {isLoadingQuestions ? (
                                                <div className="flex items-center justify-center h-64">
                                                    <div className="animate-pulse text-slate-500">Loading questions...</div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {/* Quick Select Header */}
                                                    <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={selectAllQuestions} className="hover:text-purple-400 transition-colors">
                                                                {selectedQuestionIds.length === qbankQuestions.length ? 'Deselect All' : 'Select All'}
                                                            </button>
                                                        </div>
                                                        <div>Question Details</div>
                                                    </div>

                                                    {unassignedQuestions.map(q => (
                                                        <div
                                                            key={q.id}
                                                            onClick={() => toggleQuestionSelection(q.id)}
                                                            className={`group relative flex items-start p-4 rounded-xl border cursor-pointer transition-all ${selectedQuestionIds.includes(q.id)
                                                                ? 'bg-purple-900/10 border-purple-500/50 shadow-sm shadow-purple-500/10'
                                                                : 'bg-[#161922] border-slate-800 hover:border-slate-700 hover:bg-[#1a1d26]'
                                                                }`}
                                                        >
                                                            <div className="mr-4 flex-shrink-0 pt-1">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedQuestionIds.includes(q.id)
                                                                    ? 'bg-purple-600 border-purple-600 text-white'
                                                                    : 'border-slate-600 group-hover:border-purple-400'
                                                                    }`}>
                                                                    {selectedQuestionIds.includes(q.id) && <CheckCircle size={14} />}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                                    <p className={`font-medium ${selectedQuestionIds.includes(q.id) ? 'text-white' : 'text-slate-300'}`}>
                                                                        {q.question}
                                                                    </p>
                                                                    <div className="flex gap-2 flex-shrink-0">
                                                                        <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                                            {q.questionType}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${q.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' :
                                                                            q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                                'bg-green-500/10 text-green-500'
                                                                            }`}>
                                                                            {q.difficulty}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                    {q.subject && <span>Subject: {q.subject}</span>}
                                                                    {q.system && <span>System: {q.system}</span>}
                                                                    {q.topic && <span>Topic: {q.topic}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {unassignedQuestions.length === 0 && (
                                                        <div className="text-center py-12 text-slate-500">
                                                            <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-500" />
                                                            <p className="text-lg font-medium text-white mb-2">All questions assigned</p>
                                                            <p>All questions from this Q-Bank have been added to the course.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface QuestionEditorModalProps {
    onClose: () => void;
    onSave: (question: QuizQuestion) => void;
    initialData?: QuizQuestion;
}

export interface QuizQuestion {
    id?: string;
    type: 'multiple_choice' | 'sata' | 'ordering' | 'true_false';
    question: string;
    options: string[]; // For ordering, this is the shuffled list usually, or we store correct order and shuffle on front
    correctAnswer: string | string[]; // For Ordering, this might be the JSON stringified array of indices in correct order
    explanation?: string;
}

export default function QuestionEditorModal({ onClose, onSave, initialData }: QuestionEditorModalProps) {
    const [questionType, setQuestionType] = useState<'multiple_choice' | 'sata' | 'ordering' | 'true_false'>(
        (initialData?.type as any) === 'mcq' ? 'multiple_choice' : (initialData?.type as any) === 'multiple_select' ? 'sata' : initialData?.type || 'multiple_choice'
    );
    const [questionText, setQuestionText] = useState(initialData?.question || '');
    const [options, setOptions] = useState<string[]>(
        initialData?.options || (questionType === 'true_false' ? ['True', 'False'] : ['', '', '', ''])
    );
    // For ordering: correctAnswer will store the INDICES of the options in the correct order (e.g., "0,1,2,3")
    const [correctAnswer, setCorrectAnswer] = useState<string | string[]>(initialData?.correctAnswer || '');
    const [explanation, setExplanation] = useState(initialData?.explanation || '');

    const handleTypeChange = (newType: 'multiple_choice' | 'sata' | 'ordering' | 'true_false') => {
        setQuestionType(newType);
        if (newType === 'true_false') {
            setOptions(['True', 'False']);
            setCorrectAnswer('0'); // Default to True
        } else {
            // Reset if switching to a complex type
            if (options.length < 2) setOptions(['', '', '', '']);
            setCorrectAnswer(newType === 'sata' ? [] : '');
        }
    };

    const handleAddOption = () => {
        if (questionType !== 'true_false') {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (questionType !== 'true_false' && options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);

            // Logic to clean up correct answer based on type
            if (questionType === 'multiple_choice' || questionType === 'true_false') {
                if (correctAnswer === index.toString()) setCorrectAnswer('');
                else if (Number(correctAnswer) > index) setCorrectAnswer((Number(correctAnswer) - 1).toString());
            } else if (questionType === 'sata') {
                const current = Array.isArray(correctAnswer) ? correctAnswer : [];
                setCorrectAnswer(current.filter(i => i !== index.toString()).map(i => Number(i) > index ? (Number(i) - 1).toString() : i));
            }
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleCorrectAnswerToggle = (index: number) => {
        if (questionType === 'sata') {
            const current = Array.isArray(correctAnswer) ? correctAnswer : [];
            const indexStr = index.toString();
            if (current.includes(indexStr)) {
                setCorrectAnswer(current.filter(i => i !== indexStr));
            } else {
                setCorrectAnswer([...current, indexStr]);
            }
        } else if (questionType === 'multiple_choice' || questionType === 'true_false') {
            setCorrectAnswer(index.toString());
        }
    };

    // For Ordering: Move options up/down to define CORRECT order
    const moveOption = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newOptions = [...options];
            [newOptions[index], newOptions[index - 1]] = [newOptions[index - 1], newOptions[index]];
            setOptions(newOptions);
        } else if (direction === 'down' && index < options.length - 1) {
            const newOptions = [...options];
            [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
            setOptions(newOptions);
        }
    };

    const handleSave = () => {
        // Validation
        if (!questionText.trim()) {
            alert('Please enter a question');
            return;
        }

        if (questionType !== 'true_false') {
            const validOptions = options.filter(opt => opt.trim());
            if (validOptions.length < 2) {
                alert('Please provide at least 2 options');
                return;
            }
        }

        let finalCorrectAnswer = correctAnswer;

        if (questionType === 'sata') {
            if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
                alert('Please select at least one correct answer');
                return;
            }
        } else if (questionType === 'multiple_choice' || questionType === 'true_false') {
            if (correctAnswer === '') {
                alert('Please select the correct answer');
                return;
            }
        } else if (questionType === 'ordering') {
            // For ordering, the current order of options IS the correct order.
            // We will store the options as is, and the "correctAnswer" will be the indices 0,1,2,3...
            // When displaying to student, we will SHUFFLE the options.
            finalCorrectAnswer = options.map((_, i) => i.toString()); // ['0', '1', '2', '3']
        }

        const question: QuizQuestion = {
            id: initialData?.id || Date.now().toString(),
            type: questionType,
            question: questionText.trim(),
            options: options.filter(opt => opt.trim()),
            correctAnswer: finalCorrectAnswer,
            explanation: explanation.trim() || undefined,
        };

        onSave(question);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Edit Question' : 'Add Question'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    {/* Question Type Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Question Type</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleTypeChange('multiple_choice')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${questionType === 'multiple_choice'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                Multiple Choice
                            </button>
                            <button
                                onClick={() => handleTypeChange('sata')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${questionType === 'sata'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                SATA (Multiple Response)
                            </button>
                            <button
                                onClick={() => handleTypeChange('ordering')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${questionType === 'ordering'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                Ordering (Drag & Drop)
                            </button>
                            <button
                                onClick={() => handleTypeChange('true_false')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${questionType === 'true_false'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                True/False
                            </button>
                        </div>
                    </div>

                    {/* Question Text */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Question</label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Enter your question here..."
                            rows={4}
                            className="w-full px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-400">
                                {questionType === 'ordering' ? 'Correct Order (Top to Bottom)' : 'Answer Options'}
                            </label>
                            {questionType === 'ordering' && (
                                <span className="text-xs text-purple-400">Arrange these in the correct order. They will be shuffled for the student.</span>
                            )}
                        </div>

                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 bg-[#1a1d26] border border-slate-800 rounded-lg p-2">
                                        <span className="text-slate-500 font-bold text-sm w-6">
                                            {questionType === 'ordering' ? (index + 1) : String.fromCharCode(65 + index)}
                                        </span>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            disabled={questionType === 'true_false'}
                                            className="flex-1 bg-transparent outline-none text-white placeholder-slate-500 disabled:opacity-50"
                                        />

                                        {/* Result/Selection Indicators */}
                                        {questionType !== 'ordering' && (
                                            <input
                                                type={questionType === 'sata' ? 'checkbox' : 'radio'}
                                                name="correctAnswer"
                                                checked={
                                                    questionType === 'sata'
                                                        ? Array.isArray(correctAnswer) && correctAnswer.includes(index.toString())
                                                        : correctAnswer === index.toString()
                                                }
                                                onChange={() => handleCorrectAnswerToggle(index)}
                                                className="accent-green-500 w-4 h-4 cursor-pointer"
                                                title="Mark as correct"
                                            />
                                        )}
                                    </div>

                                    {/* Ordering Controls */}
                                    {questionType === 'ordering' && (
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => moveOption(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30"
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => moveOption(index, 'down')}
                                                disabled={index === options.length - 1}
                                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {questionType !== 'true_false' && options.length > 2 && (
                                        <button
                                            onClick={() => handleRemoveOption(index)}
                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                            title="Remove option"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {questionType !== 'true_false' && (
                            <button
                                onClick={handleAddOption}
                                className="mt-2 text-sm text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                            >
                                <Plus size={16} /> Add Option
                            </button>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                            {questionType === 'sata'
                                ? 'Check all correct answers'
                                : questionType === 'ordering'
                                    ? 'Add options and use arrows to set the CORRECT sequence'
                                    : 'Select the correct answer'}
                        </p>
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">
                            Explanation (Optional)
                        </label>
                        <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Explain why this is the correct answer..."
                            rows={3}
                            className="w-full px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                        />
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
                        {initialData ? 'Update Question' : 'Add Question'}
                    </button>
                </div>
            </div>
        </div>
    );
}

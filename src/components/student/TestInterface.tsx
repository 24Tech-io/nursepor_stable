'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';

interface Question {
    id: number;
    question: string;
    questionType: string; // 'multiple_choice', 'sata', 'ordering', 'true_false', 'bowtie', 'casestudy'
    options: any; // Can be array or object (BowTie/CaseStudy)
    correctAnswer: any;
    explanation: string;
    difficulty: string;
    subject: string;
}

interface TestInterfaceProps {
    qbankId: number;
    attemptId: number;
    initialData: {
        attempt: {
            mode: 'tutorial' | 'timed' | 'assessment';
            timeLimit: number | null;
            questionsData?: string;
            isCompleted: boolean;
            score?: number;
        };
        questions: Question[];
    };
}

export default function TestInterface({ qbankId, attemptId, initialData }: TestInterfaceProps) {
    const router = useRouter();
    const { attempt, questions } = initialData;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [caseStudyStep, setCaseStudyStep] = useState(1);
    const [trendActiveTab, setTrendActiveTab] = useState('vitals');

    // Reset Case Study step and Trend tab when question changes
    useEffect(() => {
        setCaseStudyStep(1);
        setTrendActiveTab('vitals');
    }, [currentIndex]);
    // Answers: Record<QuestionId, Value>
    // Value: string (MCQ), string[] (SATA, Ordering)
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());
    const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
    const [results, setResults] = useState<Record<number, any>>({}); // { isCorrect, correctAnswer, explanation }

    // Tools
    const [showCalculator, setShowCalculator] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [timeLeft, setTimeLeft] = useState<number | null>(
        attempt.timeLimit ? attempt.timeLimit * 60 : null
    );
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Load saved notes
    useEffect(() => {
        const saved = localStorage.getItem(`notes_${attemptId}`);
        if (saved) setNotes(saved);
    }, [attemptId]);

    useEffect(() => {
        if (notes) localStorage.setItem(`notes_${attemptId}`, notes);
    }, [notes, attemptId]);

    // Timer
    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !attempt.isCompleted) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 1) {
                        finishTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, attempt.isCompleted]);

    const currentQuestion = questions[currentIndex];

    // MEMOIZED COMPUTATIONS (Moved to top level to avoid Hook violations)
    const caseStudyDescriptionHtml = useMemo(() => {
        const isCaseStudy = currentQuestion.questionType === 'casestudy' || currentQuestion.questionType === 'ngn_case_study';
        if (!isCaseStudy) return '';
        const opts = currentQuestion.options as any;
        // Sanitize only on client to avoid server-side canvas dependencies
        if (typeof window === 'undefined') return '';
        return DOMPurify.sanitize(opts.description || '');
    }, [currentQuestion]);

    const highlightTextParts = useMemo(() => {
        const isHighlight = currentQuestion.questionType === 'highlight' || currentQuestion.questionType === 'highlight_text';
        if (!isHighlight) return [];

        const highlightData = currentQuestion.options as any;
        const rawText = highlightData.text || "";
        const regex = /\[(.*?)\]|\{(.*?)\}/g;
        const parsedParts = [];
        let lastIndex = 0;
        let match;
        let tokenId = 0;

        while ((match = regex.exec(rawText)) !== null) {
            if (match.index > lastIndex) {
                parsedParts.push({ type: 'text', content: rawText.substring(lastIndex, match.index) });
            }
            if (match[1]) { // [correct]
                parsedParts.push({ type: 'token', content: match[1], id: tokenId++, isTarget: true });
            } else if (match[2]) { // {distractor}
                parsedParts.push({ type: 'token', content: match[2], id: tokenId++, isTarget: false });
            }
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < rawText.length) {
            parsedParts.push({ type: 'text', content: rawText.substring(lastIndex) });
        }
        return parsedParts;
    }, [currentQuestion]);

    // Initialize logic for Ordering questions default state
    useEffect(() => {
        if (currentQuestion && currentQuestion.questionType === 'ordering' && !answers[currentQuestion.id]) {
            // Default to current option order (which should be shuffled by backend)
            setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: currentQuestion.options.map(o => o.id)
            }));
        }
    }, [currentIndex, currentQuestion, answers]);

    const handleAnswer = (value: any) => {
        if (submittedQuestions.has(currentQuestion.id)) return;

        if (currentQuestion.questionType === 'sata') {
            const current = (answers[currentQuestion.id] as string[]) || [];
            // Toggle
            if (current.includes(value)) {
                setAnswers(prev => ({ ...prev, [currentQuestion.id]: current.filter(v => v !== value) }));
            } else {
                setAnswers(prev => ({ ...prev, [currentQuestion.id]: [...current, value] }));
            }
        } else if (currentQuestion.questionType === 'ordering') {
            // Value is the new full array of IDs
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
        } else {
            // MCQ / TrueFalse
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
        }
    };

    const submitAnswer = async () => {
        try {
            setSubmitting(true);
            const res = await fetch(`/api/student/qbanks/${qbankId}/test/submit-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId,
                    questionId: currentQuestion.id,
                    answer: answers[currentQuestion.id]
                })
            });

            if (!res.ok) throw new Error('Failed to submit');

            const data = await res.json();
            setResults(prev => ({
                ...prev,
                [currentQuestion.id]: {
                    isCorrect: data.isCorrect,
                    correctAnswer: data.correctAnswer,
                    explanation: data.explanation || currentQuestion.explanation,
                }
            }));
            setSubmittedQuestions(prev => new Set(prev).add(currentQuestion.id));

        } catch (e) {
            console.error(e);
            alert('Failed to submit answer');
        } finally {
            setSubmitting(false);
        }
    };

    const finishTest = async () => {
        try {
            setSubmitting(true);
            const res = await fetch(`/api/student/qbanks/${qbankId}/test/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId: attemptId,
                    answers: answers,
                    timeSpent: attempt.timeLimit ? (attempt.timeLimit * 60 - (timeLeft || 0)) : 0
                })
            });
            await res.json();
            router.push(`/student/qbanks/${qbankId}/test/results?attemptId=${attemptId}`);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleMark = () => {
        setMarkedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentQuestion.id)) newSet.delete(currentQuestion.id);
            else newSet.add(currentQuestion.id);
            return newSet;
        });
    };

    const getStatusColor = (qId: number) => {
        if (currentQuestion.id === qId) return 'bg-blue-600 text-white border-blue-400';
        if (results[qId]?.isCorrect) return 'bg-green-500/20 text-green-400 border-green-500/30';
        if (results[qId]?.isCorrect === false) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (markedQuestions.has(qId)) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

        const ans = answers[qId];
        const hasAnswer = Array.isArray(ans) ? ans.length > 0 : !!ans;
        if (hasAnswer) return 'bg-slate-700 text-white border-slate-600';

        return 'bg-white/5 text-nurse-silver-500 border-transparent';
    };

    // --- Renderers ---

    // MCQ & True/False
    const renderMCQ = () => (
        <div className="space-y-3">
            {currentQuestion.options.map((opt) => {
                const isSubmitted = submittedQuestions.has(currentQuestion.id);
                const result = results[currentQuestion.id];
                const isSelected = answers[currentQuestion.id] === opt.id;

                // Compare loose string to handle '0' vs 0
                const isCorrect = result?.isCorrect && String(result.correctAnswer) === String(opt.id);
                const isWrongSelection = isSubmitted && isSelected && !isCorrect;

                const shouldHighlightCorrect = isSubmitted && String(result?.correctAnswer) === String(opt.id);

                return (
                    <button
                        key={opt.id}
                        onClick={() => !isSubmitted && handleAnswer(opt.id)}
                        disabled={isSubmitted}
                        className={`
                            w-full p-4 rounded-lg border flex gap-4 transition-all text-left
                            ${isSubmitted
                                ? shouldHighlightCorrect
                                    ? 'bg-green-500/10 border-green-500/50'
                                    : isWrongSelection
                                        ? 'bg-red-500/10 border-red-500/50'
                                        : 'opacity-50 border-transparent'
                                : isSelected
                                    ? 'bg-blue-600/20 border-blue-500'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }
                        `}
                    >
                        <div className={`
                            w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5
                            ${isSubmitted
                                ? shouldHighlightCorrect
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : isWrongSelection
                                        ? 'bg-red-500 border-red-500 text-white'
                                        : 'border-white/20'
                                : isSelected
                                    ? 'bg-blue-500 border-blue-500 text-white'
                                    : 'border-white/30'
                            }
                        `}>
                            {isSubmitted && shouldHighlightCorrect && '✓'}
                            {isSubmitted && isWrongSelection && '✕'}
                        </div>
                        <span className={isSubmitted && !shouldHighlightCorrect && !isWrongSelection ? 'text-nurse-silver-500' : 'text-nurse-silver-100'}>
                            {opt.text}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    // SATA (Multiple Select)
    const renderSATA = () => (
        <div className="space-y-3">
            <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">Select All That Apply</div>
            {currentQuestion.options.map((opt: any, idx: number) => {
                const isSubmitted = submittedQuestions.has(currentQuestion.id);
                const result = results[currentQuestion.id];
                const selected = (answers[currentQuestion.id] as any[]) || [];
                const val = typeof opt === 'object' ? opt.id : idx; // Fallback to index if string
                const text = typeof opt === 'object' ? opt.text : opt;

                const isSelected = selected.includes(val);

                // Validation logic for objects primarily, string fallback might be tricky for 'correctAnswer' matching if it stores IDs.
                // Assuming backend stores matching IDs/indices.

                const correctArr = result ? (Array.isArray(result.correctAnswer) ? result.correctAnswer : [result.correctAnswer]) : [];
                const isOneOfCorrect = correctArr.map(String).includes(String(val));

                const shouldHighlightCorrect = isSubmitted && isOneOfCorrect;
                const isWrongSelection = isSubmitted && isSelected && !isOneOfCorrect;
                const isMissingSelection = isSubmitted && !isSelected && isOneOfCorrect;

                return (
                    <button
                        key={idx}
                        onClick={() => {
                            if (isSubmitted) return;
                            if (selected.includes(val)) {
                                handleAnswer(selected.filter(v => v !== val));
                            } else {
                                handleAnswer([...selected, val]);
                            }
                        }}
                        disabled={isSubmitted}
                        className={`
                            w-full p-4 rounded-lg border flex gap-4 transition-all text-left
                            ${isSubmitted
                                ? (shouldHighlightCorrect || isMissingSelection)
                                    ? 'bg-green-500/10 border-green-500/50'
                                    : isWrongSelection
                                        ? 'bg-red-500/10 border-red-500/50'
                                        : 'opacity-50 border-transparent'
                                : isSelected
                                    ? 'bg-purple-600/20 border-purple-500'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }
                        `}
                    >
                        <div className={`
                            w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
                            ${isSubmitted
                                ? (shouldHighlightCorrect || isMissingSelection)
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : isWrongSelection
                                        ? 'bg-red-500 border-red-500 text-white'
                                        : 'border-white/20'
                                : isSelected
                                    ? 'bg-purple-500 border-purple-500 text-white'
                                    : 'border-slate-500 text-transparent'
                            }
                         `}>
                            ✓
                        </div>
                        <span className={isSubmitted && !shouldHighlightCorrect && !isWrongSelection && !isMissingSelection ? 'text-nurse-silver-500' : 'text-nurse-silver-100'}>
                            {text}
                            {isMissingSelection && <span className="text-green-400 text-xs ml-2">(Correct Answer)</span>}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    // SELECT N RENDERER
    const renderSelectN = () => {
        const snData = currentQuestion.options as any;
        // Handles both object wrapper {selectNCount, options} and direct array fallback
        const opts = (snData && !Array.isArray(snData) && snData.options) ? snData.options : (Array.isArray(snData) ? snData : []);
        const limit = (snData && !Array.isArray(snData) && snData.selectNCount) ? snData.selectNCount : 3;

        const currentSelection = (answers[currentQuestion.id] as any[]) || [];
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        const handleSelect = (val: any) => {
            if (isSubmitted) return;
            if (currentSelection.includes(val)) {
                handleAnswer(currentSelection.filter((v: any) => v !== val));
            } else {
                if (currentSelection.length < limit) {
                    handleAnswer([...currentSelection, val]);
                }
            }
        };

        return (
            <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300 font-bold">
                        Select {limit} options.
                    </p>
                </div>
                <div className="space-y-3">
                    {opts.map((opt: any, idx: number) => {
                        const val = typeof opt === 'object' ? opt.id : idx;
                        const text = typeof opt === 'object' ? opt.text : opt;
                        const isSelected = currentSelection.includes(val);

                        const correctArr = result ? (Array.isArray(result.correctAnswer) ? result.correctAnswer : [result.correctAnswer]) : [];
                        const isOneOfCorrect = correctArr.map(String).includes(String(val));

                        const shouldHighlightCorrect = isSubmitted && isOneOfCorrect;
                        const isWrongSelection = isSubmitted && isSelected && !isOneOfCorrect;
                        const isMissingSelection = isSubmitted && !isSelected && isOneOfCorrect;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelect(val)}
                                disabled={isSubmitted}
                                className={`
                                    w-full p-4 rounded-lg border flex gap-4 transition-all text-left
                                    ${isSubmitted
                                        ? (shouldHighlightCorrect || isMissingSelection)
                                            ? 'bg-green-500/10 border-green-500/50'
                                            : isWrongSelection
                                                ? 'bg-red-500/10 border-red-500/50'
                                                : 'opacity-50 border-transparent'
                                        : isSelected
                                            ? 'bg-blue-600/20 border-blue-500'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                    }
                                `}
                            >
                                <div className={`
                                    w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
                                    ${isSubmitted
                                        ? (shouldHighlightCorrect || isMissingSelection)
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isWrongSelection
                                                ? 'bg-red-500 border-red-500 text-white'
                                                : 'border-white/20'
                                        : isSelected
                                            ? 'bg-blue-500 border-blue-500 text-white'
                                            : 'border-white/30'
                                    }
                                `}>
                                    {isSelected && '✓'}
                                </div>
                                <span className={isSubmitted && !shouldHighlightCorrect && !isWrongSelection && !isMissingSelection ? 'text-nurse-silver-500' : 'text-nurse-silver-100'}>
                                    {text}
                                    {isMissingSelection && <span className="text-green-400 text-xs ml-2">(Correct Answer)</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="text-right text-sm text-slate-500">
                    Selected: {currentSelection.length} / {limit}
                </div>
            </div>
        );
    };

    // Ordering (Ranking)
    const renderOrdering = () => {
        const currentOrder = (answers[currentQuestion.id] as string[]) || currentQuestion.options.map(o => o.id);
        const optionsMap = new Map(currentQuestion.options.map(o => [o.id, o]));
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        const moveItem = (fromIndex: number, toIndex: number) => {
            if (isSubmitted) return;
            const newOrder = [...currentOrder];
            const [moved] = newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, moved);
            handleAnswer(newOrder);
        };

        return (
            <div className="space-y-4">
                <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">Arrange in Correct Sequence</div>
                {currentOrder.map((optId, index) => {
                    const opt = optionsMap.get(optId);
                    if (!opt) return null;
                    return (
                        <div key={optId} className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 flex items-center gap-4 transition-all hover:bg-slate-800">
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (index > 0) moveItem(index, index - 1); }}
                                    disabled={isSubmitted || index === 0}
                                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-700"
                                >
                                    ▲
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (index < currentOrder.length - 1) moveItem(index, index + 1); }}
                                    disabled={isSubmitted || index === currentOrder.length - 1}
                                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-700"
                                >
                                    ▼
                                </button>
                            </div>
                            <div className="font-mono text-slate-500 font-bold bg-slate-900 w-8 h-8 flex items-center justify-center rounded border border-slate-700">
                                {index + 1}
                            </div>
                            <span className="flex-1">{opt.text}</span>
                        </div>
                    );
                })}

                {isSubmitted && result && !result.isCorrect && (
                    <div className="mt-6 p-4 bg-green-900/10 border border-green-500/30 rounded-lg">
                        <p className="font-bold text-green-400 mb-3 border-b border-green-500/20 pb-2">Correct Order:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-green-100">
                            {Array.isArray(result.correctAnswer) && result.correctAnswer.map((id: string) => (
                                <li key={id}>{optionsMap.get(id)?.text}</li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        );
    };

    // BOWTIE RENDERER
    const renderBowTie = () => {
        const bowtieData = currentQuestion.options as any;
        // Data format: { assessmentFindings, condition, nursingActions }

        const currentAnswer = (answers[currentQuestion.id] || { findings: [], condition: '', actions: [] }) as any;

        const toggleFinding = (val: string) => {
            if (submittedQuestions.has(currentQuestion.id)) return;
            const current = currentAnswer.findings || [];
            if (current.includes(val)) {
                handleAnswer({ ...currentAnswer, findings: current.filter((f: string) => f !== val) });
            } else if (current.length < 2) {
                handleAnswer({ ...currentAnswer, findings: [...current, val] });
            }
        };

        const setCondition = (val: string) => {
            if (submittedQuestions.has(currentQuestion.id)) return;
            handleAnswer({ ...currentAnswer, condition: val });
        };

        const toggleAction = (val: string) => {
            if (submittedQuestions.has(currentQuestion.id)) return;
            const current = currentAnswer.actions || [];
            if (current.includes(val)) {
                handleAnswer({ ...currentAnswer, actions: current.filter((a: string) => a !== val) });
            } else if (current.length < 2) {
                handleAnswer({ ...currentAnswer, actions: [...current, val] });
            }
        };

        return (
            <div className="space-y-6">
                <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
                    <strong>BowTie:</strong> Select 2 findings (left), 1 potential condition (center), and 2 parameters to monitor (right).
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Findings */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-center text-blue-400">Assessment Findings</h4>
                        <div className="space-y-2">
                            {bowtieData.assessmentFindings?.map((item: string, idx: number) => {
                                const isSelected = currentAnswer.findings?.includes(item);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => toggleFinding(item)}
                                        className={`w-full p-3 rounded-lg border text-sm transition-all ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Center: Condition */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-center text-purple-400">Condition</h4>
                        <div className="flex flex-col items-center justify-center h-full pb-8 space-y-2">
                            {/* If we just have one condition input in builder, usually it's a list of choices. 
                                Assuming 'conditions' would be array of choices. 
                                But builder shows 1 input for 'condition'. 
                                Wait, BowTie usually has options. 
                                If Admin builder only allowed typing ONE condition, how does student select? 
                                Actually, the Admin Builder I saw had "Most Likely Condition (1 choice)" and input box?
                                Ah, BowTie.tsx had: `condition` state. It seems it defined the CORRECT answer, not options.
                                Where are the DISTRACTORS? `BowTie.tsx` has inputs for findings and actions.
                                It seems the current Admin Builder `BowTie.tsx` is INCOMPLETE or I misunderstood it.
                                It lets you TYPE the findings/actions.
                                Usually you need a pool of options.
                                
                                For now, I will render what is in `bowtieData`.
                                If it's just strings, maybe the user clicks them?
                                If the builder defines the 'Correct' ones, where are the 'Wrong' ones?
                                The `BowTie.tsx` I saw is likely defining the CORRECT ANSWER key.
                                It missing Defining Options.
                                
                                I will proceed assuming `bowtieData` contains options. If not, I'll need to fix Admin Builder later.
                                For now, render what we have.
                            */}
                            <div className="w-full space-y-2">
                                {/* If condition is array (options), map them. Else fallback to single string */}
                                {Array.isArray(bowtieData.condition) ? (
                                    bowtieData.condition.map((cond: string, idx: number) => {
                                        const isSelected = currentAnswer.condition === cond;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setCondition(cond)}
                                                className={`w-full p-2 text-xs rounded border transition-all ${isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 hover:bg-slate-800'}`}
                                            >
                                                {cond}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <button
                                        onClick={() => setCondition(bowtieData.condition)}
                                        className={`w-full p-2 text-xs rounded border ${currentAnswer.condition === bowtieData.condition ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700'}`}
                                    >
                                        {bowtieData.condition || 'Condition'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-center text-green-400">Parameters to Monitor</h4>
                        <div className="space-y-2">
                            {bowtieData.nursingActions?.map((item: string, idx: number) => {
                                const isSelected = currentAnswer.actions?.includes(item);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => toggleAction(item)}
                                        className={`w-full p-3 rounded-lg border text-sm transition-all ${isSelected ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // CASE STUDY RENDERER
    const renderCaseStudy = () => {
        const csData = currentQuestion.options as any;
        // { title, description, data, steps: {} }

        const step = csData.steps?.[caseStudyStep] || {};
        const currentAnswer = (answers[currentQuestion.id] || {}) as any;

        // Single selection for each step (assuming MCQ for simplicity now)
        const handleStepAnswer = (val: number) => {
            if (submittedQuestions.has(currentQuestion.id)) return;
            handleAnswer({ ...currentAnswer, [caseStudyStep]: val });
        };

        const isStepSelected = (idx: number) => currentAnswer[caseStudyStep] === idx;

        return (
            <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
                {/* Left Panel: Scenario */}
                <div className="lg:w-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-y-auto custom-scrollbar">
                    <h3 className="text-xl font-bold text-white mb-2">{csData.title}</h3>
                    <div
                        className="prose prose-invert prose-sm text-slate-300"
                        dangerouslySetInnerHTML={{ __html: caseStudyDescriptionHtml }}
                    />
                </div>

                {/* Right Panel: Question Steps */}
                <div className="lg:w-1/2 flex flex-col bg-slate-800/30 border border-slate-800 rounded-xl">
                    {/* Stepper */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-700">
                        <span className="text-sm font-bold text-slate-400">Step {caseStudyStep} of 6</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6].map(s => (
                                <div key={s} className={`w-8 h-1 rounded-full ${s === caseStudyStep ? 'bg-blue-500' : s < caseStudyStep ? 'bg-green-500' : 'bg-slate-700'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="text-lg mb-6">{step.question || 'No question content'}</div>
                        <div className="space-y-3">
                            {step.options?.map((opt: string, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleStepAnswer(idx)}
                                    className={`w-full p-4 rounded-lg border text-left transition-all ${isStepSelected(idx)
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-slate-900 border-slate-700 hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="font-bold mr-3">{String.fromCharCode(65 + idx)}.</span>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-700 flex justify-between">
                        <button
                            onClick={() => setCaseStudyStep(prev => Math.max(1, prev - 1))}
                            disabled={caseStudyStep === 1}
                            className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                            Previous Step
                        </button>
                        <button
                            onClick={() => setCaseStudyStep(prev => Math.min(6, prev + 1))}
                            disabled={caseStudyStep === 6}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-30"
                        >
                            Next Step
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    // DOSAGE CALCULATION RENDERER
    const renderDosageCalculation = () => {
        const dosageData = currentQuestion.options as any; // { unit, correctValue, tolerance, decimalPlaces }
        const currentAnswer = answers[currentQuestion.id] || '';
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        return (
            <div className="space-y-6 max-w-lg">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-300 font-bold">
                        Calculate the dosage. Enter the numerical value only.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        value={currentAnswer}
                        onChange={(e) => !isSubmitted && handleAnswer(e.target.value)}
                        disabled={isSubmitted}
                        placeholder="0"
                        className={`
                            w-48 px-4 py-3 bg-[#11131a] border rounded-lg text-lg font-mono placeholder-slate-600
                            ${isSubmitted
                                ? result?.isCorrect
                                    ? 'border-green-500 bg-green-500/10 text-green-400'
                                    : 'border-red-500 bg-red-500/10 text-red-400'
                                : 'border-slate-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            }
                        `}
                    />
                    <span className="text-xl font-bold text-slate-400">
                        {dosageData.unit}
                    </span>
                </div>

                {isSubmitted && !result?.isCorrect && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-300">
                            <strong>Correct Answer:</strong> {result?.correctAnswer} {dosageData.unit}
                            {dosageData.tolerance > 0 && ` (±${dosageData.tolerance})`}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // HIGHLIGHT TEXT RENDERER
    const renderHighlightText = () => {
        const highlightData = currentQuestion.options as any; // { text: "Raw text with [markers]" }
        const rawText = highlightData.text || "";

        // Parse text to identify tokens (same as Admin logic, ideally shared)
        // We need to reconstruct the "parts" on the fly or it should have been passed. 
        // Admin saves raw text. Let's parse it here.
        // Parse text to identify tokens (memoized to prevent re-parsing on every render)
        // Use top-level memoized parts
        const parts = highlightTextParts;

        const currentSelection = (answers[currentQuestion.id] as number[]) || [];
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        // If submitted, result.correctAnswer should be array of correct INDICES.
        // We can check if each token ID is in result.correctAnswer.

        const toggleToken = (id: number) => {
            if (isSubmitted) return;
            if (currentSelection.includes(id)) {
                handleAnswer(currentSelection.filter(i => i !== id));
            } else {
                handleAnswer([...currentSelection, id]);
            }
        };

        return (
            <div className="space-y-6">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-sm text-purple-300 font-bold">
                        Click on the relevant text to highlight it. Deselect by clicking again.
                    </p>
                </div>

                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl leading-loose text-lg font-serif">
                    {parts.map((part, idx) => {
                        if (part.type === 'text') return <span key={idx}>{part.content}</span>;

                        const isSelected = currentSelection.includes(part.id!);
                        const isCorrectToken = result?.correctAnswer?.includes(part.id); // From backend validation
                        // Note: We don't have 'isTarget' info from backend unless we expose it.
                        // But if we trust `results`, we use that.

                        // Style logic:
                        // Default: Hover effect.
                        // Selected: Highlighted Blue.
                        // Submitted & Correct: Green.
                        // Submitted & Wrong Selection: Red.
                        // Submitted & Missed Correct: Green Outline?

                        let className = "mx-1 px-1.5 py-0.5 rounded cursor-pointer transition-all select-none border border-transparent ";
                        if (isSubmitted) {
                            if (isSelected) {
                                if (isCorrectToken) className += "bg-green-500/30 border-green-500 text-green-200";
                                else className += "bg-red-500/30 border-red-500 text-red-200 line-through decoration-red-500";
                            } else {
                                if (isCorrectToken) className += "bg-green-500/10 border-green-500/50 border-dashed text-green-200"; // Missed
                                else className += "bg-transparent"; // Unselected Distractor (Correctly ignored)
                            }
                        } else {
                            if (isSelected) className += "bg-blue-600/50 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]";
                            else className += "hover:bg-blue-600/20 hover:border-blue-500/30 border-dashed border-white/20";
                        }

                        return (
                            <span
                                key={idx}
                                onClick={() => part.type === 'token' && toggleToken(part.id!)}
                                className={className}
                            >
                                {part.content}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };


    // EXTENDED DRAG & DROP RENDERER
    const renderExtendedDragDrop = () => {
        const ddData = currentQuestion.options as any; // { items: [], categories: [], correctMapping: {} }
        const currentAnswer = (answers[currentQuestion.id] || {}) as Record<string, number>; // { itemIndex: categoryIndex }
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        // Group items by their current category
        const unassignedItems = ddData.items.map((item: string, idx: number) => ({ text: item, id: idx }))
            .filter((_: any, idx: number) => currentAnswer[idx] === undefined);

        const assignedItems = (catIdx: number) => ddData.items.map((item: string, idx: number) => ({ text: item, id: idx }))
            .filter((_: any, idx: number) => currentAnswer[idx] === catIdx);

        const handleDrop = (itemId: number, catIdx: number | null) => {
            if (isSubmitted) return;
            const newAns = { ...currentAnswer };
            if (catIdx === null) delete newAns[itemId];
            else newAns[itemId] = catIdx;
            handleAnswer(newAns);
        };

        return (
            <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300 font-bold">
                        Drag items to the correct category.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Source Items */}
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl min-h-[300px]">
                        <h4 className="font-bold text-slate-400 mb-4 uppercase text-xs tracking-wider">Available Options</h4>
                        <div className="space-y-2">
                            {unassignedItems.map((item: any) => (
                                <div key={item.id} className="p-3 bg-slate-800 border border-slate-600 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-700 transition-colors flex justify-between items-center group">
                                    <span>{item.text}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {ddData.categories.map((_: any, cIdx: number) => (
                                            <button
                                                key={cIdx}
                                                onClick={() => handleDrop(item.id, cIdx)}
                                                className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500"
                                                disabled={isSubmitted}
                                            >
                                                Example {cIdx + 1} -&gt;
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Drop Zones */}
                    <div className="space-y-4">
                        {ddData.categories.map((cat: string, catIdx: number) => (
                            <div key={catIdx} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl min-h-[150px]">
                                <h4 className="font-bold text-slate-300 mb-2">{cat}</h4>
                                <div className="space-y-2 min-h-[100px] border-2 border-dashed border-slate-700/50 rounded-lg p-2">
                                    {assignedItems(catIdx).map((item: any) => {
                                        const isCorrect = result?.correctAnswer?.[item.id] === catIdx;
                                        return (
                                            <div key={item.id} className={`p-3 rounded-lg border flex justify-between items-center 
                                                ${isSubmitted
                                                    ? isCorrect
                                                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                        : 'bg-red-500/20 border-red-500/50 text-red-300'
                                                    : 'bg-slate-700 border-slate-600'
                                                }`}>
                                                <span>{item.text}</span>
                                                {!isSubmitted && (
                                                    <button onClick={() => handleDrop(item.id, null)} className="text-slate-400 hover:text-white">✕</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* Simple accessible "Move Here" buttons for items currently in unassigned */}
                                    {!isSubmitted && unassignedItems.map((item: any) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleDrop(item.id, catIdx)}
                                            className="w-full py-1 text-xs text-slate-500 border border-dashed border-slate-600 rounded hover:bg-slate-700 hover:text-white"
                                        >
                                            + Add "{item.text}" here
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // CLOZE DROPDOWN RENDERER
    const renderClozeDropdown = () => {
        const clozeData = currentQuestion.options as any; // { text: "...", dropdowns: [{ options: [], correct: 0 }] }
        const segments = clozeData.text.split('[DROPDOWN]');
        const dropdowns = clozeData.dropdowns || [];
        const currentAnswer = (answers[currentQuestion.id] || {}) as Record<number, number>;
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        return (
            <div className="space-y-6">
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <p className="text-sm text-indigo-300 font-bold">
                        Select the correct option from each drop-down to complete the sentence.
                    </p>
                </div>

                <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl leading-loose text-lg font-serif">
                    {segments.map((seg: string, i: number) => {
                        const dd = dropdowns[i];
                        return (
                            <span key={i}>
                                {seg}
                                {dd && (
                                    <span className="inline-block mx-2 align-middle">
                                        <select
                                            value={currentAnswer[i] !== undefined ? currentAnswer[i] : ""}
                                            onChange={(e) => !isSubmitted && handleAnswer({ ...currentAnswer, [i]: parseInt(e.target.value) })}
                                            disabled={isSubmitted}
                                            className={`
                                                appearance-none px-4 py-1.5 pr-8 rounded border text-base font-sans cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
                                                ${isSubmitted
                                                    ? result?.correctAnswer?.[i]?.correct === currentAnswer[i]
                                                        ? 'bg-green-500/20 border-green-500 text-green-300'
                                                        : 'bg-red-500/20 border-red-500 text-red-300'
                                                    : 'bg-slate-800 border-slate-600 text-white hover:border-slate-500'
                                                }
                                            `}
                                        >
                                            <option value="" disabled>Select...</option>
                                            {dd.options.map((opt: string, optIdx: number) => (
                                                <option key={optIdx} value={optIdx} className="bg-slate-900 text-white">
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </span>
                                )}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    // MATRIX MULTIPLE RESPONSE RENDERER
    const renderMatrixMultipleResponse = () => {
        const matrixData = currentQuestion.options as any;
        const currentAnswer = (answers[currentQuestion.id] || {}) as Record<string, boolean>;
        const isSubmitted = submittedQuestions.has(currentQuestion.id);
        const result = results[currentQuestion.id];

        const toggleCell = (rIdx: number, cIdx: number) => {
            if (isSubmitted) return;
            const key = `${rIdx}-${cIdx}`;
            const newAns = { ...currentAnswer };
            if (newAns[key]) delete newAns[key];
            else newAns[key] = true;
            handleAnswer(newAns);
        };

        return (
            <div className="space-y-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 border-b border-slate-700 bg-slate-800/50 min-w-[200px]"></th>
                            {matrixData.columns.map((col: string, i: number) => (
                                <th key={i} className="p-4 border-b border-slate-700 bg-slate-800/50 text-center font-bold text-slate-300">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrixData.rows.map((row: string, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4 border-b border-slate-800 font-medium text-slate-200">{row}</td>
                                {matrixData.columns.map((_: any, cIdx: number) => {
                                    const key = `${rIdx}-${cIdx}`;
                                    const isSelected = currentAnswer[key];
                                    const isCorrect = result?.correctAnswer?.[key];

                                    let cellClass = "w-6 h-6 rounded border flex items-center justify-center transition-all ";
                                    if (isSubmitted) {
                                        if (isCorrect) cellClass += "bg-green-500 border-green-500 text-white";
                                        else if (isSelected && !isCorrect) cellClass += "bg-red-500 border-red-500 text-white";
                                        else if (!isSelected && isCorrect) cellClass += "border-green-500 border-dashed opacity-50";
                                        else cellClass += "border-slate-600 bg-slate-800/50";
                                    } else {
                                        if (isSelected) cellClass += "bg-blue-600 border-blue-500 text-white";
                                        else cellClass += "border-slate-500 bg-slate-800 hover:border-blue-400";
                                    }

                                    return (
                                        <td key={cIdx} className="p-4 border-b border-slate-800 text-center">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => toggleCell(rIdx, cIdx)}
                                                    disabled={isSubmitted}
                                                    className={cellClass}
                                                >
                                                    {isSelected && '✓'}
                                                </button>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // TREND ITEM RENDERER
    const renderTrendItem = () => {
        const trendData = currentQuestion.options as any;
        // Use top-level state instead of nested hook
        const activeTab = trendActiveTab;
        const setActiveTab = setTrendActiveTab;

        const tabs = [
            { id: 'vitals', label: 'Vitals' },
            { id: 'notes', label: 'Nure Notes' },
            { id: 'labs', label: 'Labs' },
            { id: 'intakeOutput', label: 'In/Out' },
            { id: 'mar', label: 'MAR' },
            { id: 'imaging', label: 'Imaging' },
        ];

        const renderTabContent = (key: string) => {
            const data = trendData.trendTabs?.[key];
            if (!data) return <div className="text-slate-500 italic">No data available</div>;

            if (Array.isArray(data) && data.length > 0) {
                const headers = Object.keys(data[0]);
                return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                                <tr>
                                    {headers.map(h => <th key={h} className="px-4 py-2">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-800">
                                        {headers.map(h => <td key={h} className="px-4 py-2">{typeof row[h] === 'object' ? JSON.stringify(row[h]) : row[h]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            return <pre className="whitespace-pre-wrap font-mono text-sm">{JSON.stringify(data, null, 2)}</pre>;
        };

        return (
            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="flex border-b border-slate-800 overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 h-64 overflow-y-auto custom-scrollbar bg-black/20">
                        {renderTabContent(activeTab)}
                    </div>
                </div>

                <div className="p-4 bg-slate-800/30 rounded-lg">
                    <h4 className="font-bold text-white mb-4">{trendData.question || "Review the data above and answer the question."}</h4>
                    {trendData.options && Array.isArray(trendData.options) ? (
                        <div className="space-y-2">
                            {trendData.options.map((opt: any, idx: number) => {
                                const val = typeof opt === 'string' ? opt : opt.id || idx;
                                const label = typeof opt === 'string' ? opt : opt.text;
                                const isSelected = answers[currentQuestion.id] === val;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => !submittedQuestions.has(currentQuestion.id) && handleAnswer(val)}
                                        className={`w-full text-left p-3 rounded border ${isSelected ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-red-400">Error: No answer options defined for this Trend item.</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden text-white font-sans">
            {/* Sidebar (Question Map) */}
            <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-white/10 flex flex-col`}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center whitespace-nowrap overflow-hidden">
                    <h3 className="font-bold text-lg">Question Map</h3>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`aspect-square rounded flex items-center justify-center text-xs font-medium border transition-all hover:scale-105 ${getStatusColor(q.id)}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-white/10 text-xs text-nurse-silver-500 space-y-2 whitespace-nowrap overflow-hidden">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"></div> Current</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div> Correct</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded"></div> Incorrect</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500/30 rounded"></div> Marked</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded">☰</button>
                        )}
                        <div className="font-mono text-xl font-bold tracking-wider">
                            {timeLeft !== null ?
                                `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
                                : 'Unlimited'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowCalculator(!showCalculator)} className={`p-2 rounded flex items-center gap-2 text-sm ${showCalculator ? 'bg-blue-600 text-white' : 'text-nurse-silver-300 hover:bg-white/10'}`}>🧮 Calc</button>
                        <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded flex items-center gap-2 text-sm ${showNotes ? 'bg-yellow-600 text-white' : 'text-nurse-silver-300 hover:bg-white/10'}`}>📝 Notes</button>
                        <button onClick={finishTest} className="ml-4 px-4 py-1.5 bg-nurse-red-600 hover:bg-nurse-red-700 text-white rounded text-sm font-bold shadow-glow-red">Finish Test</button>
                    </div>
                </div>

                {/* Question Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    {/* Calculator Overlay */}
                    {showCalculator && (
                        <div className="absolute top-4 right-4 z-50 bg-slate-800 border border-white/20 rounded shadow-2xl w-64 p-4">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-sm">Calculator</span>
                                <button onClick={() => setShowCalculator(false)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                            <input type="text" className="w-full bg-black/30 border border-white/10 rounded p-2 text-right mb-2 font-mono" placeholder="0" />
                            <div className="grid grid-cols-4 gap-1">
                                {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'].map(key => (
                                    <button key={key} className="bg-white/5 hover:bg-white/10 p-2 rounded text-sm">{key}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes Overlay */}
                    {showNotes && (
                        <div className="absolute top-4 right-20 z-50 bg-yellow-100 text-slate-900 border border-yellow-300 rounded shadow-2xl w-80 h-96 flex flex-col">
                            <div className="flex justify-between p-2 border-b border-yellow-200 bg-yellow-200/50">
                                <span className="font-bold text-sm">Notes</span>
                                <button onClick={() => setShowNotes(false)} className="text-slate-500 hover:text-black">✕</button>
                            </div>
                            <textarea
                                className="flex-1 bg-transparent p-4 resize-none focus:outline-none text-sm font-handwriting"
                                placeholder="Type your notes here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto pb-20">
                        {/* Question Metadata */}
                        <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-wider text-nurse-silver-500">
                            <span className="font-bold text-white">Question {currentIndex + 1} of {questions.length}</span>
                            <span>•</span>
                            <span className="text-nurse-silver-300">{currentQuestion.subject}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded ${currentQuestion.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-green-500/20 text-green-400'
                                }`}>
                                {currentQuestion.difficulty}
                            </span>
                        </div>

                        {/* Question Text */}
                        <div
                            className="text-xl md:text-2xl font-serif leading-relaxed mb-8"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQuestion.question) }}
                        />

                        {/* Rendering Switch */}


                        {currentQuestion.questionType === 'bowtie' ? renderBowTie() :
                            (currentQuestion.questionType === 'casestudy' || currentQuestion.questionType === 'ngn_case_study') ? renderCaseStudy() :
                                currentQuestion.questionType === 'sata' ? renderSATA() :
                                    currentQuestion.questionType === 'select_n' ? renderSelectN() :
                                        (currentQuestion.questionType === 'ordering' || currentQuestion.questionType === 'ranking') ? renderOrdering() :
                                            currentQuestion.questionType === 'dosage_calculation' ? renderDosageCalculation() :
                                                currentQuestion.questionType === 'highlight_text' ? renderHighlightText() :
                                                    currentQuestion.questionType === 'extended_drag_drop' ? renderExtendedDragDrop() :
                                                        currentQuestion.questionType === 'cloze_dropdown' ? renderClozeDropdown() :
                                                            currentQuestion.questionType === 'matrix_multiple_response' ? renderMatrixMultipleResponse() :
                                                                currentQuestion.questionType === 'trend_item' ? renderTrendItem() :
                                                                    renderMCQ()}

                        {/* Explanation */}
                        {attempt.mode === 'tutorial' && submittedQuestions.has(currentQuestion.id) && results[currentQuestion.id] && (
                            <div className="mt-8 animate-fade-in-up">
                                <div className="p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                                    <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Explanation
                                    </h3>
                                    <div className="prose prose-invert max-w-none text-nurse-silver-200">
                                        {results[currentQuestion.id].explanation}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="h-20 bg-slate-900 border-t border-white/10 flex items-center justify-between px-4 md:px-8">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                            className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={toggleMark}
                            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${markedQuestions.has(currentQuestion.id) ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-white/10 hover:bg-white/5 text-nurse-silver-400'}`}
                        >
                            {markedQuestions.has(currentQuestion.id) ? '★ Marked' : '☆ Mark'}
                        </button>
                    </div>

                    <div className="flex gap-4">
                        {attempt.mode === 'tutorial' && !submittedQuestions.has(currentQuestion.id) && (
                            <button
                                onClick={submitAnswer}
                                disabled={submitting || !answers[currentQuestion.id] || (Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].length === 0)}
                                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
                            >
                                Submit
                            </button>
                        )}
                        {currentIndex < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIndex(prev => prev + 1)}
                                className="px-8 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg"
                            >
                                Next
                            </button>
                        ) : (
                            // Last Question - Show Finish if not yet finished? 
                            // Or just show nothing and let them use Finish Test button in header
                            null
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

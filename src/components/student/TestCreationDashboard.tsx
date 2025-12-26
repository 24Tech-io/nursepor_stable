'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiSelect from '@/components/common/MultiSelect';

interface FilterData {
    subjects: string[];
    systems: string[];
    clientNeeds: string[];
    topics: string[];
}

export interface TestConfig {
    mode: 'tutorial' | 'timed' | 'assessment';
    questionCount: number;
    questionStatus: 'all' | 'unused' | 'incorrect' | 'marked';
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    subjects: string[];
    systems: string[];
    clientNeeds: string[];
    topics: string[];
    timeLimit?: number; // Minutes
}

interface TestCreationDashboardProps {
    qbankId: number;
    onStartTest: (config: TestConfig) => void;
    loading?: boolean;
}

export default function TestCreationDashboard({ qbankId, onStartTest, loading: parentLoading }: TestCreationDashboardProps) {
    const [filters, setFilters] = useState<FilterData>({
        subjects: [],
        systems: [],
        clientNeeds: [],
        topics: []
    });
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [activeTab, setActiveTab] = useState<'subjects' | 'systems' | 'clientNeeds' | 'topics'>('subjects');

    const [config, setConfig] = useState<TestConfig>({
        mode: 'tutorial',
        questionCount: 40,
        questionStatus: 'unused',
        difficulty: 'mixed',
        subjects: [],
        systems: [],
        clientNeeds: [],
        topics: [],
        timeLimit: 60,
    });

    const [totalQuestions, setTotalQuestions] = useState(0);

    useEffect(() => {
        fetchFilters();
        fetchQBankDetails();
    }, [qbankId]);

    const fetchQBankDetails = async () => {
        try {
            const res = await fetch(`/api/student/qbanks/${qbankId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const total = data.qbank.totalQuestions || 0;
                setTotalQuestions(total);
                // Adjust default count if needed
                setConfig(prev => ({
                    ...prev,
                    questionCount: Math.min(prev.questionCount, total > 0 ? (total < 80 ? total : 80) : 40)
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFilters = async () => {
        try {
            const res = await fetch(`/api/student/qbanks/${qbankId}/filters`, {
                credentials: 'include'
            });
            if (res.ok) {
                setFilters(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch filters', err);
        } finally {
            setLoadingFilters(false);
        }
    };

    const handleSelectAllFilters = (type: keyof FilterData) => {
        setConfig(prev => ({
            ...prev,
            [type]: filters[type]
        }));
    };

    const handleDeselectAllFilters = (type: keyof FilterData) => {
        setConfig(prev => ({
            ...prev,
            [type]: []
        }));
    };

    // Calculate max allowed questions
    const maxQuestions = totalQuestions > 0 ? Math.min(totalQuestions, 80) : 40;

    return (
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-slate-800 p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">Create Test</h2>
                <p className="text-nurse-silver-400">Configure your practice session</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-4 bg-slate-900/50 p-6 border-r border-white/10 space-y-8">
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-bold text-nurse-silver-300 uppercase tracking-wider mb-3">Test Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['tutorial', 'timed', 'assessment'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setConfig({ ...config, mode: m })}
                                    className={`px-2 py-3 rounded-lg text-sm font-medium capitalize transition-all border ${config.mode === m
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                        : 'bg-slate-800 border-white/5 text-nurse-silver-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-nurse-silver-500 mt-2">
                            {config.mode === 'tutorial' && "Untimed. Immediate feedback after each question."}
                            {config.mode === 'timed' && "Timed. Feedback at the end."}
                            {config.mode === 'assessment' && "Simulates real exam. No hints."}
                        </p>
                    </div>

                    {/* Question Status */}
                    <div>
                        <label className="block text-sm font-bold text-nurse-silver-300 uppercase tracking-wider mb-3">Question Status</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['all', 'unused', 'incorrect', 'marked'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setConfig({ ...config, questionStatus: s })}
                                    className={`px-3 py-3 rounded-lg text-sm font-medium capitalize transition-all border ${config.questionStatus === s
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                                        : 'bg-slate-800 border-white/5 text-nurse-silver-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Count */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="block text-sm font-bold text-nurse-silver-300 uppercase tracking-wider">
                                Number of Questions
                            </label>
                            <span className="text-xl font-bold text-white">{config.questionCount}</span>
                        </div>

                        <input
                            type="range"
                            min="1"
                            max={maxQuestions}
                            step="1"
                            value={config.questionCount}
                            onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-nurse-red-500"
                        />
                        <div className="flex justify-between text-xs text-nurse-silver-500 mt-1">
                            <span>1</span>
                            <span>{maxQuestions}</span>
                        </div>
                    </div>

                    {/* Timed Limit (if timed) */}
                    {(config.mode === 'timed' || config.mode === 'assessment') && (
                        <div>
                            <label className="block text-sm font-bold text-nurse-silver-300 uppercase tracking-wider mb-3">
                                Time Limit (Minutes)
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="300"
                                value={config.timeLimit}
                                onChange={(e) => setConfig({ ...config, timeLimit: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel: Content Filters */}
                <div className="lg:col-span-8 bg-slate-800/20 p-6 flex flex-col">
                    <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-4 overflow-x-auto">
                        {(['subjects', 'systems', 'clientNeeds', 'topics'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 px-1 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab
                                    ? 'text-white border-b-2 border-nurse-red-500'
                                    : 'text-nurse-silver-500 hover:text-nurse-silver-300'
                                    }`}
                            >
                                {tab === 'clientNeeds' ? 'Client Needs' : tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 h-[400px]">
                        {loadingFilters ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between mb-4">
                                    <span className="text-sm text-nurse-silver-400">Select categories to include in your test.</span>
                                    <div className="flex gap-4 text-sm">
                                        <button onClick={() => handleSelectAllFilters(activeTab)} className="text-blue-400 hover:text-blue-300">Select All</button>
                                        <button onClick={() => handleDeselectAllFilters(activeTab)} className="text-nurse-silver-500 hover:text-white">Clear</button>
                                    </div>
                                </div>

                                {filters[activeTab] && filters[activeTab].length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filters[activeTab].map((item) => (
                                            <label
                                                key={item}
                                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                                    // @ts-ignore
                                                    config[activeTab].includes(item)
                                                        ? 'bg-blue-600/20 border-blue-500/50'
                                                        : 'bg-slate-800 border-white/5 hover:bg-slate-700'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                                                    // @ts-ignore
                                                    checked={config[activeTab].includes(item)}
                                                    onChange={(e) => {
                                                        const current = config[activeTab] as string[];
                                                        setConfig({
                                                            ...config,
                                                            [activeTab]: e.target.checked
                                                                ? [...current, item]
                                                                : current.filter(i => i !== item)
                                                        });
                                                    }}
                                                />
                                                <span className={`text-sm ${
                                                    // @ts-ignore
                                                    config[activeTab].includes(item) ? 'text-white font-medium' : 'text-nurse-silver-400'
                                                    }`}>
                                                    {item}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-nurse-silver-500 italic">
                                        No {activeTab} available.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                        <button
                            onClick={() => onStartTest(config)}
                            disabled={parentLoading}
                            className="bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white font-bold py-4 px-12 rounded-xl shadow-glow-red transform hover:scale-105 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {parentLoading ? 'Creating Test...' : 'Start Test'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

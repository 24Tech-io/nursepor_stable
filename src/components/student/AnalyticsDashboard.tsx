'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsDashboardProps {
    qbankId: number;
}

export default function AnalyticsDashboard({ qbankId }: AnalyticsDashboardProps) {
    const [overview, setOverview] = useState<any>(null);
    const [categoryPerf, setCategoryPerf] = useState<any[]>([]);
    const [strengths, setStrengths] = useState<any[]>([]);
    const [weaknesses, setWeaknesses] = useState<any[]>([]);
    const [trends, setTrends] = useState<any>(null);
    const [remediation, setRemediation] = useState<any[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [clientNeedsData, setClientNeedsData] = useState<any[]>([]);
    const [systemPerformance, setSystemPerformance] = useState<any[]>([]);
    const [readinessData, setReadinessData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [qbankId]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const [overviewRes, categoryRes, strengthsRes, trendsRes, remediationRes, recRes, clientNeedsRes, systemRes, readinessRes] = await Promise.all([
                fetch(`/api/student/qbanks/${qbankId}/analytics/overview`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/category-performance`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/strengths-weaknesses`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/trends?period=30d`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/remediation`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/recommendations`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/client-needs`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/system-performance`, { credentials: 'include' }),
                fetch(`/api/student/qbanks/${qbankId}/analytics/readiness`, { credentials: 'include' }),
            ]);

            if (overviewRes.ok) setOverview(await overviewRes.json());
            if (categoryRes.ok) setCategoryPerf((await categoryRes.json()).performance || []);
            if (strengthsRes.ok) {
                const data = await strengthsRes.json();
                setStrengths(data.strengths || []);
                setWeaknesses(data.weaknesses || []);
            }
            if (trendsRes.ok) setTrends(await trendsRes.json());
            if (remediationRes.ok) setRemediation((await remediationRes.json()).questions || []);
            if (recRes.ok) setRecommendations((await recRes.json()).recommendations || []);
            if (clientNeedsRes.ok) setClientNeedsData((await clientNeedsRes.json()).clientNeeds || []);
            if (systemRes.ok) setSystemPerformance((await systemRes.json()).systems || []);
            if (readinessRes.ok) setReadinessData(await readinessRes.json());
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getReadinessColor = (score: number) => {
        if (score >= 81) return 'text-green-400 bg-green-500/10 border-green-500/30';
        if (score >= 61) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        if (score >= 51) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        if (score >= 26) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
        return 'text-red-400 bg-red-500/10 border-red-500/30';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Overview Cards */}
            {overview && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className={`rounded-xl border p-6 ${getReadinessColor(overview.readinessScore)}`}>
                        <div className="text-sm font-medium mb-2 opacity-80">Readiness Score</div>
                        <div className="text-4xl font-bold">{overview.readinessScore}</div>
                        <div className="text-sm mt-2 opacity-80 capitalize">{overview.readinessLevel?.replace('_', ' ')}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                        <div className="text-sm font-medium text-nurse-silver-400 mb-2">Overall Accuracy</div>
                        <div className="text-4xl font-bold text-white">
                            {overview.questionsCorrect || 0}/{overview.questionsAttempted || 0}
                        </div>
                        <div className="text-sm mt-2 text-nurse-silver-400">{overview.overallAccuracy || 0}% correct</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                        <div className="text-sm font-medium text-nurse-silver-400 mb-2">Average Score</div>
                        <div className="text-4xl font-bold text-blue-400">
                            {overview.averageScore?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm mt-2 text-nurse-silver-400">High: {overview.highestScore}%</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                        <div className="text-sm font-medium text-nurse-silver-400 mb-2">Tests Completed</div>
                        <div className="text-4xl font-bold text-purple-400">{overview.testsCompleted}</div>
                        <div className="text-sm mt-2 text-nurse-silver-400">{overview.timeSpentHours}h study time</div>
                    </div>
                </div>
            )}

            {/* Subject Performance (ArcherReview-style) */}
            {overview?.subjectBreakdown && overview.subjectBreakdown.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Performance by Subject</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {overview.subjectBreakdown.map((subject: any) => (
                            <div key={subject.subject} className="bg-white/5 rounded-xl border border-white/10 p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-white">{subject.subject}</h3>
                                        {subject.lesson && <p className="text-xs text-nurse-silver-500">{subject.lesson}</p>}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${subject.performanceLevel === 'mastery' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            subject.performanceLevel === 'proficient' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                subject.performanceLevel === 'developing' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                        {subject.performanceLevel || 'weak'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${subject.accuracy >= 80 ? 'bg-green-500' :
                                                    subject.accuracy >= 65 ? 'bg-blue-500' :
                                                        subject.accuracy >= 50 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                }`}
                                            style={{ width: `${subject.accuracy || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-white">{subject.accuracy || 0}%</span>
                                </div>
                                <div className="text-xs text-nurse-silver-500 mt-2">
                                    {subject.questionsCorrect}/{subject.questionsAttempted} correct
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Test History */}
            {overview?.recentTests && overview.recentTests.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Test Results</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-nurse-silver-400 border-b border-white/10">
                                    <th className="pb-3">Date</th>
                                    <th className="pb-3">Mode</th>
                                    <th className="pb-3">Score</th>
                                    <th className="pb-3">Questions</th>
                                    <th className="pb-3">Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.recentTests.map((test: any) => (
                                    <tr key={test.id} className="border-b border-white/5 text-sm">
                                        <td className="py-3 text-nurse-silver-300">
                                            {new Date(test.completedAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 capitalize text-nurse-silver-300">{test.testMode}</td>
                                        <td className={`py-3 font-bold ${test.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                                            {test.score}%
                                        </td>
                                        <td className="py-3 text-nurse-silver-300">
                                            {test.correctCount}/{test.totalQuestions}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${test.isPassed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {test.isPassed ? 'PASSED' : 'FAILED'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {/* Client Needs & System Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Needs */}
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Client Needs Performance</h2>
                    {clientNeedsData.length === 0 ? (
                        <p className="text-nurse-silver-500 text-center py-8">Complete tests to see client needs performance</p>
                    ) : (
                        <div className="space-y-3">
                            {clientNeedsData.map((need: any) => (
                                <div key={need.name} className="flex justify-between items-center">
                                    <span className="text-nurse-silver-300">{need.name}</span>
                                    <span className={`font-semibold ${need.score >= 70 ? 'text-green-400' : need.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {need.score}% ({need.correct}/{need.attempted})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Performance */}
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">System Performance</h2>
                    {systemPerformance.length === 0 ? (
                        <p className="text-nurse-silver-500 text-center py-8">Complete tests to see system performance</p>
                    ) : (
                        <div className="space-y-4">
                            {systemPerformance.map((system: any) => (
                                <div key={system.lesson}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-nurse-silver-300">{system.lesson}</span>
                                        <span className={`font-semibold ${system.accuracyPercentage >= 70 ? 'text-green-400' : system.accuracyPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {system.accuracyPercentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${system.accuracyPercentage >= 70 ? 'bg-green-500' : system.accuracyPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, system.accuracyPercentage)}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-nurse-silver-500 mt-1">
                                        {system.questionsCorrect}/{system.questionsAttempted} correct
                                        {system.averageTimeSeconds && ` • ${Math.round(system.averageTimeSeconds)}s avg`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Readiness Assessment */}
            {readinessData && (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-6">NCLEX Readiness Assessment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div>
                            <div className={`text-5xl font-bold mb-2 ${readinessData.probability >= 80 ? 'text-green-400' : readinessData.probability >= 60 ? 'text-blue-400' : readinessData.probability >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {readinessData.probability}%
                            </div>
                            <div className="text-sm text-nurse-silver-400">Pass Probability</div>
                            <div className={`text-sm font-semibold mt-1 ${readinessData.probability >= 80 ? 'text-green-400' : readinessData.probability >= 60 ? 'text-blue-400' : readinessData.probability >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {readinessData.level}
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white mb-2">{readinessData.averageScore}%</div>
                            <div className="text-sm text-nurse-silver-400">Average Score</div>
                            <div className="text-xs text-nurse-silver-500 mt-1">
                                Based on last {readinessData.testsAnalyzed} test{readinessData.testsAnalyzed !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div>
                            <div className="text-lg text-nurse-silver-300 mb-2">{readinessData.message}</div>
                            {readinessData.recentScores?.length > 0 && (
                                <div className="text-xs text-nurse-silver-500">
                                    Recent: {readinessData.recentScores.map((s: number) => `${s}%`).join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-green-400 mb-4">Strengths (≥70%)</h2>
                    {strengths.length === 0 ? (
                        <p className="text-nurse-silver-500">No strengths identified yet. Keep practicing!</p>
                    ) : (
                        <ul className="space-y-3">
                            {strengths.map((s: any) => (
                                <li key={s.categoryId} className="flex justify-between items-center">
                                    <span className="text-nurse-silver-300">{s.categoryName}</span>
                                    <span className="font-bold text-green-400">{s.accuracyPercentage.toFixed(1)}%</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Weaknesses (&lt;60%)</h2>
                    {weaknesses.length === 0 ? (
                        <p className="text-nurse-silver-500">Great job! No weak areas identified.</p>
                    ) : (
                        <ul className="space-y-3">
                            {weaknesses.map((w: any) => (
                                <li key={w.categoryId} className="flex justify-between items-center">
                                    <span className="text-nurse-silver-300">{w.categoryName}</span>
                                    <span className={`font-bold ${w.priority === 'high' ? 'text-red-400' : 'text-orange-400'}`}>
                                        {w.accuracyPercentage.toFixed(1)}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Performance by Category</h2>
                {categoryPerf.length === 0 ? (
                    <p className="text-nurse-silver-500">No category performance data yet.</p>
                ) : (
                    <div className="space-y-4">
                        {categoryPerf.map((cat: any) => (
                            <div key={cat.categoryId}>
                                <div className="flex justify-between mb-1">
                                    <span className="font-medium text-nurse-silver-300">{cat.categoryName}</span>
                                    <span className="font-bold text-white">{cat.accuracyPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full ${cat.accuracyPercentage >= 70 ? 'bg-green-500' : cat.accuracyPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${cat.accuracyPercentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Study Recommendations */}
            {recommendations.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Study Recommendations</h2>
                    <div className="space-y-4">
                        {recommendations.map((rec: any) => (
                            <div key={rec.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-white">{rec.title}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                        {rec.priority}
                                    </span>
                                </div>
                                <p className="text-nurse-silver-400 mb-3">{rec.description}</p>
                                {rec.actionItems?.length > 0 && (
                                    <ul className="list-disc list-inside text-sm text-nurse-silver-500 space-y-1">
                                        {rec.actionItems.map((item: string, idx: number) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Remediation Center */}
            {remediation.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Questions Needing Review ({remediation.length})</h2>
                    <div className="space-y-3">
                        {remediation.slice(0, 10).map((q: any) => (
                            <div key={q.questionId} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <div className="font-medium text-white mb-1">{q.categoryName}</div>
                                <div className="text-sm text-nurse-silver-400 line-clamp-2">{q.question}</div>
                                <div className="text-xs text-nurse-silver-500 mt-2">
                                    {q.totalAttempts} attempts • Last incorrect: {new Date(q.firstIncorrectAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

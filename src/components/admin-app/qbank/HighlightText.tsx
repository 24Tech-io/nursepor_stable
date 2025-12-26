'use client';

import { useState, useEffect } from 'react';

export default function HighlightText({ question, onChange }: { question: any; onChange: (q: any) => void }) {
    const [text, setText] = useState(question.highlightData?.text || 'Enter text here with [correct] and {incorrect} clickable phrases.');
    const [preview, setPreview] = useState<any[]>([]);

    useEffect(() => {
        updateData(text);
    }, []);

    const parseText = (inputText: string) => {
        // Regex to split by tokens: [text] or {text}
        const regex = /\[(.*?)\]|\{(.*?)\}/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(inputText)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: inputText.substring(lastIndex, match.index) });
            }
            if (match[1]) {
                // [correct]
                parts.push({ type: 'correct', content: match[1] });
            } else if (match[2]) {
                // {incorrect}
                parts.push({ type: 'distractor', content: match[2] });
            }
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < inputText.length) {
            parts.push({ type: 'text', content: inputText.substring(lastIndex) });
        }
        return parts;
    };

    const updateData = (newText: string) => {
        // Extract correct answers for validation
        const parsed = parseText(newText);
        setPreview(parsed);

        // Correct answers are indices of 'correct' tokens if we were flattening? 
        // Or just identifying the content?
        // Let's store the raw text and let the renderer parse it.
        // We also need to extract WHICH indices are correct for the grader.
        // Let's count ONLY clickable items (correct or distractor) to get indices.
        let clickableIndex = 0;
        const correctIndices: number[] = [];

        parsed.forEach(p => {
            if (p.type === 'correct' || p.type === 'distractor') {
                if (p.type === 'correct') correctIndices.push(clickableIndex);
                clickableIndex++;
            }
        });

        const highlightData = {
            text: newText,
            // We don't necessarily need to store parsed here, but we can if we want optimization.
            // Storing raw text is easier for editing.
        };

        onChange({
            ...question,
            highlightData,
            correctAnswer: correctIndices // Array of indices of clickable items that are correct
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-sm text-purple-300">
                    <strong>Highlight Text:</strong> Enter text. Wrap correct answers in <code>[brackets]</code> and distractors in <code>{'{braces}'}</code>.
                    Example: <code>The patient has [hypertension] and {hypotension}.</code>
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Question Text
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            updateData(e.target.value);
                        }}
                        rows={6}
                        className="w-full px-4 py-2.5 bg-[#11131a] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Preview
                    </label>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg leading-loose">
                        {preview.map((part, i) => {
                            if (part.type === 'text') return <span key={i} className="text-slate-400">{part.content}</span>;
                            if (part.type === 'correct') return <span key={i} className="px-1 mx-0.5 bg-green-500/20 text-green-300 rounded border border-green-500/30 cursor-pointer select-none">{part.content}</span>;
                            if (part.type === 'distractor') return <span key={i} className="px-1 mx-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/30 cursor-pointer select-none">{part.content}</span>;
                            return null;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
